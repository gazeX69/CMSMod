# Database Setup Guide - Modern CMS

This guide documents the local database integration, migrations workflow, and seed commands for Modern CMS.

---

## 1. Local MySQL Setup (via XAMPP)

Modern CMS uses MySQL/MariaDB for relational storage. For local development, we recommend using **XAMPP**:

1. Download and install [XAMPP](https://www.apachefriends.org/).
2. Open the **XAMPP Control Panel** and start the **MySQL** module.
3. Access phpMyAdmin at `http://localhost/phpmyadmin/` or connect via a SQL client (such as DBeaver) using these default credentials:
   - **Host**: `127.0.0.1` (or `localhost`)
   - **Port**: `3306`
   - **Username**: `root`
   - **Password**: *(none)*
4. Create a database named `modern_cms`:
   ```sql
   CREATE DATABASE IF NOT EXISTS modern_cms;
   ```

---

## 2. Environment Configuration

Define the `DATABASE_URL` parameter in your `.env` file in the root directory:

```env
DATABASE_URL=mysql://root:@127.0.0.1:3306/modern_cms
```

---

## 3. Database Migration & Seeding Commands

Manage your database schema and default tables using the following commands run from the monorepo root:

### Step A: Generate Migrations
Generate SQL migration files inside the `apps/api/drizzle/migrations` directory based on the TypeScript schema defined in `src/database/schema.ts`:
```bash
pnpm --filter @modern-cms/api db:generate
```

### Step B: Run Migrations
Apply generated migrations to the MySQL database:
```bash
pnpm --filter @modern-cms/api db:migrate
```

### Step C: Seed Default Data
Seed the tables with initial, safe development parameters (roles and default settings):
```bash
pnpm --filter @modern-cms/api db:seed
```

---

## 4. Verification Endpoints

Ensure the database connection is operating correctly by testing these endpoints:

### Database Health Check
- **URL**: `GET http://127.0.0.1:4000/api/database/health`
- **Successful Response**:
  ```json
  {
    "ok": true
  }
  ```

### Get Public Settings
- **URL**: `GET http://127.0.0.1:4000/api/settings`
- **Successful Response**:
  ```json
  [
    {
      "key": "site_name",
      "value": "Modern CMS",
      "description": "The name of the website",
      "group": "general",
      "type": "string",
      "isPublic": true,
      "createdAt": "2026-05-28T07:00:00.000Z",
      "updatedAt": "2026-05-28T07:00:00.000Z"
    },
    ...
  ]
  ```
