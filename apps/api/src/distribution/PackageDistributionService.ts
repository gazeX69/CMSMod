import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import semver from 'semver';
import { eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import { packageOperations, packageVersions, plugins } from '../database/schema.js';
import { applyPluginPackageVersion, getPluginsWithManifest, rollbackPluginMigrationsNotInPackage } from '../plugins/pluginLifecycleService.js';
import type { PluginManifest } from '../plugins/pluginTypes.js';
import type { FastifyInstance } from 'fastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');
const pluginsDir = path.join(rootDir, 'plugins');
const stagingDir = path.join(pluginsDir, '.distribution-staging');
const backupDir = path.join(pluginsDir, '.distribution-backups');
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 200 * 1024 * 1024;
const MAX_ENTRIES = 2000;

type InstallOptions = {
  source: 'local' | 'remote' | 'private';
  allowUnsigned?: boolean;
  expectedChecksum?: string;
  actorUserId?: number;
  activate?: boolean;
  app?: FastifyInstance;
};

type VerifiedPackage = {
  manifest: PluginManifest & { package: NonNullable<PluginManifest['package']> };
  archiveChecksum: string;
  contentDigest: string;
  signatureStatus: 'verified' | 'unsigned-local';
  zip: AdmZip;
};

function safePackageId(value: string) {
  if (!/^[a-z0-9][a-z0-9-]{1,127}$/.test(value)) throw new Error(`Invalid package id: ${value}`);
  return value;
}

function safeEntryName(value: string) {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`Unsafe archive entry: ${value}`);
  }
  return normalized;
}

function trustedPublisherKeys() {
  try {
    return JSON.parse(process.env.MARKETPLACE_TRUSTED_PUBLISHERS || '{}') as Record<string, string>;
  } catch {
    throw new Error('MARKETPLACE_TRUSTED_PUBLISHERS must be a JSON object');
  }
}

function readManifest(zip: AdmZip) {
  const candidates = zip.getEntries().filter((entry) => !entry.isDirectory && safeEntryName(entry.entryName).split('/').length <= 2 && safeEntryName(entry.entryName).endsWith('plugin.json'));
  if (candidates.length !== 1) throw new Error('Package must contain exactly one root plugin.json');
  return JSON.parse(candidates[0].getData().toString('utf8')) as PluginManifest;
}

function computeContentDigest(zip: AdmZip) {
  const hash = crypto.createHash('sha256');
  const entries = zip.getEntries()
    .filter((entry) => !entry.isDirectory && !safeEntryName(entry.entryName).endsWith('plugin.json'))
    .sort((a, b) => a.entryName.localeCompare(b.entryName));
  for (const entry of entries) {
    hash.update(safeEntryName(entry.entryName));
    hash.update('\0');
    hash.update(entry.getData());
    hash.update('\0');
  }
  return hash.digest('hex');
}

function verifySignature(manifest: PluginManifest, contentDigest: string, options: InstallOptions) {
  const signature = manifest.package?.signature;
  if (!signature) {
    if (options.source !== 'local' || !options.allowUnsigned) throw new Error('Unsigned packages are allowed only for explicitly approved local installs');
    return 'unsigned-local' as const;
  }
  const publicKey = trustedPublisherKeys()[signature.keyId];
  if (!publicKey) throw new Error(`Publisher key is not trusted: ${signature.keyId}`);
  const payload = Buffer.from(`${manifest.id}\n${manifest.version}\n${contentDigest}`, 'utf8');
  const valid = crypto.verify(null, payload, publicKey, Buffer.from(signature.value, 'base64'));
  if (!valid) throw new Error('Package signature verification failed');
  return 'verified' as const;
}

export function verifyPackageArchive(archive: Buffer, options: InstallOptions): VerifiedPackage {
  if (archive.length === 0 || archive.length > MAX_ARCHIVE_BYTES) throw new Error('Package archive size is invalid');
  const archiveChecksum = crypto.createHash('sha256').update(archive).digest('hex');
  if (options.expectedChecksum && options.expectedChecksum.toLowerCase() !== archiveChecksum) throw new Error('Package archive checksum mismatch');
  const zip = new AdmZip(archive);
  const entries = zip.getEntries();
  if (entries.length === 0 || entries.length > MAX_ENTRIES) throw new Error('Package archive entry count is invalid');
  let expandedBytes = 0;
  for (const entry of entries) {
    safeEntryName(entry.entryName);
    expandedBytes += entry.header.size;
    const unixMode = (entry.attr >>> 16) & 0o170000;
    if (unixMode === 0o120000) throw new Error(`Symbolic links are not allowed: ${entry.entryName}`);
  }
  if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error('Expanded package exceeds safety limit');
  const manifest = readManifest(zip);
  safePackageId(manifest.id);
  if (!semver.valid(manifest.version)) throw new Error('Package version must use Semantic Versioning');
  if (!manifest.package || manifest.package.type !== 'plugin') throw new Error('Distribution Layer currently accepts Package V2 plugin archives only');
  if (manifest.package.sdkVersion && !semver.satisfies('0.1.0', manifest.package.sdkVersion)) throw new Error(`Package requires Marketplace SDK ${manifest.package.sdkVersion}`);
  const contentDigest = computeContentDigest(zip);
  if (manifest.package.integrity?.digest && manifest.package.integrity.digest.toLowerCase() !== contentDigest) throw new Error('Package content integrity mismatch');
  const signatureStatus = verifySignature(manifest, contentDigest, options);
  return { manifest: manifest as VerifiedPackage['manifest'], archiveChecksum, contentDigest, signatureStatus, zip };
}

