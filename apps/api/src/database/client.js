import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load env from the root directory
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
const connectionString = process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/modern_cms';
const poolConnection = mysql.createPool({
    uri: connectionString,
    connectionLimit: 10,
});
export const db = drizzle(poolConnection, { schema, mode: 'default' });
//# sourceMappingURL=client.js.map