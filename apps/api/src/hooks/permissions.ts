import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth } from './auth.js';
import { userHasPermission } from '../permissions/permissionService.js';

export function requirePermission(permissionKey: string) {
  return async function permissionGuard(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      await requireAuth(request, reply);
    }

    if (reply.sent) return;

    const userId = request.user?.id;
    if (!userId) {
      reply.status(401).send({ error: 'Unauthorized' });
      return;
    }

    const allowed = await userHasPermission(userId, permissionKey);
    if (!allowed) {
      reply.status(403).send({
        error: 'Forbidden',
        permission: permissionKey,
      });
    }
  };
}
