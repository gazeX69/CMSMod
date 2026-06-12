import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { users, roles, userRoles } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { requirePermission } from '../hooks/permissions.js';
import bcrypt from 'bcryptjs';

export async function usersRoutes(app: FastifyInstance) {
  const requireUsersManage = requirePermission('users.manage');
  const requireRolesManage = requirePermission('roles.manage');
  const requireRolesOrUsersManage = requirePermission(['roles.manage', 'users.manage']);

  // GET /api/users
  app.get('/users', { preHandler: requireUsersManage }, async (request, reply) => {
    try {
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        status: users.status,
        createdAt: users.createdAt,
      }).from(users);

      const usersWithRoles = [];
      for (const u of allUsers) {
        const userRolesList = await db
          .select({
            roleName: roles.name,
            roleId: roles.id,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, u.id));

        usersWithRoles.push({
          ...u,
          roles: userRolesList.map(r => r.roleName),
          roleIds: userRolesList.map(r => r.roleId),
        });
      }

      return usersWithRoles;
    } catch (error) {
      app.log.error(error, 'Error listing users');
      reply.status(500);
      return { error: 'Failed to retrieve users' };
    }
  });

  // POST /api/users
  app.post('/users', { preHandler: requireUsersManage }, async (request, reply) => {
    const { username, email, password, roleId, status = 'active' } = request.body as any;

    if (!username || !email || !password || !roleId) {
      reply.status(400);
      return { error: 'Username, Email, Password, and Role are required' };
    }

    try {
      // Check duplicate username
      const duplicateUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (duplicateUsername.length > 0) {
        reply.status(409);
        return { error: 'Username is already taken' };
      }

      // Check duplicate email
      const duplicateEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (duplicateEmail.length > 0) {
        reply.status(409);
        return { error: 'Email is already registered' };
      }

      const passwordHash = bcrypt.hashSync(password, 10);

      const [result] = await db.insert(users).values({
        username,
        email,
        passwordHash,
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const userId = (result as any).insertId;

      // Assign role
      await db.insert(userRoles).values({
        userId,
        roleId,
      });

      return { ok: true, id: userId };
    } catch (error) {
      app.log.error(error, 'Error creating user');
      reply.status(500);
      return { error: 'Failed to create user' };
    }
  });

  // PUT /api/users/:id
  app.put('/users/:id', { preHandler: requireUsersManage }, async (request, reply) => {
    const { id } = request.params as any;
    const { username, email, password, roleId, status } = request.body as any;

    try {
      const userId = parseInt(id, 10);
      const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existingUser.length === 0) {
        reply.status(404);
        return { error: 'User not found' };
      }

      // Check duplicates
      if (username && username !== existingUser[0].username) {
        const collision = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (collision.length > 0) {
          reply.status(409);
          return { error: 'Username is already taken' };
        }
      }

      if (email && email !== existingUser[0].email) {
        const collision = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (collision.length > 0) {
          reply.status(409);
          return { error: 'Email is already registered' };
        }
      }

      const updateData: any = {
        updatedAt: new Date(),
      };
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (status) updateData.status = status;
      if (password) {
        updateData.passwordHash = bcrypt.hashSync(password, 10);
      }

      await db.update(users).set(updateData).where(eq(users.id, userId));

      if (roleId) {
        // Delete old user_roles and map new one
        await db.delete(userRoles).where(eq(userRoles.userId, userId));
        await db.insert(userRoles).values({
          userId,
          roleId,
        });
      }

      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error updating user');
      reply.status(500);
      return { error: 'Failed to update user' };
    }
  });

  // DELETE /api/users/:id
  app.delete('/users/:id', { preHandler: requireUsersManage }, async (request, reply) => {
    const { id } = request.params as any;

    try {
      const userId = parseInt(id, 10);
      if (userId === request.user!.id) {
        reply.status(400);
        return { error: 'You cannot delete your own account' };
      }

      const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (existing.length === 0) {
        reply.status(404);
        return { error: 'User not found' };
      }

      await db.delete(users).where(eq(users.id, userId));
      return { ok: true };
    } catch (error) {
      app.log.error(error, 'Error deleting user');
      reply.status(500);
      return { error: 'Failed to delete user' };
    }
  });

  // GET /api/roles
  app.get('/roles', { preHandler: requireRolesOrUsersManage }, async (request, reply) => {
    try {
      const allRoles = await db.select().from(roles);
      return allRoles;
    } catch (error) {
      app.log.error(error, 'Error listing roles');
      reply.status(500);
      return { error: 'Failed to retrieve roles' };
    }
  });
}
