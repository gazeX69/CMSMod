import { scanThemes } from '../apps/api/src/themes/themeScanner.js';
import { initializeRegistry, getRegisteredThemes } from '../apps/api/src/themes/themeRegistry.js';
import {
  loadSchema,
  getSettings,
  saveSettings,
  exportSettings,
  importSettings,
  resetSettings,
} from '../apps/api/src/themes/themeSettingsService.js';

async function main() {
  console.log("=== STARTING THEME SETTINGS SYSTEM VALIDATION ===");

  // Initialize registry first to populate entries
  await initializeRegistry();
  const registered = getRegisteredThemes();

  console.log("\n--- TEST 1: Schema Discovery ---");
  // 1. Schema discovery: verify both themes register settingsSchemaPath without loading content.
  const defaultTheme = registered.find(t => t.id === 'default');
  const elegantTheme = registered.find(t => t.id === 'elegant-dark');

  if (!defaultTheme || !elegantTheme) {
    throw new Error("Missing default or elegant-dark theme in registry.");
  }

  console.log("Default theme schema path:", defaultTheme.settingsSchemaPath);
  console.log("Elegant theme schema path:", elegantTheme.settingsSchemaPath);

  if (!defaultTheme.settingsSchemaPath || !defaultTheme.settingsSchemaPath.endsWith('settings-schema.json')) {
    throw new Error("Default theme settingsSchemaPath is invalid or empty.");
  }
  if (!elegantTheme.settingsSchemaPath || !elegantTheme.settingsSchemaPath.endsWith('settings-schema.json')) {
    throw new Error("Elegant theme settingsSchemaPath is invalid or empty.");
  }
  console.log("✓ Test 1 Passed: Schema discovery registered paths properly without loading content.");

  console.log("\n--- TEST 2: Lazy Schema Loading ---");
  // 2. Lazy schema load: verify loadSchema() returns parsed schema with schemaVersion.
  const defaultSchema = loadSchema('default');
  console.log("Loaded default theme schema. Version:", defaultSchema.schemaVersion);
  if (typeof defaultSchema.schemaVersion !== 'number' || defaultSchema.schemaVersion < 1) {
    throw new Error("Default schemaVersion is invalid.");
  }
  if (!defaultSchema.sections || typeof defaultSchema.sections !== 'object') {
    throw new Error("Default schema sections is missing or invalid.");
  }
  console.log("✓ Test 2 Passed: Lazy schema load works and validates schema structure.");

  console.log("\n--- TEST 3: Settings GET (Defaults) ---");
  // 3. Settings GET: verify defaults are returned from schema when no DB values exist.
  // We'll reset settings first to ensure DB is clean for this theme
  await resetSettings('default');
  const initialSettings = await getSettings('default');

  console.log("Checking color.primary default value...");
  const primaryColorDefault = defaultSchema.sections.colors.fields.primary.default;
  const primaryColorResolved = initialSettings.colors.primary;

  console.log(`Schema default: ${primaryColorDefault}, Resolved: ${primaryColorResolved}`);
  if (primaryColorResolved !== primaryColorDefault) {
    throw new Error(`Expected resolved colors.primary to equal schema default '${primaryColorDefault}', got '${primaryColorResolved}'`);
  }
  console.log("✓ Test 3 Passed: Schema defaults are returned when no database overrides exist.");

  console.log("\n--- TEST 4: Settings PUT (Save Settings) ---");
  // 4. Settings PUT: verify section-level persistence.
  const customSettings = {
    colors: {
      primary: "#ff0000", // Customized red
      secondary: "#00ff00",
      accent: "#0000ff",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      link: "#3b82f6"
    }
  };

  console.log("Saving customized settings...");
  await saveSettings('default', customSettings);

  const updatedSettings = await getSettings('default');
  console.log("Resolved primary color after save:", updatedSettings.colors.primary);
  if (updatedSettings.colors.primary !== "#ff0000") {
    throw new Error(`Expected primary color to be updated to '#ff0000', got '${updatedSettings.colors.primary}'`);
  }
  console.log("✓ Test 4 Passed: Settings save and merge logic work correctly.");

  console.log("\n--- TEST 5: Settings Export ---");
  // 5. Export: verify export payload contains themeId, schemaVersion, exportedAt, settings.
  const exported = await exportSettings('default');
  console.log("Exported payload keys:", Object.keys(exported));
  if (exported.themeId !== 'default') {
    throw new Error(`Expected exported themeId to be 'default', got '${exported.themeId}'`);
  }
  if (exported.schemaVersion !== defaultSchema.schemaVersion) {
    throw new Error(`Expected exported schemaVersion to be ${defaultSchema.schemaVersion}, got ${exported.schemaVersion}`);
  }
  if (!exported.exportedAt || isNaN(Date.parse(exported.exportedAt))) {
    throw new Error("Exported exportedAt timestamp is missing or invalid.");
  }
  if (!exported.settings || typeof exported.settings !== 'object') {
    throw new Error("Exported settings object is missing or invalid.");
  }
  console.log("✓ Test 5 Passed: Settings export produces expected metadata and payload.");

  console.log("\n--- TEST 6: Settings Import ---");
  // 6. Import: verify import validates themeId/schemaVersion and applies values.
  console.log("Modifying exported settings in-memory for import...");
  const modifiedExport = {
    ...exported,
    settings: {
      ...exported.settings,
      colors: {
        ...exported.settings.colors,
        primary: "#ff00ff" // Purple accent
      }
    }
  };

  console.log("Importing modified settings...");
  const importResult = await importSettings('default', modifiedExport);
  console.log("Import result:", importResult);
  if (!importResult.success) {
    throw new Error("Import failed.");
  }

  const settingsAfterImport = await getSettings('default');
  console.log("Resolved primary color after import:", settingsAfterImport.colors.primary);
  if (settingsAfterImport.colors.primary !== "#ff00ff") {
    throw new Error(`Expected primary color to be '#ff00ff' after import, got '${settingsAfterImport.colors.primary}'`);
  }

  // Verify import warnings with mismatched themeId
  const mismatchedExport = {
    ...modifiedExport,
    themeId: 'other-theme-id'
  };
  const mismatchedImportRes = await importSettings('default', mismatchedExport);
  console.log("Mismatched import warnings:", mismatchedImportRes.warnings);
  if (mismatchedImportRes.warnings.length === 0) {
    throw new Error("Expected warning on themeId mismatch during import, but none were returned.");
  }
  console.log("✓ Test 6 Passed: Settings import applies values and warns on metadata mismatch.");

  console.log("\n--- TEST 7: Settings Reset ---");
  // 7. Reset: verify all theme.default.settings.* keys are deleted and defaults restored.
  console.log("Resetting default theme settings...");
  await resetSettings('default');

  const settingsAfterReset = await getSettings('default');
  console.log("Primary color after reset:", settingsAfterReset.colors.primary);
  if (settingsAfterReset.colors.primary !== primaryColorDefault) {
    throw new Error(`Expected primary color to revert to schema default '${primaryColorDefault}', got '${settingsAfterReset.colors.primary}'`);
  }
  console.log("✓ Test 7 Passed: Reset successfully deletes DB settings and restores schema defaults.");

  console.log("\n--- TEST 8: Theme Settings Isolation ---");
  // 8. Isolation: verify changing default theme settings does NOT affect elegant-dark settings.
  console.log("Saving custom settings for 'default'...");
  await saveSettings('default', {
    colors: {
      primary: "#ff0000",
      secondary: "#00ff00",
      accent: "#0000ff",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#1e293b",
      link: "#3b82f6"
    }
  });

  const elegantSchema = loadSchema('elegant-dark');
  const elegantSettings = await getSettings('elegant-dark');

  const defaultResolvedPrimary = (await getSettings('default')).colors.primary;
  const elegantResolvedPrimary = elegantSettings.colors.primary;
  const elegantDefaultPrimary = elegantSchema.sections.colors.fields.primary.default;

  console.log(`Default theme primary color (saved): ${defaultResolvedPrimary}`);
  console.log(`Elegant dark theme primary color (resolved): ${elegantResolvedPrimary}`);
  console.log(`Elegant dark theme primary color (schema default): ${elegantDefaultPrimary}`);

  if (defaultResolvedPrimary === elegantResolvedPrimary) {
    throw new Error("Settings isolation breached: default theme settings match elegant theme settings!");
  }
  if (elegantResolvedPrimary !== elegantDefaultPrimary) {
    throw new Error(`Expected elegant-dark to use its own schema default '${elegantDefaultPrimary}', got '${elegantResolvedPrimary}'`);
  }
  console.log("✓ Test 8 Passed: Theme settings are fully isolated between themes.");

  console.log("\n=== ALL THEME SETTINGS SYSTEM TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Validation Failed:", err);
  process.exit(1);
});
