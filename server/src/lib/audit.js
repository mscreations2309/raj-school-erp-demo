import { prisma } from './prisma.js';

/** Fire-and-forget audit trail entry. Never blocks or fails the request. */
export function audit(req, action, entity, entityId, meta) {
  prisma.auditLog
    .create({
      data: {
        schoolId: req.schoolId || null,
        userId: req.user?.id,
        userName: req.user?.name,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        meta: meta ? JSON.stringify(meta).slice(0, 2000) : null,
      },
    })
    .catch(() => {});
}
