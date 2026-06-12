import fs from 'fs';
import { like, eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import { settings } from '../database/schema.js';
import { getThemeById } from './themeRegistry.js';
import type {
  ThemeSettingsSchema,
  ThemeSettingsSection,
  ThemeSettingsField,
  ThemeSettingsExport,
  ThemeSettingsImportResult,
} from './themeTypes.js';

// ───────────────────────────────────────────────
// In-Memory Schema Cache (per themeId)
// ───────────────────────────────────────────────
// - Cache is populated on first loadSchema() call per theme.
// - Invalidated on: settings import, settings reset, explicit invalidate call.
// - NOT loaded during startup or scan (lazy).

const schemaCache = new Map<string, ThemeSettingsSchema>();

export function invalidateSchemaCache(themeId?: string): void {
  if (themeId) {
    schemaCache.delete(themeId);
  } else {
    schemaCache.clear();
  }
}

// ───────────────────────────────────────────────
// Schema Validation
// ───────────────────────────────────────────────

export function validateThemeSettingsSchema(raw: any, themeId: string): ThemeSettingsSchema {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`[${themeId}] settings-schema.json must be a JSON object`);
  }

  if (typeof raw.schemaVersion !== 'number') {
    throw new Error(`[${themeId}] settings-schema.json missing required field: schemaVersion (must be a number)`);
  }

  if (!raw.sections || typeof raw.sections !== 'object' || Array.isArray(raw.sections)) {
    throw new Error(`[${themeId}] settings-schema.json missing required field: sections (must be an object)`);
  }

  for (const [sectionKey, section] of Object.entries(raw.sections)) {
    const sec = section as any;
    if (!sec.label || typeof sec.label !== 'string') {
      throw new Error(`[${themeId}] Section "${sectionKey}" missing required field: label`);
    }
    if (!sec.fields || typeof sec.fields !== 'object' || Array.isArray(sec.fields)) {
      throw new Error(`[${themeId}] Section "${sectionKey}" missing required field: fields (must be an object)`);
    }

    for (const [fieldKey, field] of Object.entries(sec.fields)) {
      const f = field as any;
      if (!f.type || typeof f.type !== 'string') {
        throw new Error(`[${themeId}] Field "${sectionKey}.${fieldKey}" missing required field: type`);
      }
      if (!f.label || typeof f.label !== 'string') {
        throw new Error(`[${themeId}] Field "${sectionKey}.${fieldKey}" missing required field: label`);
      }
      if (f.default === undefined) {
        throw new Error(`[${themeId}] Field "${sectionKey}.${fieldKey}" missing required field: default`);
      }
      if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0)) {
        throw new Error(`[${themeId}] Field "${sectionKey}.${fieldKey}" type=select requires non-empty options array`);
      }
    }
  }

  return raw as ThemeSettingsSchema;
}

// ───────────────────────────────────────────────
// Lazy Schema Loading
// ───────────────────────────────────────────────

export function loadSchema(themeId: string): ThemeSettingsSchema {
  // 1. Check cache
  const cached = schemaCache.get(themeId);
  if (cached) return cached;

  // 2. Get theme from registry
  const theme = getThemeById(themeId);
  if (!theme) {
    throw new Error(`Theme not found: ${themeId}`);
  }

  if (!theme.settingsSchemaPath) {
    throw new Error(`Theme "${themeId}" does not have a settings-schema.json`);
  }

  if (!fs.existsSync(theme.settingsSchemaPath)) {
    throw new Error(`settings-schema.json not found at: ${theme.settingsSchemaPath}`);
  }

  // 3. Read and parse
  const rawContent = fs.readFileSync(theme.settingsSchemaPath, 'utf-8');
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (e: any) {
    throw new Error(`[${themeId}] Failed to parse settings-schema.json: ${e.message}`);
  }

  // 4. Validate
  const schema = validateThemeSettingsSchema(parsed, themeId);

  // 5. Cache
  schemaCache.set(themeId, schema);

  return schema;
}

// ───────────────────────────────────────────────
// Helper: Extract defaults from schema
// ───────────────────────────────────────────────

function getSchemaDefaults(schema: ThemeSettingsSchema): Record<string, Record<string, any>> {
  const defaults: Record<string, Record<string, any>> = {};
  for (const [sectionKey, section] of Object.entries(schema.sections)) {
    defaults[sectionKey] = {};
    for (const [fieldKey, field] of Object.entries(section.fields)) {
      defaults[sectionKey][fieldKey] = field.default;
    }
  }
  return defaults;
}

// ───────────────────────────────────────────────
// Settings Access (Single Source of Truth)
// ───────────────────────────────────────────────

/**
 * Get all settings for a theme, resolved as: schema defaults → DB overrides.
 * This is the ONLY way consumers should access theme settings.
 */