function extractVerifiedPackage(pkg: VerifiedPackage, target: string) {
  fs.mkdirSync(target, { recursive: true });
  const names = pkg.zip.getEntries().map((entry) => safeEntryName(entry.entryName));
  const commonRoot = names.every((name) => name.startsWith(`${pkg.manifest.id}/`)) ? `${pkg.manifest.id}/` : '';
  for (const entry of pkg.zip.getEntries()) {
    const safeName = safeEntryName(entry.entryName);
    const relative = commonRoot ? safeName.slice(commonRoot.length) : safeName;
    if (!relative) continue;
    const destination = path.resolve(target, relative);
    if (destination !== target && !destination.startsWith(`${target}${path.sep}`)) throw new Error(`Unsafe extraction target: ${relative}`);
    if (entry.isDirectory) fs.mkdirSync(destination, { recursive: true });
    else {
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, entry.getData(), { flag: 'wx' });
    }
  }
}

function packageMigrationNames(packagePath: string, manifest: PluginManifest) {
  if (!manifest.migrations?.directory) return [];
  const directory = path.resolve(packagePath, manifest.migrations.directory);
  if (!directory.startsWith(`${packagePath}${path.sep}`) || !fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql')).sort();
}

async function assertDependencies(manifest: PluginManifest) {
  const installed = await getPluginsWithManifest();
  for (const dependency of manifest.dependencies || []) {
    const requirement = typeof dependency === 'string' ? { id: dependency } : dependency;
    const match = installed.find((plugin) => plugin.key === requirement.id && ['INSTALLED', 'ACTIVE', 'INACTIVE'].includes(plugin.status));
    if (!match) {
      if (!requirement.optional) throw new Error(`Missing installed dependency: ${requirement.id}`);
      continue;
    }
    if (requirement.version && !semver.satisfies(match.version, requirement.version)) throw new Error(`Dependency ${requirement.id} requires ${requirement.version}, installed ${match.version}`);
  }
}

export async function installPackageArchive(archive: Buffer, options: InstallOptions) {
  const operationId = crypto.randomUUID();
  const pkg = verifyPackageArchive(archive, options);
  await db.insert(packageOperations).values({
    id: operationId,
    packageId: pkg.manifest.id,
    operation: 'install-or-update',
    source: options.source,
    toVersion: pkg.manifest.version,
    status: 'RUNNING',
    actorUserId: options.actorUserId || null,
    detailsJson: JSON.stringify({ archiveChecksum: pkg.archiveChecksum, contentDigest: pkg.contentDigest }),
  });

  const stage = path.join(stagingDir, operationId);
  const target = path.join(pluginsDir, pkg.manifest.id);
  const backup = path.join(backupDir, pkg.manifest.id, operationId);
  let previousVersion: string | null = null;
  let swapped = false;
  let wasActive = false;
  let databaseDowngraded = false;
  try {
    await assertDependencies(pkg.manifest);
    extractVerifiedPackage(pkg, stage);
    const stagedManifest = JSON.parse(fs.readFileSync(path.join(stage, 'plugin.json'), 'utf8')) as PluginManifest;
    if (stagedManifest.id !== pkg.manifest.id || stagedManifest.version !== pkg.manifest.version) throw new Error('Staged manifest identity changed');
    const existingRows = await db.select().from(plugins).where(eq(plugins.key, pkg.manifest.id)).limit(1);
    previousVersion = existingRows[0]?.version || null;
    if (previousVersion && semver.eq(previousVersion, pkg.manifest.version)) throw new Error(`Package ${pkg.manifest.id}@${pkg.manifest.version} is already installed`);
    if (previousVersion && semver.gt(previousVersion, pkg.manifest.version) && !pkg.manifest.package.rollback?.supported) {
      throw new Error('Downgrade requires package.rollback.supported=true');
    }
    if (previousVersion && semver.gt(previousVersion, pkg.manifest.version)) {
      await rollbackPluginMigrationsNotInPackage(pkg.manifest.id, packageMigrationNames(stage, stagedManifest));
      databaseDowngraded = true;
    }
    wasActive = existingRows[0]?.status === 'ACTIVE';
    if (wasActive) {
      const { resetPluginRuntime } = await import('../plugins/pluginRuntimeLoader.js');
      resetPluginRuntime(pkg.manifest.id);
    }
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (fs.existsSync(target)) fs.renameSync(target, backup);
    fs.renameSync(stage, target);
    swapped = true;
    const lifecycle = await applyPluginPackageVersion(pkg.manifest.id);
    if ((wasActive || options.activate) && options.app) {
      const { activatePlugin } = await import('../plugins/pluginLifecycleService.js');
      await activatePlugin(pkg.manifest.id, options.app);
    }
    const versionRecord = {
      packageId: pkg.manifest.id,
      packageType: pkg.manifest.package.type,
      version: pkg.manifest.version,
      publisherId: pkg.manifest.package.publisher?.id || null,
      source: options.source,
      archiveChecksum: pkg.archiveChecksum,
      signatureStatus: pkg.signatureStatus,
      installPath: target,
      manifestJson: JSON.stringify(pkg.manifest),
    };
    await db.insert(packageVersions).values(versionRecord).onDuplicateKeyUpdate({ set: versionRecord });
    await db.update(packageOperations).set({ status: 'COMPLETED', fromVersion: previousVersion, completedAt: new Date() }).where(eq(packageOperations.id, operationId));
    return { ok: true, operationId, packageId: pkg.manifest.id, version: pkg.manifest.version, previousVersion, lifecycle };
  } catch (error) {
    if (swapped && fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    if (fs.existsSync(backup)) fs.renameSync(backup, target);
    if (databaseDowngraded && fs.existsSync(target)) {
      try { await applyPluginPackageVersion(pkg.manifest.id); } catch { /* operation remains failed and auditable */ }
    }
    if (fs.existsSync(stage)) fs.rmSync(stage, { recursive: true, force: true });
    await db.update(packageOperations).set({ status: 'FAILED', fromVersion: previousVersion, error: error instanceof Error ? error.message : String(error), completedAt: new Date() }).where(eq(packageOperations.id, operationId));
    if (wasActive && options.app) {
      try {
        const { loadPluginRuntime } = await import('../plugins/pluginRuntimeLoader.js');
        await loadPluginRuntime(options.app, pkg.manifest.id);
      } catch {
        // The failed operation remains auditable; recovery can be retried explicitly.
      }
    }
    throw error;
  }
}

export async function rollbackPackageOperation(operationId: string, actorUserId: number | undefined, app: FastifyInstance) {
  const rows = await db.select().from(packageOperations).where(eq(packageOperations.id, operationId)).limit(1);
  const original = rows[0];
  if (!original || original.status !== 'COMPLETED' || !original.packageId || !original.fromVersion) throw new Error('Operation is not rollback eligible');
  const packageId = safePackageId(original.packageId);
  const backup = path.join(backupDir, packageId, operationId);
  if (!fs.existsSync(backup)) throw new Error('Rollback backup is unavailable');
  const rollbackId = crypto.randomUUID();
  const target = path.join(pluginsDir, packageId);
  const displaced = path.join(backupDir, packageId, rollbackId);
  const pluginRows = await db.select().from(plugins).where(eq(plugins.key, packageId)).limit(1);
  const wasActive = pluginRows[0]?.status === 'ACTIVE';
  await db.insert(packageOperations).values({
    id: rollbackId,
    packageId,
    operation: 'rollback',
    source: original.source,
    fromVersion: pluginRows[0]?.version || original.toVersion,
    toVersion: original.fromVersion,
    status: 'RUNNING',
    actorUserId: actorUserId || null,
    detailsJson: JSON.stringify({ rollbackOf: operationId }),
  });
  try {
    const { resetPluginRuntime } = await import('../plugins/pluginRuntimeLoader.js');
    if (wasActive) resetPluginRuntime(packageId);
    const targetManifest = JSON.parse(fs.readFileSync(path.join(backup, 'plugin.json'), 'utf8')) as PluginManifest;
    await rollbackPluginMigrationsNotInPackage(packageId, packageMigrationNames(backup, targetManifest));
    fs.mkdirSync(path.dirname(displaced), { recursive: true });
    if (fs.existsSync(target)) fs.renameSync(target, displaced);
    fs.renameSync(backup, target);
    const lifecycle = await applyPluginPackageVersion(packageId);
    if (wasActive) {
      const { activatePlugin } = await import('../plugins/pluginLifecycleService.js');
      await activatePlugin(packageId, app);
    }
    await db.update(packageOperations).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(packageOperations.id, rollbackId));
    return { ok: true, operationId: rollbackId, packageId, version: original.fromVersion, lifecycle };
  } catch (error) {
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    if (fs.existsSync(displaced)) fs.renameSync(displaced, target);
    if (fs.existsSync(target)) {
      try { await applyPluginPackageVersion(packageId); } catch { /* operation remains failed and auditable */ }
    }
    await db.update(packageOperations).set({ status: 'FAILED', error: error instanceof Error ? error.message : String(error), completedAt: new Date() }).where(eq(packageOperations.id, rollbackId));
    throw error;
  }
}
