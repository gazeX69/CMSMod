import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';

// Resolve root env path based on cwd
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle/migrations',
  dialect: 'mysql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/modern_cms',
  },
});
