import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../database/client.js';
import * as schema from '../database/schema.js';
import { requireAuth } from '../hooks/auth.js';
import { pluginEventBus } from './pluginEventBus.js';
import {
  getPluginsWithManifest,
  requirePluginActive,
} from './pluginLifecycleService.js';
import { pluginsDir } from './pluginScanner.js';
import type { PluginManifest } from './pluginTypes.js';
import { createSettingsSdk } from '../settings/settingsService.js';
import { userHasPermission } from '../permissions/permissionService.js';
import { themeSlotRegistry } from './ThemeSlotRegistry.js';
import { capabilityRegistry } from './CapabilityRegistry.js';
import { disposePluginRuntimeScope, getOrCreatePluginRuntimeScope } from './PluginRuntimeScope.js';
import { activateCatalogOwner, catalogRuntimeRegistration, deactivateCatalogOwner, unregisterCatalogOwner } from './PluginRuntimeCatalog.js';
import { pluginApiRegistry } from './PluginApiRegistry.js';
import { publicDocumentContributors, publicRequestInterceptors, publicRouteRegistry, unregisterPublicExtensions, publicContentCompositionPipeline, publicAssetRegistry } from '../public/PublicExtensionRegistries.js';
import { deleteContentMetadata, getContentByUuid, getContentMetadata, listContent, registerContentMetadataDefinition, resolveContentPermalink, setContentMetadata } from '../content/contentService.js';
import type { ContentQuery, MediaAsset, MediaSearchQuery, PageResult, PluginApiRequestContext, PluginApiResponse } from '@modern-cms/plugin-sdk';
import { assertPluginCompatible } from './pluginCompatibility.js';

