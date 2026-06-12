import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const manager = read('./src/pages/ContentManager.tsx');
const mediaPicker = read('../../plugins/media-library/admin/MediaPicker.tsx');
const schema = read('../api/src/database/schema.ts');
const posts = read('../api/src/routes/posts.ts');
const pages = read('../api/src/routes/pages.ts');
const publicWebsite = read('../api/src/public/publicWebsiteService.ts');

const checks = [
  [manager.includes('featuredImage') && manager.includes('openFeaturedImagePicker'), 'Editor must expose Featured Image state and picker.'],
  [manager.includes("source: 'media-library'") && manager.includes("source: 'external'"), 'Editor must support URL and Media Library sources.'],
  [manager.includes('Replace') && manager.includes('Remove'), 'Editor must allow replacing and removing a Featured Image.'],
  [mediaPicker.includes('acceptedMimeTypes') && mediaPicker.includes('initialMimeFilter'), 'Media picker must honor image-only requests.'],
  [schema.includes('featuredImageUrl') && schema.includes('featuredImageAssetUuid'), 'Core schema must persist Featured Image data.'],
  [posts.includes('featuredImageUrl: body.featuredImage?.url') && pages.includes('featuredImageUrl: body.featuredImage?.url'), 'Posts and pages APIs must persist Featured Images.'],
  [publicWebsite.includes('featuredImage') && publicWebsite.includes("image: content?.featuredImage?.url"), 'Public renderer must expose Featured Images to themes and SEO.'],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  console.error(`Featured Image checks failed:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Featured Image integration checks passed.');
