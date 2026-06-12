import type {
  AdminPlugin,
  AdminRuntimeSdk,
  CapabilityResult,
  EditorDocumentContext,
  EditorPublishCheckResult,
  EditorSaveContext,
  MediaAsset,
} from '@modern-cms/plugin-sdk';
import { editorRegistry } from '../editor/registry/editorRegistry';

type Disposable = { dispose(): void };
type DisposableOwner = <T extends Disposable>(registration: T) => T;
type SaveHandler = (context: EditorSaveContext) => void | Promise<void>;
type PublishCheck = (context: EditorDocumentContext) => EditorPublishCheckResult | Promise<EditorPublishCheckResult>;

const providers = new Map<string, { owner: string; value: unknown }>();
const savedListeners = new Map<string, Set<SaveHandler>>();
const supplementalSaves = new Map<string, Set<SaveHandler>>();
const publishChecks = new Map<string, Set<PublishCheck>>();
let documentContext: EditorDocumentContext | null = null;
let mediaPickerHost: ((options?: { mimeTypes?: string[]; multiple?: boolean }) => Promise<MediaAsset | MediaAsset[] | null>) | null = null;

function disposable(dispose: () => void): Disposable { return { dispose }; }

export function setEditorDocumentContext(context: EditorDocumentContext | null) { documentContext = context; }

export function setAdminMediaPickerHost(host: typeof mediaPickerHost) { mediaPickerHost = host; }

export function resolveAdminCapability<T>(capability: string): T | undefined {
  return providers.get(capability)?.value as T | undefined;
}

export async function notifyEditorSaved(context: EditorSaveContext) {
  for (const handlers of savedListeners.values()) for (const handler of handlers) await handler(context);
  const failures: string[] = [];
  for (const [owner, handlers] of supplementalSaves) {
    for (const handler of handlers) {
      try { await handler(context); } catch (error) { failures.push(`${owner}: ${error instanceof Error ? error.message : String(error)}`); }
    }
  }
  return failures;
}

export async function runEditorPublishChecks(context: EditorDocumentContext) {
  const results: Array<EditorPublishCheckResult & { owner: string }> = [];
  for (const [owner, checks] of publishChecks) {
    for (const check of checks) {
      try { results.push({ ...(await check(context)), owner }); }
      catch (error) { results.push({ status: 'warning', message: error instanceof Error ? error.message : String(error), owner }); }
    }
  }
  return results;
}

export function createAdminRuntimeSdk(pluginId: string, own: DisposableOwner = (registration) => registration): AdminRuntimeSdk {
  const addOwned = <T>(map: Map<string, Set<T>>, value: T) => {
    const values = map.get(pluginId) || new Set<T>();
    values.add(value);
    map.set(pluginId, values);
    return own(disposable(() => {
      values.delete(value);
      if (values.size === 0) map.delete(pluginId);
    }));
  };

  return {
    pluginId,
    editor: {
      inspector: {
        register: (definition) => {
          const id = `${pluginId}:${definition.id}`;
          editorRegistry.inspectorSections.register({ ...definition, id, mode: 'document' });
          return own(disposable(() => editorRegistry.inspectorSections.unregister?.(id)));
        },
      },
      sidebar: {
        register: (definition) => {
          const id = `${pluginId}:${definition.id}`;
          editorRegistry.sidebars.register({ ...definition, id, icon: definition.icon || 'panel' });
          return own(disposable(() => editorRegistry.sidebars.unregister?.(id)));
        },
      },
      insertSource: {
        register: (definition) => {
          editorRegistry.insertSources.register({ ...definition, pluginId });
          return own(disposable(() => editorRegistry.insertSources.unregister?.(definition.id)));
        },
      },
      node: {
        register: (definition) => {
          editorRegistry.nodes.register(definition as any);
          return own(disposable(() => editorRegistry.nodes.unregister?.(definition.name)));
        },
      },
      command: {
        register: (definition) => {
          editorRegistry.commands.register(definition as any);
          return own(disposable(() => editorRegistry.commands.unregister?.(definition.name)));
        },
      },
      propertyPanel: {
        register: (definition) => {
          editorRegistry.propertyPanels.register(definition as any);
          return own(disposable(() => editorRegistry.propertyPanels.unregister?.(definition.nodeType)));
        },
      },
      document: {
        getContext: () => documentContext,
        onSaved: (listener) => addOwned(savedListeners, listener),
        registerSupplementalSave: (handler) => addOwned(supplementalSaves, handler),
      },
      publish: { registerCheck: (check) => addOwned(publishChecks, check) },
    },
    media: {
      openPicker: async (options) => mediaPickerHost ? mediaPickerHost(options) : null,
    },
    capabilities: {
      registerProvider: (capability, provider) => {
        if (providers.has(capability) && providers.get(capability)?.owner !== pluginId) throw new Error(`Admin capability ${capability} already registered`);
        providers.set(capability, { owner: pluginId, value: provider });
        return own(disposable(() => { if (providers.get(capability)?.owner === pluginId) providers.delete(capability); }));
      },
      resolve: <T,>(capability: string): CapabilityResult<T> => {
        const provider = providers.get(capability);
        return provider ? { ok: true, value: provider.value as T } : { ok: false, code: 'CAPABILITY_UNAVAILABLE', capability, message: `Capability ${capability} is unavailable` };
      },
    },
  };
}

export class AdminPluginRuntimeScope {
  private registrations = new Set<Disposable>();
  private disposed = false;

  constructor(public readonly pluginId: string) {}

  own = <T extends Disposable>(registration: T): T => {
    if (this.disposed) {
      registration.dispose();
      return registration;
    }

    let active = true;
    const tracked = {
      dispose: () => {
        if (!active) return;
        active = false;
        this.registrations.delete(tracked);
        registration.dispose();
      },
    } as T;
    this.registrations.add(tracked);
    return tracked;
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const registration of Array.from(this.registrations).reverse()) registration.dispose();
    this.registrations.clear();
  }
}

const adminPluginScopes = new Map<string, AdminPluginRuntimeScope>();
let runtimeSync = Promise.resolve();

async function reconcileAdminPlugins(plugins: AdminPlugin[], activePluginIds: Set<string>) {
  for (const [pluginId, scope] of adminPluginScopes) {
    if (!activePluginIds.has(pluginId)) {
      scope.dispose();
      adminPluginScopes.delete(pluginId);
    }
  }

  for (const plugin of plugins) {
    if (!activePluginIds.has(plugin.id) || adminPluginScopes.has(plugin.id)) continue;

    const scope = new AdminPluginRuntimeScope(plugin.id);
    adminPluginScopes.set(plugin.id, scope);
    try {
      await plugin.register?.(createAdminRuntimeSdk(plugin.id, scope.own));
    } catch (error) {
      scope.dispose();
      adminPluginScopes.delete(plugin.id);
      console.error(`Failed to register admin plugin ${plugin.id}`, error);
    }
  }
}

export function syncAdminPlugins(plugins: AdminPlugin[], activePluginIds: Iterable<string>) {
  const activeIds = new Set(activePluginIds);
  runtimeSync = runtimeSync.then(() => reconcileAdminPlugins(plugins, activeIds));
  return runtimeSync;
}

export function disposeAdminPlugins() {
  return syncAdminPlugins([], []);
}
