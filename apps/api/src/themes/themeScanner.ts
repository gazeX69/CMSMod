import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ScannedTheme, ThemeManifest } from './themeTypes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const themesDir = path.resolve(__dirname, '../../../../themes');

export function validateThemeManifest(raw: any): ThemeManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('theme.json must be an object');
  }

  if (!raw.id || typeof raw.id !== 'string' || raw.id.trim() === '') {
    throw new Error('theme.json missing required field: id (must be non-empty string)');
  }

  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim() === '') {
    throw new Error('theme.json missing required field: name (must be non-empty string)');
  }

  if (!raw.version || typeof raw.version !== 'string' || raw.version.trim() === '') {
    throw new Error('theme.json missing required field: version (must be non-empty string)');
  }

  if (raw.templates) {
    if (typeof raw.templates !== 'object' || Array.isArray(raw.templates)) {
      throw new Error('theme.json templates must be a key-value record');
    }
    for (const [key, val] of Object.entries(raw.templates)) {
      if (typeof val !== 'string') {
        throw new Error(`theme.json templates values must be strings (key: "${key}" is not a string)`);
      }
    }
  }

  if (raw.regions) {
    if (typeof raw.regions !== 'object' || Array.isArray(raw.regions)) {
      throw new Error('theme.json regions must be a key-value record');
    }
    for (const [key, val] of Object.entries(raw.regions)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) {
        throw new Error(`theme.json region "${key}" must be an object`);
      }
      const regionObj = val as any;
      if (!regionObj.label || typeof regionObj.label !== 'string' || regionObj.label.trim() === '') {
        throw new Error(`theme.json region "${key}" missing required field: label (must be non-empty string)`);
      }
      if (regionObj.description !== undefined && typeof regionObj.description !== 'string') {
        throw new Error(`theme.json region "${key}" field description must be a string`);
      }
    }
  }

  return raw as ThemeManifest;
}

export function scanThemes(): ScannedTheme[] {
  if (!fs.existsSync(themesDir)) {
    return [];
  }

  const entries = fs.readdirSync(themesDir, { withFileTypes: true });
  const scanned: ScannedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const themePath = path.join(themesDir, entry.name);
    const manifestPath = path.join(themePath, 'theme.json');

    if (!fs.existsSync(manifestPath)) {
      scanned.push({
        id: entry.name,
        themePath,
        manifestPath,
        manifest: null,
        settingsSchemaPath: null,
        status: 'broken',
        error: 'theme.json not found',
      });
      continue;
    }

    try {
      const rawManifest = fs.readFileSync(manifestPath, 'utf-8');
      const parsed = JSON.parse(rawManifest);
      const manifest = validateThemeManifest(parsed);

      // Check for settings-schema.json (lazy: path only, no content load)
      const schemaPath = path.join(themePath, 'settings-schema.json');
      const hasSchema = fs.existsSync(schemaPath);

      scanned.push({
        id: manifest.id,
        themePath,
        manifestPath,
        manifest,
        settingsSchemaPath: hasSchema ? schemaPath : null,
        status: 'discovered',
      });
    } catch (error: any) {
      scanned.push({
        id: entry.name,
        themePath,
        manifestPath,
        manifest: null,
        settingsSchemaPath: null,
        status: 'broken',
        error: error.message || 'Invalid theme.json',
      });
    }
  }

  return scanned;
}
