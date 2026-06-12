import { db } from '../apps/api/src/database/client.js';
import { settings } from '../apps/api/src/database/schema.js';
import { like } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(settings).where(like(settings.key, 'theme.%'));
  console.log("Theme settings in database:", JSON.stringify(rows, null, 2));
  process.exit(0);
}
main().catch(console.error);
