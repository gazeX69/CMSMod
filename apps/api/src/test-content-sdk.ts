import assert from 'node:assert/strict';
import { db } from './database/client.js';
import { contents } from './database/schema.js';
import { deleteContentMetadata, getContentByUuid, getContentMetadata, listContent, registerContentMetadataDefinition, resolveContentPermalink, setContentMetadata } from './content/contentService.js';

async function main() {
  const rows = await db.select({ uuid: contents.uuid }).from(contents).limit(1);
  if (!rows[0]) {
    process.stdout.write('Content SDK acceptance skipped: database has no content fixture\n');
    process.exit(0);
  }

  const owner = 'platform-acceptance';
  const key = 'contract_value';
  const registration = registerContentMetadataDefinition(owner, { key, type: 'string', visibility: 'admin', maxLength: 64 });
  try {
    const content = await getContentByUuid(rows[0].uuid, { includeBody: true });
    assert.ok(content);
    assert.ok(await resolveContentPermalink(content!));
    const page = await listContent({ page: 1, limit: 1 });
    assert.equal(page.items.length, 1);
    await setContentMetadata(owner, rows[0].uuid, [{ key, value: 'ready' }]);
    const metadata = await getContentMetadata(owner, rows[0].uuid, 'admin');
    assert.equal(metadata.find((entry) => entry.key === `${owner}.${key}`)?.value, 'ready');
    await assert.rejects(setContentMetadata(owner, rows[0].uuid, [{ key, value: 42 }]));
    process.stdout.write('Content SDK acceptance passed\n');
  } finally {
    await deleteContentMetadata(owner, rows[0].uuid, [key]);
    registration.dispose();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
