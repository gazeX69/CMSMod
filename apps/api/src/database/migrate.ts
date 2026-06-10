import { migrate } from 'drizzle-orm/mysql2/migrator';
import { db } from './client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('Running migrations...');
  try {
    await migrate(db, {
      migrationsFolder: path.resolve(__dirname, '../../drizzle/migrations'),
    });
    console.log('Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
