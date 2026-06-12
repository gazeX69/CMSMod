const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection('mysql://root:@127.0.0.1:3306/modern_cms');
  try {
    console.log('Connected to MySQL.');
    
    // 1. Show all tables
    const [tables] = await connection.query('SHOW TABLES;');
    console.log('Tables in modern_cms:', tables);

    // 2. Show migrations run
    try {
      const [migrations] = await connection.query('SELECT * FROM __drizzle_migrations;');
      console.log('Migrations in __drizzle_migrations:', migrations);
    } catch (err) {
      console.log('No __drizzle_migrations table or error:', err.message);
    }

    // 3. Try to describe widgets table
    try {
      const [desc] = await connection.query('DESCRIBE widgets;');
      console.log('Widgets table structure:', desc);
    } catch (err) {
      console.log('Widgets table error:', err.message);
    }
  } catch (err) {
    console.error('Error connecting or querying:', err);
  } finally {
    await connection.end();
  }
})();
