import { FastifyInstance } from 'fastify';
import { db } from '../database/client.js';
import { users, sessions } from '../database/schema.js';
import { eq, or, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { requireAuth } from '../hooks/auth.js';

export async function authRoutes(app: FastifyInstance) {
  // GET /api/auth/setup-status
  app.get('/auth/setup-status', async (request, reply) => {
    try {
      const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
      const isSetup = userCount[0]?.count > 0;
      return { isSetup };
    } catch (error) {
      app.log.error(error as Error, 'Error fetching setup-status');
      reply.status(500);
      return { error: 'Failed to retrieve setup status' };
    }
  });

  // POST /api/auth/login
  app.post('/auth/login', async (request, reply) => {
    const body = request.body as any;
    if (!body) {
      reply.status(400);
      return { error: 'Request body is required' };
    }

    const { usernameOrEmail, password } = body;

    if (!usernameOrEmail || !password) {
      reply.status(400);
      return { error: 'Username/Email and Password are required' };
    }

    try {
      // Find user
      const userRecord = await db
        .select()
        .from(users)
        .where(or(eq(users.username, usernameOrEmail), eq(users.email, usernameOrEmail)))
        .limit(1);

      if (userRecord.length === 0) {
        reply.status(401);
        return { error: 'Invalid credentials' };
      }

      const user = userRecord[0];

      // Compare passwords
      const isPasswordCorrect = bcrypt.compareSync(password, user.passwordHash);
      if (!isPasswordCorrect) {
        reply.status(401);
        return { error: 'Invalid credentials' };
      }

      // Generate session token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      // TTL in days
      const ttlDays = process.env.SESSION_TTL_DAYS ? parseInt(process.env.SESSION_TTL_DAYS, 10) : 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ttlDays);

      const sessionId = crypto.randomUUID();

      // Store session in DB
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        tokenHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        expiresAt,
      });

      // Set cookie
      const cookieName = process.env.SESSION_COOKIE_NAME || 'modern_cms_session';
      reply.setCookie(cookieName, rawToken, {
        path: '/',
        httpOnly: true,
        secure: false, // set false for dev HTTP on localhost
        sameSite: 'lax',
        expires: expiresAt,
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    } catch (error) {
      app.log.error(error as Error, 'Login error');
      reply.status(500);
      return { error: 'Failed to process login' };
    }
  });

  // POST /api/auth/logout
  app.post('/auth/logout', async (request, reply) => {
    const cookieName = process.env.SESSION_COOKIE_NAME || 'modern_cms_session';
    const token = request.cookies[cookieName];

    if (token) {
      try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.tokenHash, tokenHash));
      } catch (error) {
        app.log.error(error as Error, 'Logout db error');
      }
    }

    reply.clearCookie(cookieName, { path: '/' });
    return { success: true };
  });

  // GET /api/auth/me (Protected)
  app.get('/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    return { user: request.user };
  });
}
