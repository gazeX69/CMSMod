import { renderPublicMediaBlock } from './routes.js';

const base = 'data-media-uuid="asset-uuid" data-original-name="example" data-size="1024"';
const checks = [
  [renderPublicMediaBlock(`${base} data-mime-type="video/mp4"`).includes('<video controls'), 'video renderer'],
  [renderPublicMediaBlock(`${base} data-mime-type="audio/mpeg"`).includes('<audio controls'), 'audio renderer'],
  [renderPublicMediaBlock(`${base} data-mime-type="application/pdf" data-display="embed"`).includes('<object'), 'PDF renderer'],
  [renderPublicMediaBlock(`${base} data-mime-type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"`).includes('download'), 'document renderer'],
];

const failures = checks.filter(([passed]) => !passed).map(([, name]) => name);
if (failures.length) throw new Error(`Universal media render failures: ${failures.join(', ')}`);
console.log('Media Library public render checks passed.');
