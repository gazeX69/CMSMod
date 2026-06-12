import { getPublicSettings } from '../apps/api/src/settings/settingsService.js';

async function main() {
  const settings = await getPublicSettings();
  const siteUrl = settings.find(s => s.key === 'system.site_url');
  console.log("Dynamic system.site_url value:", siteUrl ? siteUrl.value : 'Not found');
  process.exit(0);
}

main().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
