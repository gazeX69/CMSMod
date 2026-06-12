import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { comments } from '../schema.js';
import { commentableRegistry } from '../contracts/CommentableRegistry.js';

export interface CommentData {
  targetType: string;
  targetUuid: string;
  parentCommentUuid?: string | null;
  body: string;
  authorId?: number | null;
  guestName?: string | null;
  guestEmail?: string | null;
}

export class CommentService {
  constructor(
    private db: any,
    private sdk: any
  ) {}

  async getCommentsForTarget(targetType: string, targetUuid: string) {
    const maxDepthSetting = await this.sdk.settings.getWithFallback('comments.max_depth', '3');
    const maxDepth = parseInt(maxDepthSetting, 10) || 3;

    // Fetch all approved comments for target
    const list = await this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.targetType, targetType.toLowerCase()),
          eq(comments.targetUuid, targetUuid),
          eq(comments.status, 'approved')
        )
      )
      .orderBy(desc(comments.createdAt));

    // Construct reply tree hierarchy
    return this.buildTree(list, null, maxDepth, 1);
  }

  private buildTree(allComments: any[], parentUuid: string | null, maxDepth: number, currentDepth: number): any[] {
    const levelComments = allComments.filter(c => {
      if (!parentUuid) {
        return !c.parentCommentUuid;
      }
      return c.parentCommentUuid === parentUuid;
    });

    // Sort level comments by date ascending (oldest first for threads)
    levelComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return levelComments.map(c => {
      const replies = currentDepth < maxDepth 
        ? this.buildTree(allComments, c.uuid, maxDepth, currentDepth + 1)
        : [];
      return {
        ...c,
        replies
      };
    });
  }

  async createComment(data: CommentData) {
    // 1. Check global comments enabled
    const enabled = await this.sdk.settings.getWithFallback('comments.enabled', 'true');
    if (enabled !== 'true') {
      throw new Error('Commenting is disabled globally');
    }

    // 2. Validate author vs guest
    if (!data.authorId) {
      const allowGuest = await this.sdk.settings.getWithFallback('comments.allow_guest', 'true');
      if (allowGuest !== 'true') {
        throw new Error('Guest comments are not allowed');
      }
      if (!data.guestName || !data.guestName.trim()) {
        throw new Error('Guest name is required');
      }
      if (!data.guestEmail || !data.guestEmail.trim()) {
        throw new Error('Guest email is required');
      }
    }

    // 3. Validate target using registry
    const targetType = data.targetType.toLowerCase();
    const isValidTarget = await commentableRegistry.validate(targetType, data.targetUuid);
    if (!isValidTarget) {
      throw new Error(`Target of type '${data.targetType}' with UUID '${data.targetUuid}' is invalid or comments are disabled for it`);
    }

    // 4. Validate parent comment if reply
    if (data.parentCommentUuid) {
      const parentList = await this.db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.uuid, data.parentCommentUuid),
            eq(comments.targetUuid, data.targetUuid)
          )
        )
        .limit(1);
      
      if (parentList.length === 0) {
        throw new Error('Parent comment not found or belongs to a different target');
      }
    }

    // 5. Determine initial status
    const requireApproval = await this.sdk.settings.getWithFallback('comments.require_approval', 'false');
    const status = requireApproval === 'true' ? 'pending' : 'approved';

    const commentUuid = crypto.randomUUID();

    await this.db.insert(comments).values({
      uuid: commentUuid,
      targetType,
      targetUuid: data.targetUuid,
      parentCommentUuid: data.parentCommentUuid || null,
      authorId: data.authorId || null,
      guestName: data.guestName || null,
      guestEmail: data.guestEmail || null,
      body: data.body,
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const [comment] = await this.db
      .select()
      .from(comments)
      .where(eq(comments.uuid, commentUuid))
      .limit(1);

    // 6. Emit events
    await this.sdk.events.emit('comment.created', {
      uuid: comment.uuid,
      targetType,
      targetUuid: comment.targetUuid,
      status: comment.status,
    });

    if (status === 'approved') {
      await this.sdk.events.emit('comment.approved', {
        uuid: comment.uuid,
        targetType,
        targetUuid: comment.targetUuid,
      });
    }

    return comment;
  }

  async moderateComment(commentUuid: string, newStatus: 'approved' | 'rejected' | 'spam') {
    const existing = await this.db
      .select()
      .from(comments)
      .where(eq(comments.uuid, commentUuid))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Comment not found');
    }

    await this.db
      .update(comments)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(comments.uuid, commentUuid));

    const updated = existing[0];
    updated.status = newStatus;

    if (newStatus === 'approved') {
      await this.sdk.events.emit('comment.approved', {
        uuid: commentUuid,
        targetType: updated.targetType,
        targetUuid: updated.targetUuid,
      });
    } else if (newStatus === 'rejected' || newStatus === 'spam') {
      await this.sdk.events.emit('comment.rejected', {
        uuid: commentUuid,
        targetType: updated.targetType,
        targetUuid: updated.targetUuid,
      });
    }

    return { ok: true, status: newStatus };
  }

  async deleteComment(commentUuid: string) {
    const existing = await this.db
      .select()
      .from(comments)
      .where(eq(comments.uuid, commentUuid))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Comment not found');
    }

    const comment = existing[0];

    // Find and delete all recursive children
    await this.deleteRepliesRecursive(commentUuid);

    // Delete comment itself
    await this.db.delete(comments).where(eq(comments.uuid, commentUuid));

    await this.sdk.events.emit('comment.deleted', {
      uuid: commentUuid,
      targetType: comment.targetType,
      targetUuid: comment.targetUuid,
    });

    return { ok: true };
  }

  private async deleteRepliesRecursive(parentUuid: string) {
    const children = await this.db
      .select()
      .from(comments)
      .where(eq(comments.parentCommentUuid, parentUuid));

    for (const child of children) {
      await this.deleteRepliesRecursive(child.uuid);
      await this.db.delete(comments).where(eq(comments.uuid, child.uuid));
    }
  }

  async getAllCommentsForAdmin() {
    return this.db
      .select()
      .from(comments)
      .orderBy(desc(comments.createdAt));
  }
}
