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
    console.log('Connected to MySQL. Restoring migration 9 record...');
    
    // 1. Delete id=10 if any leftover exists
    await connection.query('DELETE FROM __drizzle_migrations WHERE id = 10;');
    
    // 2. Re-insert migration 9 record with original values
    await connection.query(
      `INSERT INTO __drizzle_migrations (id, hash, created_at) 
       VALUES (10, '1587e637f44fcc962fb3811ba24777d11bf6a847411775493ea1b109e65a13dd', 1781254874742);`
    );
    console.log('Successfully restored migration 9 record.');

    // 3. Drop widgets table to ensure clean state
    await connection.query('DROP TABLE IF EXISTS widgets;');
    console.log('Dropped widgets table.');

    // 4. Run migrations using Drizzle
    const db = drizzle(connection);
    const migrationsFolder = path.resolve(__dirname, '../apps/api/drizzle/migrations');
    console.log('Running migrator with folder:', migrationsFolder);
    
    await migrate(db, { migrationsFolder });
    console.log('Migration completed successfully!');

    // 5. Verify widgets table exists now
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('Tables in modern_cms now:', tables);
    
  } catch (err) {
    console.error('Error in script:', err);
  } finally {
    await connection.end();
  }
})();
