import { eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from '../database/schema.js';

export const corePermissions = [
  { key: 'users.manage', description: 'Manage users' },
  { key: 'roles.manage', description: 'Manage roles and role assignments' },
  { key: 'permissions.manage', description: 'Manage permission assignments' },
  { key: 'plugins.manage', description: 'Install, activate, deactivate, and uninstall plugins' },
  { key: 'themes.manage', description: 'Manage themes' },
  { key: 'settings.manage', description: 'Manage platform settings' },
  { key: 'content.read', description: 'Read content in the admin API' },
  { key: 'content.create', description: 'Create content' },
  { key: 'content.update', description: 'Update content' },
  { key: 'content.publish', description: 'Publish content' },
  { key: 'content.delete', description: 'Delete content' },
];

export async function registerPermission(input: {
  key: string;
  description?: string | null;
  source?: 'core' | 'plugin';
  pluginKey?: string | null;
}) {
  const existing = await db
    .select()
    .from(permissions)
    .where(eq(permissions.key, input.key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(permissions)
      .set({
        description: input.description ?? existing[0].description,
        source: input.source || existing[0].source,
        pluginKey: input.pluginKey ?? existing[0].pluginKey,
        updatedAt: new Date(),
      })
      .where(eq(permissions.key, input.key));

    return existing[0].id;
  }

  const [result] = await db.insert(permissions).values({
    key: input.key,
    description: input.description || null,
    source: input.source || 'core',
    pluginKey: input.pluginKey || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return (result as any).insertId as number;
}

export async function registerCorePermissions() {
  for (const permission of corePermissions) {
    await registerPermission({
      ...permission,
      source: 'core',
    });
  }
}

export async function assignPermissionToRole(roleName: string, permissionKey: string) {
  const roleRows = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  const permissionRows = await db.select().from(permissions).where(eq(permissions.key, permissionKey)).limit(1);

  if (roleRows.length === 0 || permissionRows.length === 0) return;

  const existing = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleRows[0].id))
    .limit(1000);

  if (existing.some((row) => row.permissionId === permissionRows[0].id)) return;

  await db.insert(rolePermissions).values({
    roleId: roleRows[0].id,
    permissionId: permissionRows[0].id,
    createdAt: new Date(),
  });
}

export async function assignAllPermissionsToRole(roleName: string) {
  const allPermissions = await db.select().from(permissions);

  for (const permission of allPermissions) {
    await assignPermissionToRole(roleName, permission.key);
  }
}

export async function userHasPermission(userId: number, permissionKey: string) {
  const rows = await db
    .select({
      roleName: roles.name,
      permissionKey: permissions.key,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));

  return rows.some((row) => row.roleName === 'Admin' || row.permissionKey === permissionKey);
}
