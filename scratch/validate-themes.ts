import { scanThemes } from '../apps/api/src/themes/themeScanner.js';
import { initializeRegistry, getRegisteredThemes } from '../apps/api/src/themes/themeRegistry.js';
import { activateTheme, deactivateTheme, getActiveThemeId } from '../apps/api/src/themes/themeService.js';

async function main() {
  console.log("=== STARTING THEME SYSTEM VALIDATION ===");

  console.log("\n--- TEST 1: Scanning Themes ---");
  const scanned = scanThemes();
  console.log(`Scanned ${scanned.length} themes.`);
  console.log(JSON.stringify(scanned, null, 2));
  
  if (scanned.length === 0) {
    throw new Error("No themes found! Expected at least the 'default' theme.");
  }
  
  const defaultThemeScanned = scanned.find(t => t.id === 'default');
  if (!defaultThemeScanned) {
    throw new Error("Default theme not discovered!");
  }
  if (defaultThemeScanned.status !== 'discovered') {
    throw new Error(`Default theme scanned with unexpected status: ${defaultThemeScanned.status}. Error: ${defaultThemeScanned.error}`);
  }
  console.log("✓ Test 1 Passed: Theme scanning works correctly.");

  console.log("\n--- TEST 2: Registry Initialization ---");
  await initializeRegistry();
  const registered = getRegisteredThemes();
  console.log(`Registered ${registered.length} themes in the registry.`);
  console.log(JSON.stringify(registered, null, 2));

  const defaultThemeReg = registered.find(t => t.id === 'default');
  if (!defaultThemeReg) {
    throw new Error("Default theme not found in registry!");
  }
  console.log("✓ Test 2 Passed: Theme registry works correctly.");

  console.log("\n--- TEST 3: Theme Activation ---");
  console.log("Activating theme 'default'...");
  const actRes = await activateTheme('default');
  console.log("Activation result:", actRes);
  
  const activeIdAfterAct = await getActiveThemeId();
  console.log("Active theme ID:", activeIdAfterAct);
  if (activeIdAfterAct !== 'default') {
    throw new Error(`Expected active theme ID to be 'default', got '${activeIdAfterAct}'`);
  }
  console.log("✓ Test 3 Passed: Theme activation and settings persistence work.");

  console.log("\n--- TEST 4: Theme Deactivation Blocking ---");
  console.log("Attempting deactivation (should throw an error)...");
  try {
    await deactivateTheme();
    throw new Error("Deactivation succeeded but should have been blocked!");
  } catch (error: any) {
    console.log("Deactivation successfully blocked. Error message:", error.message);
    if (!error.message.includes("Deactivation is not allowed")) {
      throw new Error(`Unexpected error message: ${error.message}`);
    }
  }
  console.log("✓ Test 4 Passed: Theme deactivation is correctly blocked.");

  console.log("\n--- TEST 5: Multiple Themes Switching ---");
  console.log("Activating new theme 'elegant-dark'...");
  const actElegantRes = await activateTheme('elegant-dark');
  console.log("Activation result:", actElegantRes);
  
  const activeIdAfterElegant = await getActiveThemeId();
  console.log("Active theme ID:", activeIdAfterElegant);
  if (activeIdAfterElegant !== 'elegant-dark') {
    throw new Error(`Expected active theme ID to be 'elegant-dark', got '${activeIdAfterElegant}'`);
  }

  await initializeRegistry();
  const registeredThemes = getRegisteredThemes();
  const activeThemeInReg = registeredThemes.find(t => t.status === 'active');
  const inactiveThemeInReg = registeredThemes.find(t => t.id === 'default');

  console.log(`Active theme in registry: ${activeThemeInReg?.id}`);
  console.log(`Default theme status in registry: ${inactiveThemeInReg?.status}`);

  if (activeThemeInReg?.id !== 'elegant-dark') {
    throw new Error(`Expected active theme in registry to be 'elegant-dark', got '${activeThemeInReg?.id}'`);
  }
  if (inactiveThemeInReg?.status !== 'inactive') {
    throw new Error(`Expected 'default' theme to become inactive, got status '${inactiveThemeInReg?.status}'`);
  }

  // Restore back to default theme
  console.log("Restoring back to 'default' theme...");
  await activateTheme('default');
  console.log("✓ Test 5 Passed: Multiple themes switching and single active theme constraints work.");

  console.log("\n=== ALL THEME SYSTEM TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Validation Failed:", err);
  process.exit(1);
});
