import { db } from '../database/client.js';
import { contents, contentRevisions } from '../database/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function createRevisionSnapshot(contentId: number, createdBy: number) {
  // Fetch latest content state
  const content = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  if (content.length === 0) return;

  const row = content[0];

  // Get current highest revision number
  const latestRev = await db
    .select({ revisionNumber: contentRevisions.revisionNumber })
    .from(contentRevisions)
    .where(eq(contentRevisions.contentId, contentId))
    .orderBy(desc(contentRevisions.revisionNumber))
    .limit(1);

  const nextRevNumber = latestRev.length > 0 ? latestRev[0].revisionNumber + 1 : 1;

  // Insert revision
  await db.insert(contentRevisions).values({
    contentId,
    title: row.title,
    excerpt: row.excerpt || null,
    body: row.body || null,
    status: row.status,
    snapshotJson: JSON.stringify({
      featuredImage: row.featuredImageUrl ? {
        url: row.featuredImageUrl,
        assetUuid: row.featuredImageAssetUuid,
        alt: row.featuredImageAlt || '',
        source: row.featuredImageSource || 'external',
      } : null,
    }),
    revisionNumber: nextRevNumber,
    createdBy,
  });
}