export async function getSettings(themeId: string): Promise<Record<string, Record<string, any>>> {
  const schema = loadSchema(themeId);
  const defaults = getSchemaDefaults(schema);

  // Query all stored sections from DB
  const prefix = `theme.${themeId}.settings.`;
  const rows = await db.select().from(settings).where(like(settings.key, `${prefix}%`));

  // Merge DB values over defaults
  const result: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(defaults));

  for (const row of rows) {
    const sectionKey = row.key.replace(prefix, '');
    if (result[sectionKey] !== undefined) {
      try {
        const parsed = JSON.parse(row.value);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          // Only override fields that exist in schema
          for (const [fieldKey, fieldValue] of Object.entries(parsed)) {
            if (result[sectionKey][fieldKey] !== undefined || schema.sections[sectionKey]?.fields[fieldKey]) {
              result[sectionKey][fieldKey] = fieldValue;
            }
          }
        }
      } catch {
        // Ignore unparseable DB values, use defaults
      }
    }
  }

  return result;
}

/**
 * Get a single setting value by dot-path (e.g. 'colors.primary').
 */
export async function getSetting(themeId: string, path: string): Promise<any> {
  const parts = path.split('.');
  if (parts.length !== 2) {
    throw new Error(`Invalid settings path: "${path}". Expected format: "section.field"`);
  }

  const [sectionKey, fieldKey] = parts;
  const allSettings = await getSettings(themeId);
  return allSettings[sectionKey]?.[fieldKey] ?? null;
}

// ───────────────────────────────────────────────
// Settings Mutation
// ───────────────────────────────────────────────

/**
 * Save theme settings. Accepts a partial or full settings object.
 * Each section is stored as a separate DB key: theme.<id>.settings.<section>
 */
export async function saveSettings(
  themeId: string,
  data: Record<string, Record<string, any>>
): Promise<void> {
  const schema = loadSchema(themeId);

  for (const [sectionKey, sectionData] of Object.entries(data)) {
    // Only save sections that exist in the schema
    if (!schema.sections[sectionKey]) continue;

    const dbKey = `theme.${themeId}.settings.${sectionKey}`;
    const serialized = JSON.stringify(sectionData);

    // Upsert into settings table
    const existing = await db.select().from(settings).where(eq(settings.key, dbKey)).limit(1);

    if (existing.length > 0) {
      await db.update(settings).set({
        value: serialized,
        updatedAt: new Date(),
      }).where(eq(settings.key, dbKey));
    } else {
      await db.insert(settings).values({
        key: dbKey,
        value: serialized,
        description: `Theme settings: ${themeId} / ${sectionKey}`,
        group: 'theme_settings',
        type: 'json',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }
}

// ───────────────────────────────────────────────
// Export
// ───────────────────────────────────────────────

export async function exportSettings(themeId: string): Promise<ThemeSettingsExport> {
  const schema = loadSchema(themeId);
  const currentSettings = await getSettings(themeId);

  return {
    themeId,
    schemaVersion: schema.schemaVersion,
    exportedAt: new Date().toISOString(),
    settings: currentSettings,
  };
}

// ───────────────────────────────────────────────
// Import
// ───────────────────────────────────────────────

export async function importSettings(
  themeId: string,
  payload: ThemeSettingsExport
): Promise<ThemeSettingsImportResult> {
  const warnings: string[] = [];
  const schema = loadSchema(themeId);

  // Validate themeId
  if (payload.themeId && payload.themeId !== themeId) {
    warnings.push(
      `Import themeId mismatch: file was exported from "${payload.themeId}" but importing into "${themeId}".`
    );
  }

  // Validate schemaVersion
  if (payload.schemaVersion && payload.schemaVersion !== schema.schemaVersion) {
    warnings.push(
      `Schema version mismatch: file has version ${payload.schemaVersion} but current schema is version ${schema.schemaVersion}. Some settings may not apply correctly.`
    );
  }

  if (!payload.settings || typeof payload.settings !== 'object') {
    return { success: false, warnings: ['Import payload missing "settings" object.'] };
  }

  // Apply settings
  await saveSettings(themeId, payload.settings);

  // Invalidate cache
  invalidateSchemaCache(themeId);

  return { success: true, warnings };
}

// ───────────────────────────────────────────────
// Reset
// ───────────────────────────────────────────────

/**
 * Delete all persisted settings for this theme.
 * Next getSettings() call returns schema defaults.
 */
export async function resetSettings(themeId: string): Promise<void> {
  const prefix = `theme.${themeId}.settings.`;
  const rows = await db.select().from(settings).where(like(settings.key, `${prefix}%`));

  for (const row of rows) {
    await db.delete(settings).where(eq(settings.key, row.key));
  }

  invalidateSchemaCache(themeId);
}
