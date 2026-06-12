import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { eq } from 'drizzle-orm';
import { buildApp } from './app.js';
import { db } from './database/client.js';
import { packageOperations, packageVersions, pluginEvents, pluginMigrations, pluginPermissions, plugins, settings } from './database/schema.js';
import { installPackageArchive, rollbackPackageOperation, verifyPackageArchive } from './distribution/PackageDistributionService.js';
import { pluginApiRegistry } from './plugins/PluginApiRegistry.js';
import { resetPluginRuntime } from './plugins/pluginRuntimeLoader.js';

const fixtureId = 'distribution-test-fixture';
const root = path.resolve(process.cwd(), '../..');

function contentDigest(files: Record<string, string>) {
  const hash = crypto.createHash('sha256');
  for (const name of Object.keys(files).sort()) {
    hash.update(`${fixtureId}/${name}`);
    hash.update('\0');
    hash.update(files[name]);
    hash.update('\0');
  }
  return hash.digest('hex');
}

function makeArchive(version: string, responseVersion = version, signing?: { keyId: string; privateKey: crypto.KeyObject }) {
  const files = {
    'runtime.mjs': `export default async function activate(sdk) { sdk.apiRoutes.register({ id: 'ping', path: '/ping', handler: () => ({ body: { version: '${responseVersion}' } }) }); }`,
    'admin.mjs': `export default { id: '${fixtureId}', component: function DistributionFixture(){ return null; } };`,
  };
  const digest = contentDigest(files);
  const manifest: any = {
    id: fixtureId,
    name: 'Distribution Test Fixture',
    version,
    compatibility: '^0.1.0',
    layer: 'plugin',
    package: {
      type: 'plugin',
      sdkVersion: '^0.1.0',
      publisher: { id: 'local-tests', name: 'Local Tests' },
      integrity: { algorithm: 'sha256', digest },
      rollback: { supported: true, migrations: 'paired-down-files' },
    },
    runtime: { entry: 'runtime.mjs', format: 'esm' },
    admin: { menu: 'Distribution Fixture', route: 'distribution-fixture', bundle: 'admin.mjs', runtime: 'distributed' },
  };
  if (signing) {
    manifest.package.signature = {
      algorithm: 'ed25519',
      keyId: signing.keyId,
      value: crypto.sign(null, Buffer.from(`${fixtureId}\n${version}\n${digest}`), signing.privateKey).toString('base64'),
    };
  }
  const zip = new AdmZip();
  Object.entries(files).forEach(([name, value]) => zip.addFile(`${fixtureId}/${name}`, Buffer.from(value)));
  zip.addFile(`${fixtureId}/plugin.json`, Buffer.from(JSON.stringify(manifest, null, 2)));
  return zip.toBuffer();
}

async function cleanup() {
  resetPluginRuntime(fixtureId);
  await db.delete(packageVersions).where(eq(packageVersions.packageId, fixtureId));
  await db.delete(packageOperations).where(eq(packageOperations.packageId, fixtureId));
  await db.delete(pluginPermissions).where(eq(pluginPermissions.pluginKey, fixtureId));
  await db.delete(pluginEvents).where(eq(pluginEvents.pluginKey, fixtureId));
  await db.delete(pluginMigrations).where(eq(pluginMigrations.pluginKey, fixtureId));
  await db.delete(settings).where(eq(settings.group, fixtureId));
  await db.delete(plugins).where(eq(plugins.key, fixtureId));
  fs.rmSync(path.join(root, 'plugins', fixtureId), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'plugins', '.distribution-backups', fixtureId), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'plugins', '.distribution-staging'), { recursive: true, force: true });
}

async function run() {
  await cleanup();
  const v1 = makeArchive('1.0.0');
  verifyPackageArchive(v1, { source: 'local', allowUnsigned: true });
  let rejectedUnsignedRemote = false;
  try { verifyPackageArchive(v1, { source: 'remote' }); } catch { rejectedUnsignedRemote = true; }
  if (!rejectedUnsignedRemote) throw new Error('Unsigned remote package was accepted');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  process.env.MARKETPLACE_TRUSTED_PUBLISHERS = JSON.stringify({
    'local-test-key': publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  });
  const signed = verifyPackageArchive(makeArchive('2.0.0', '2.0.0', { keyId: 'local-test-key', privateKey }), { source: 'remote' });
  if (signed.signatureStatus !== 'verified') throw new Error('Signed remote package was not verified');

  const unsafe = new AdmZip();
  unsafe.addFile('../outside.txt', Buffer.from('unsafe'));
  let rejectedUnsafePath = false;
  try { verifyPackageArchive(unsafe.toBuffer(), { source: 'local', allowUnsigned: true }); } catch { rejectedUnsafePath = true; }
  if (!rejectedUnsafePath) throw new Error('Unsafe archive path was accepted');

  const app = buildApp();
  await app.ready();
  try {
    const installed = await installPackageArchive(v1, { source: 'local', allowUnsigned: true, activate: true, app });
    const v1Route = pluginApiRegistry.resolve(fixtureId, 'GET', '/ping');
    if (!v1Route || ((await v1Route.route.handler({} as any)).body as any)?.version !== '1.0.0') throw new Error('Runtime V1 did not activate dynamically');

    const updated = await installPackageArchive(makeArchive('1.1.0'), { source: 'local', allowUnsigned: true, app });
    const v2Route = pluginApiRegistry.resolve(fixtureId, 'GET', '/ping');
    if (!v2Route || ((await v2Route.route.handler({} as any)).body as any)?.version !== '1.1.0') throw new Error('Runtime V2 did not reload dynamically');

    await rollbackPackageOperation(updated.operationId, undefined, app);
    const rolledBackRoute = pluginApiRegistry.resolve(fixtureId, 'GET', '/ping');
    if (!rolledBackRoute || ((await rolledBackRoute.route.handler({} as any)).body as any)?.version !== '1.0.0') throw new Error('Runtime rollback did not restore V1');
    if (!installed.operationId) throw new Error('Install operation was not recorded');
  } finally {
    await app.close();
    await cleanup();
  }
  console.log('Distribution Layer security and lifecycle tests passed.');
  process.exit(0);
}

run().catch(async (error) => {
  console.error(error);
  await cleanup();
  process.exit(1);
});
