import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { migratePlugin } from './pluginLifecycleService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
  const [command, pluginKey] = process.argv.slice(2);

  if (command !== 'migrate' || !pluginKey) {
    console.error('Usage: pnpm --filter @modern-cms/api plugin:migrate <plugin-key>');
    process.exit(1);
  }

  await migratePlugin(pluginKey);
  console.log(`Plugin migrations completed: ${pluginKey}`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Plugin command failed:', error);
  process.exit(1);
});
