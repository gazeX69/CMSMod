import assert from 'node:assert/strict';
import { analyzeSeo } from './analyzer.js';

const strong = analyzeSeo({
  title: 'Modern CMS SEO Guide for Growing Websites',
  description: 'Learn how a modern CMS SEO workflow improves metadata, content structure, discoverability, and search appearance for growing websites.',
  focusKeyword: 'modern CMS SEO',
  slug: 'modern-cms-seo-guide',
  bodyHtml: `<p>Modern CMS SEO helps teams publish useful content.</p><h2>Modern CMS SEO workflow</h2><p>${'Useful content '.repeat(320)}</p><a href="/guide">Guide</a><img src="/x.jpg" alt="Modern CMS SEO dashboard">`,
  robots: 'index,follow',
});

assert.ok(strong.score >= 80);
assert.equal(strong.grade, 'good');
assert.ok(analyzeSeo({ title: '', description: '', focusKeyword: '', slug: '', bodyHtml: '' }).score < 30);
process.stdout.write('SEO analyzer tests passed\n');