function resolveBackendEntry(pluginPath: string, manifest: PluginManifest) {
  const entry = manifest.backend?.entry;
  if (!entry) return null;

  const declaredPath = path.resolve(pluginPath, entry);
  const candidates = [
    declaredPath.replace(/\.ts$/, '.js').replace(`${path.sep}server${path.sep}`, `${path.sep}dist${path.sep}`),
    declaredPath.replace(/\.ts$/, '.js'),
    declaredPath,
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function resolveRuntimeEntry(pluginPath: string, manifest: PluginManifest) {
  if (!manifest.runtime?.entry) return null;
  const entry = path.resolve(pluginPath, manifest.runtime.entry);
  if (entry !== pluginPath && !entry.startsWith(`${pluginPath}${path.sep}`)) throw new Error('Plugin runtime entry resolves outside plugin root');
  return fs.existsSync(entry) ? entry : null;
}

function createPluginSdk(pluginKey: string, initiallyActive: boolean) {
  const registerRuntime = (activate: () => { dispose(): void }) => catalogRuntimeRegistration(
    pluginKey,
    () => getOrCreatePluginRuntimeScope(pluginKey).track(activate()),
    initiallyActive,
  );
  return {
    pluginId: pluginKey,
    auth: {
      requireUser: requireAuth,
    },
    events: {
      on: (eventName: string, handler: any) => registerRuntime(() => pluginEventBus.on(pluginKey, eventName, handler)),
      emit: (eventName: string, payload: unknown, version = 1) => pluginEventBus.emit(eventName, payload, pluginKey, version),
    },
    settings: createSettingsSdk(pluginKey),
    permissions: {
      can: (userId: number, permissionKey: string) => userHasPermission(userId, permissionKey),
    },
    content: {
      getByUuid: (uuid: string, options: any = {}) => getContentByUuid(uuid, options),
      list: (query: ContentQuery = {}) => listContent(query, false),
      listPublished: (query: ContentQuery = {}) => listContent(query, true),
      search: (query: ContentQuery & { search: string }) => listContent(query, query.status === 'published'),
      resolvePermalink: async (uuid: string) => {
        const content = await getContentByUuid(uuid);
        return content ? resolveContentPermalink(content) : null;
      },
      metadata: {
        registerDefinition: (definition: any) => registerRuntime(() => registerContentMetadataDefinition(pluginKey, definition)),
        get: (contentUuid: string, options: any = {}) => getContentMetadata(pluginKey, contentUuid, options.visibility),
        set: (contentUuid: string, entries: any[]) => setContentMetadata(pluginKey, contentUuid, entries),
        delete: (contentUuid: string, keys: string[]) => deleteContentMetadata(pluginKey, contentUuid, keys),
      },
    },
    capabilities: {
      registerProvider: (capability: string, provider: unknown, options: any = {}) => registerRuntime(() => capabilityRegistry.register(pluginKey, capability, provider, options)),
      resolve: (capability: string, versionRange?: string) => capabilityRegistry.resolve(capability, versionRange),
    },
    publicDocument: {
      registerContributor: (input: any) => registerRuntime(() => publicDocumentContributors.register(pluginKey, input)),
    },
    publicRoutes: {
      register: (input: any) => registerRuntime(() => publicRouteRegistry.register(pluginKey, input)),
    },
    publicRequests: {
      registerInterceptor: (input: any) => registerRuntime(() => publicRequestInterceptors.register(pluginKey, input)),
    },
    publicSlots: {
      register: (slot: string, resolver: (targetUuid: string) => Promise<string>) => registerRuntime(() => themeSlotRegistry.register(slot, resolver)),
    },
    publicContent: {
      registerBlockRenderer: (type: string, renderer: any) => registerRuntime(() => publicContentCompositionPipeline.blocks.register(pluginKey, type, renderer)),
      registerContentFilter: (id: string, filter: any, priority?: number) => registerRuntime(() => publicContentCompositionPipeline.filters.register(pluginKey, { id, filter, priority })),
    },
    publicAssets: {
      register: (path: string, content: string | Uint8Array, mimeType: string) => registerRuntime(() => publicAssetRegistry.register(pluginKey, path, content, mimeType)),
    },
    apiRoutes: {
      register: (input: { id: string; method?: string; path: string; permission?: string; handler(context: PluginApiRequestContext): PluginApiResponse | Promise<PluginApiResponse> }) => registerRuntime(() => pluginApiRegistry.register(pluginKey, input)),
    },
    media: {
      getByUuid: async (uuid: string) => {
        const provider = capabilityRegistry.resolve<{ getByUuid(uuid: string): Promise<MediaAsset | null> }>('media', '1');
        return provider.ok ? { ok: true as const, value: await provider.value.getByUuid(uuid) } : provider;
      },
      resolve: async (uuid: string, options: Record<string, string> = {}) => {
        const provider = capabilityRegistry.resolve<{ resolve(uuid: string, options?: Record<string, string>): Promise<string> }>('media', '1');
        return provider.ok ? { ok: true as const, value: await provider.value.resolve(uuid, options) } : provider;
      },
      search: async (query: MediaSearchQuery = {}) => {
        const provider = capabilityRegistry.resolve<{ search(query?: MediaSearchQuery): Promise<PageResult<MediaAsset>> }>('media', '1');
        return provider.ok ? { ok: true as const, value: await provider.value.search(query) } : provider;
      },
    },
    database: { orm: db },
    requireActive: async (request: FastifyRequest, reply: FastifyReply) => {
      const isActive = await requirePluginActive(pluginKey);
      if (!isActive) {
        reply.status(403).send({ ok: false, error: `Plugin ${pluginKey} is inactive or unavailable` });
      }
    },
  };
}

export interface RuntimeInfo {
  key: string;
  status: 'loaded' | 'unloaded' | 'broken';
  registeredPrefix?: string;
  loadedAt?: Date;
  error?: string;
  backendRegistered?: boolean;
}

export const pluginRuntimeRegistry = new Map<string, RuntimeInfo>();

export async function loadPluginRuntime(app: FastifyInstance, pluginKey: string) {
  const existing = pluginRuntimeRegistry.get(pluginKey);
  if (existing && existing.status === 'loaded') {
    app.log.info(`Plugin runtime ${pluginKey} is already loaded.`);
    return existing;
  }

  const dbPlugins = await getPluginsWithManifest();
  const plugin = dbPlugins.find((p) => p.key === pluginKey);

  if (!plugin) {
    throw new Error(`Plugin ${pluginKey} not found in system.`);
  }

  // Double check that the status in the database is ACTIVE
  if (plugin.status !== 'ACTIVE') {
    throw new Error(`Cannot load runtime for inactive plugin: ${pluginKey}`);
  }
  assertPluginCompatible(pluginKey, plugin.manifest?.compatibility);

  const manifest = plugin.manifest as PluginManifest;
  if (manifest.runtime?.entry) {
    if (!existing?.backendRegistered) {
      const pluginPath = path.join(pluginsDir, plugin.key);
      const runtimeEntry = resolveRuntimeEntry(pluginPath, manifest);
      if (!runtimeEntry) throw new Error(`Runtime entry not found: ${manifest.runtime.entry}`);
      const runtimeModule = await import(`${pathToFileURL(runtimeEntry).href}?v=${Date.now()}`);
      const activate = runtimeModule.activate || runtimeModule.default;
      if (typeof activate !== 'function') throw new Error('Runtime entry must export activate(sdk)');
      const result = await activate(createPluginSdk(pluginKey, true));
      if (result?.dispose) getOrCreatePluginRuntimeScope(pluginKey).track(result);
      pluginRuntimeRegistry.set(pluginKey, { key: pluginKey, status: 'loaded', loadedAt: new Date(), backendRegistered: true });
      return pluginRuntimeRegistry.get(pluginKey)!;
    }
    activateCatalogOwner(pluginKey);
    const info: RuntimeInfo = { ...existing, status: 'loaded', loadedAt: new Date() };
    pluginRuntimeRegistry.set(pluginKey, info);
    return info;
  }

  if (!existing?.backendRegistered) throw new Error(`Plugin ${pluginKey} was discovered after API boot; restart the API once to register its backend routes.`);
  activateCatalogOwner(pluginKey);
  const info: RuntimeInfo = { ...existing, status: 'loaded', loadedAt: new Date() };
  pluginRuntimeRegistry.set(pluginKey, info);
  app.log.info(`Activated plugin runtime: ${plugin.key}`);
  return info;
}

export function unloadPluginRuntime(pluginKey: string) {
  const existing = pluginRuntimeRegistry.get(pluginKey);
  if (existing) {
    existing.status = 'unloaded';
  }
  pluginEventBus.unregisterOwner(pluginKey);
  capabilityRegistry.unregisterOwner(pluginKey);
  unregisterPublicExtensions(pluginKey);
  pluginApiRegistry.unregisterOwner(pluginKey);
  deactivateCatalogOwner(pluginKey);
  disposePluginRuntimeScope(pluginKey);
}

export function resetPluginRuntime(pluginKey: string) {
  unloadPluginRuntime(pluginKey);
  unregisterCatalogOwner(pluginKey);
  pluginRuntimeRegistry.delete(pluginKey);
}

export async function loadActivePluginRuntimes(app: FastifyInstance) {
  const plugins = await getPluginsWithManifest();

  for (const plugin of plugins) {
    if ((!plugin.manifest?.backend?.entry && !plugin.manifest?.runtime?.entry) || plugin.status === 'BROKEN') continue;

    try {
      const manifest = plugin.manifest as PluginManifest;
      assertPluginCompatible(plugin.key, manifest.compatibility);
      if (manifest.runtime?.entry) {
        if (plugin.status === 'ACTIVE') await loadPluginRuntime(app, plugin.key);
        else pluginRuntimeRegistry.set(plugin.key, { key: plugin.key, status: 'unloaded', backendRegistered: false });
        continue;
      }
      const backend = manifest.backend!;
      const pluginPath = path.join(pluginsDir, plugin.key);
      const backendEntry = resolveBackendEntry(pluginPath, manifest);
      if (!backendEntry) throw new Error(`Backend entry not found: ${backend.entry}`);
      const pluginModule = await import(pathToFileURL(backendEntry).href);
      const registerFn = pluginModule.default || pluginModule.routes;
      if (typeof registerFn !== 'function') throw new Error(`Backend entry does not export a route registration function: ${backendEntry}`);
      const namespacePrefix = backend.namespace || `/api/${plugin.key}`;
      const active = plugin.status === 'ACTIVE';
      app.register(registerFn, {
        prefix: namespacePrefix,
        plugin: { key: plugin.key, manifest },
        sdk: createPluginSdk(plugin.key, active),
      });
      pluginRuntimeRegistry.set(plugin.key, {
        key: plugin.key,
        status: active ? 'loaded' : 'unloaded',
        registeredPrefix: namespacePrefix,
        loadedAt: active ? new Date() : undefined,
        backendRegistered: true,
      });
    } catch (error) {
      app.log.error(error, `Failed to register plugin backend: ${plugin.key}`);
      pluginRuntimeRegistry.set(plugin.key, { key: plugin.key, status: 'broken', error: error instanceof Error ? error.message : String(error) });
    }
  }
}
