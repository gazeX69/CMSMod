// ───────────────────────────────────────────────
// Theme Manifest (theme.json)
// ───────────────────────────────────────────────

export interface ThemeRegion {
  label: string;
  description?: string;
}

export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  screenshot?: string;
  templates?: Record<string, string>;
  regions?: Record<string, ThemeRegion>;
}

// ───────────────────────────────────────────────
// Theme Registry
// ───────────────────────────────────────────────

export type ThemeStatus = 'active' | 'inactive' | 'broken';

export interface ThemeRegistryEntry {
  id: string;
  name: string;
  version: string;
  status: ThemeStatus;
  path: string;
  manifest: ThemeManifest;
  settingsSchemaPath: string | null;  // filesystem path only, NOT loaded content
  error?: string;
}

export interface ScannedTheme {
  id: string;
  themePath: string;
  manifestPath: string;
  manifest: ThemeManifest | null;
  settingsSchemaPath: string | null;  // filesystem path only
  status: 'discovered' | 'broken';
  error?: string;
}

// ───────────────────────────────────────────────
// Theme Settings Schema (settings-schema.json)
// Owned by Theme, read by Core on demand
// ───────────────────────────────────────────────

export type ThemeSettingsFieldType = 'text' | 'color' | 'boolean' | 'select' | 'textarea' | 'number' | 'url' | 'media';

export interface ThemeSettingsFieldOption {
  label: string;
  value: string;
}

export interface ThemeSettingsField {
  type: ThemeSettingsFieldType;
  label: string;
  description: string;
  default: any;
  required: boolean;
  options?: ThemeSettingsFieldOption[];  // for select type
  min?: number;                         // for number type
  max?: number;                         // for number type
  pattern?: string;                     // regex validation
}

export interface ThemeSettingsSection {
  label: string;
  description?: string;
  fields: Record<string, ThemeSettingsField>;
}

export interface ThemeSettingsSchema {
  schemaVersion: number;
  sections: Record<string, ThemeSettingsSection>;
}

// ───────────────────────────────────────────────
// Theme Settings Export / Import
// ───────────────────────────────────────────────

export interface ThemeSettingsExport {
  themeId: string;
  schemaVersion: number;
  exportedAt: string;   // ISO 8601
  settings: Record<string, Record<string, any>>;
}

export interface ThemeSettingsImportResult {
  success: boolean;
  warnings: string[];
}
