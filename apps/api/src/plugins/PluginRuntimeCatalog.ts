import type { Disposable } from './PluginRuntimeScope.js';

type Entry = {
  activate(): Disposable;
  disposable?: Disposable;
};

const entriesByOwner = new Map<string, Set<Entry>>();

export function catalogRuntimeRegistration(owner: string, activate: () => Disposable, active: boolean): Disposable {
  const entries = entriesByOwner.get(owner) || new Set<Entry>();
  const entry: Entry = { activate };
  entries.add(entry);
  entriesByOwner.set(owner, entries);
  if (active) entry.disposable = activate();

  return {
    dispose() {
      entry.disposable?.dispose();
      entry.disposable = undefined;
      entries.delete(entry);
      if (entries.size === 0) entriesByOwner.delete(owner);
    },
  };
}

export function activateCatalogOwner(owner: string) {
  for (const entry of entriesByOwner.get(owner) || []) {
    if (!entry.disposable) entry.disposable = entry.activate();
  }
}

export function deactivateCatalogOwner(owner: string) {
  for (const entry of entriesByOwner.get(owner) || []) {
    entry.disposable?.dispose();
    entry.disposable = undefined;
  }
}

export function unregisterCatalogOwner(owner: string) {
  for (const entry of entriesByOwner.get(owner) || []) entry.disposable?.dispose();
  entriesByOwner.delete(owner);
}

export function runtimeCatalogDiagnostics() {
  return Array.from(entriesByOwner, ([owner, entries]) => ({
    owner,
    registrations: entries.size,
    active: Array.from(entries).filter((entry) => Boolean(entry.disposable)).length,
  }));
}
