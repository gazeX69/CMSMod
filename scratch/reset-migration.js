import mysql from 'mysql2/promise';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { drizzle } from 'drizzle-orm/mysql2';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const connection = await mysql.createConnection('mysql://root:@127.0.0.1:3306/modern_cms');
  try {
    console.log('Connected to MySQL. Cleaning up migration 10...');
    
    // 1. Delete migration 10 if it exists in the tracker table
    await connection.query('DELETE FROM __drizzle_migrations WHERE id = 10;');
    console.log('Deleted migration 10 record.');
    
    // 2. Drop widgets table if it exists
    await connection.query('DROP TABLE IF EXISTS widgets;');
    console.log('Dropped widgets table if it existed.');

    // 3. Re-run migrations using Drizzle
    const db = drizzle(connection);
    const migrationsFolder = path.resolve(__dirname, '../apps/api/drizzle/migrations');
    console.log('Running migrator with folder:', migrationsFolder);
    
    await migrate(db, { migrationsFolder });
    console.log('Migration completed successfully!');
    
  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    await connection.end();
  }
})();
