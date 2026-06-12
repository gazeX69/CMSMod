import { db } from './database/client.js';
import { plugins } from './database/schema.js';

async function main() {
  try {
    const rows = await db.select().from(plugins);
    console.log('--- PLUGINS STATUS ---');
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
