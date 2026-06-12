import { saveSettings, getSettings } from '../apps/api/src/themes/themeSettingsService.js';
import { initializeRegistry } from '../apps/api/src/themes/themeRegistry.js';

async function main() {
  await initializeRegistry();
  
  console.log("Saving primary color #ff0000...");
  await saveSettings('default', {
    colors: {
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#1e293b',
      link: '#3b82f6'
    }
  });

  console.log("Retrieving settings...");
  const current = await getSettings('default');
  console.log("colors.primary:", current.colors?.primary);
}
main().catch(console.error);
