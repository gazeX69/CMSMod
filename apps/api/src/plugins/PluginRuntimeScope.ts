export interface Disposable {
  dispose(): void;
}

export class PluginRuntimeScope {
  private disposables = new Set<Disposable>();

  constructor(public readonly pluginId: string) {}

  track<T extends Disposable>(registration: T): T {
    this.disposables.add(registration);
    return registration;
  }

  dispose() {
    for (const registration of Array.from(this.disposables).reverse()) {
      try {
        registration.dispose();
      } catch {
        // Runtime cleanup is best-effort and isolated per registration.
      }
    }
    this.disposables.clear();
  }

  get registrationCount() {
    return this.disposables.size;
  }
}

const scopes = new Map<string, PluginRuntimeScope>();

export function getOrCreatePluginRuntimeScope(pluginId: string) {
  const existing = scopes.get(pluginId);
  if (existing) return existing;
  const scope = new PluginRuntimeScope(pluginId);
  scopes.set(pluginId, scope);
  return scope;
}

export function disposePluginRuntimeScope(pluginId: string) {
  scopes.get(pluginId)?.dispose();
  scopes.delete(pluginId);
}

export function getPluginRuntimeScopeDiagnostics() {
  return Array.from(scopes.values()).map((scope) => ({
    pluginId: scope.pluginId,
    registrations: scope.registrationCount,
  }));
}
