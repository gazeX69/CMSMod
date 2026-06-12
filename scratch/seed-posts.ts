import { db } from '../apps/api/src/database/client.js';
import { contents } from '../apps/api/src/database/schema.js';
import crypto from 'crypto';

async function main() {
  console.log('Inserting 20 test articles...');
  try {
    for (let i = 1; i <= 20; i++) {
      const uuid = crypto.randomUUID();
      await db.insert(contents).values({
        uuid,
        title: `Test Article ${i}`,
        slug: `test-article-${i}`,
        type: 'article',
        status: 'published',
        authorId: null,
        excerpt: `This is the excerpt for test article number ${i}. It is meant to be displayed in post feeds.`,
        body: `<p>This is the main body content for test article number ${i}. It contains some placeholder text to demonstrate the CMS layout and capabilities.</p>`,
        publishedAt: new Date(Date.now() - i * 3600000), // Published at different times
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`Created: test-article-${i}`);
    }
    console.log('Successfully inserted 20 articles.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed test articles:', error);
    process.exit(1);
  }
}

main();
