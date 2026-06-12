import mysql from 'mysql2/promise';

(async () => {
  const connection = await mysql.createConnection('mysql://root:@127.0.0.1:3306/modern_cms');
  try {
    const [migrations] = await connection.query('SELECT * FROM __drizzle_migrations;');
    console.log('Migrations in __drizzle_migrations:', migrations);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await connection.end();
  }
})();
