import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/client.js';
import { sessions, users } from '../database/schema.js';
import { eq, and, gt, isNull } from 'drizzle-orm';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
    };
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const cookieName = process.env.SESSION_COOKIE_NAME || 'modern_cms_session';
  const token = request.cookies[cookieName];

  if (!token) {
    reply.status(401).send({ error: 'Unauthorized: No session token provided' });
    return;
  }

  // Hash the token using SHA-256 to match the database stored token_hash
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // Find active session
    const activeSession = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        username: users.username,
        email: users.email,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, tokenHash),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (activeSession.length === 0) {
      reply.status(401).send({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    // Attach user to request
    request.user = {
      id: activeSession[0].userId,
      username: activeSession[0].username,
      email: activeSession[0].email,
    };
  } catch (error) {
    request.log.error(error as Error, 'Authentication hook error');
    reply.status(500).send({ error: 'Internal Server Error' });
  }
}
