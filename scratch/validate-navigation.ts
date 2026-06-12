import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../apps/api/src/database/client.js';
import { users, roles, userRoles, sessions, navigationItems } from '../apps/api/src/database/schema.js';
import { buildApp } from '../apps/api/src/app.js';

async function main() {
  console.log("=== STARTING NAVIGATION SYSTEM VALIDATION ===");

  // 1. Setup mock Admin user session
  console.log("\n--- STEP 1: Setting up mock Admin session ---");
  
  // Find or create 'Admin' role
  let adminRole = await db.select().from(roles).where(eq(roles.name, 'Admin')).limit(1);
  let adminRoleId: number;
  if (adminRole.length === 0) {
    console.log("Admin role not found, creating temp Admin role...");
    const [insertResult] = await db.insert(roles).values({
      name: 'Admin',
      description: 'System Administrator',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    adminRoleId = (insertResult as any).insertId;
  } else {
    adminRoleId = adminRole[0].id;
  }

  // Find or create a user
  let user = await db.select().from(users).limit(1);
  let userId: number;
  if (user.length === 0) {
    console.log("No users found, creating temp user...");
    const [insertResult] = await db.insert(users).values({
      username: 'temp_admin',
      email: 'temp_admin@example.com',
      passwordHash: 'dummy_hash',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    userId = (insertResult as any).insertId;
  } else {
    userId = user[0].id;
  }

  // Ensure user has Admin role
  const existingUserRole = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, adminRoleId)))
    .limit(1);
  
  let tempUserRoleCreated = false;
  if (existingUserRole.length === 0) {
    console.log(`Assigning Admin role to user ID: ${userId}...`);
    await db.insert(userRoles).values({
      userId,
      roleId: adminRoleId,
      createdAt: new Date(),
    });
    tempUserRoleCreated = true;
  }

  // Create session
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiry

  const sessionId = crypto.randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    tokenHash,
    ipAddress: '127.0.0.1',
    userAgent: 'Validation Script',
    expiresAt,
  });
  console.log(`Created mock session ID: ${sessionId} for user ID: ${userId}`);

  // 2. Initialize Fastify App
  console.log("\n--- STEP 2: Initializing Fastify app ---");
  const app = buildApp();
  await app.ready();
  console.log("Fastify app initialized and ready.");

  try {
    // 3. Test GET /admin/navigation/locations
    console.log("\n--- STEP 3: Testing GET /api/admin/navigation/locations ---");
    const getLocsResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/navigation/locations',
      headers: {
        cookie: `modern_cms_session=${rawToken}`,
      },
    });

    console.log("Response status:", getLocsResponse.statusCode);
    const locations = JSON.parse(getLocsResponse.payload);
    console.log("Locations list:", locations);

    if (getLocsResponse.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getLocsResponse.statusCode}`);
    }
    if (!Array.isArray(locations)) {
      throw new Error("Locations response is not an array");
    }
    if (!locations.includes('primary') || !locations.includes('footer')) {
      throw new Error("Locations response must default to contain 'primary' and 'footer'");
    }
    console.log("✓ GET Locations test passed.");

    // Backup existing primary menu items
    const backupResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/navigation/primary',
      headers: {
        cookie: `modern_cms_session=${rawToken}`,
      },
    });
    const backupItems = JSON.parse(backupResponse.payload);
    console.log(`Backed up ${backupItems.length} existing navigation items for 'primary'`);

    // 4. Test PUT /admin/navigation/primary (Hierarchical update)
    console.log("\n--- STEP 4: Testing PUT /api/admin/navigation/primary (Hierarchical Bulk Update) ---");
    const newItems = [
      { tempId: 1, label: 'Home', url: '/', sortOrder: 0, target: '_self' },
      { tempId: 2, label: 'Services', url: '/services', sortOrder: 1, target: '_self' },
      { tempId: 3, parentTempId: 2, label: 'Web Dev', url: '/services/web', sortOrder: 0, target: '_self' },
      { tempId: 4, parentTempId: 2, label: 'App Dev', url: '/services/app', sortOrder: 1, target: '_blank' },
      { tempId: 5, label: 'About Us', url: '/about', sortOrder: 2, target: '_self' }
    ];

    const putResponse = await app.inject({
      method: 'PUT',
      url: '/api/admin/navigation/primary',
      headers: {
        cookie: `modern_cms_session=${rawToken}`,
      },
      payload: newItems,
    });

    console.log("Response status:", putResponse.statusCode);
    const putResult = JSON.parse(putResponse.payload);
    console.log("Response payload:", putResult);

    if (putResponse.statusCode !== 200) {
      throw new Error(`Expected 200, got ${putResponse.statusCode}. Payload: ${putResponse.payload}`);
    }
    if (putResult.success !== true) {
      throw new Error("Bulk update returned success != true");
    }
    console.log("✓ PUT Hierarchical Bulk Update passed.");

    // 5. Test GET /admin/navigation/primary to verify DB mapping and resolution
    console.log("\n--- STEP 5: Verifying items via GET /api/admin/navigation/primary ---");
    const getItemsResponse = await app.inject({
      method: 'GET',
      url: '/api/admin/navigation/primary',
      headers: {
        cookie: `modern_cms_session=${rawToken}`,
      },
    });

    console.log("Response status:", getItemsResponse.statusCode);
    const savedItems = JSON.parse(getItemsResponse.payload);
    console.log("Saved items from DB:\n", JSON.stringify(savedItems, null, 2));

    if (getItemsResponse.statusCode !== 200) {
      throw new Error(`Expected 200, got ${getItemsResponse.statusCode}`);
    }
    if (savedItems.length !== 5) {
      throw new Error(`Expected 5 items, got ${savedItems.length}`);
    }

    // Verify ordering by sortOrder
    const sorted = [...savedItems].sort((a, b) => a.sortOrder - b.sortOrder);
    // Find item models
    const homeItem = savedItems.find((i: any) => i.label === 'Home');
    const servicesItem = savedItems.find((i: any) => i.label === 'Services');
    const webDevItem = savedItems.find((i: any) => i.label === 'Web Dev');
    const appDevItem = savedItems.find((i: any) => i.label === 'App Dev');
    const aboutItem = savedItems.find((i: any) => i.label === 'About Us');

    if (!homeItem || !servicesItem || !webDevItem || !appDevItem || !aboutItem) {
      throw new Error("Could not find all expected items in GET response");
    }

    // Check parents
    if (homeItem.parentId !== null) {
      throw new Error(`Home item parentId must be null, got: ${homeItem.parentId}`);
    }
    if (servicesItem.parentId !== null) {
      throw new Error(`Services item parentId must be null, got: ${servicesItem.parentId}`);
    }
    if (aboutItem.parentId !== null) {
      throw new Error(`About item parentId must be null, got: ${aboutItem.parentId}`);
    }
    if (webDevItem.parentId !== servicesItem.id) {
      throw new Error(`Web Dev item parentId should match Services ID (${servicesItem.id}), got: ${webDevItem.parentId}`);
    }
    if (appDevItem.parentId !== servicesItem.id) {
      throw new Error(`App Dev item parentId should match Services ID (${servicesItem.id}), got: ${appDevItem.parentId}`);
    }

    // Check target attribute
    if (appDevItem.target !== '_blank') {
      throw new Error(`App Dev item target must be '_blank', got: ${appDevItem.target}`);
    }

    console.log("✓ Hierarchy validation passed successfully! ParentIds correctly resolved in single transaction.");

    // Restore original primary menu items
    console.log("\n--- STEP 6: Restoring original navigation items ---");
    const restoreResponse = await app.inject({
      method: 'PUT',
      url: '/api/admin/navigation/primary',
      headers: {
        cookie: `modern_cms_session=${rawToken}`,
      },
      payload: backupItems,
    });
    if (restoreResponse.statusCode === 200) {
      console.log("✓ Original menu items successfully restored.");
    } else {
      console.warn("⚠️ Failed to restore original menu items automatically!");
    }

  } finally {
    // Cleanup mock session and database artifacts
    console.log("\n--- STEP 7: Cleaning up session and temp records ---");
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    if (tempUserRoleCreated) {
      await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, adminRoleId)));
    }
    console.log("✓ Cleaned up test session and role association.");
  }

  console.log("\n=== ALL NAVIGATION SYSTEM TESTS PASSED SUCCESSFULLY ===");
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Validation Failed:", err);
  process.exit(1);
});
