import type { CapabilityResult } from '@modern-cms/plugin-sdk';

type ProviderMode = 'exclusive' | 'multi' | 'composite';

interface ProviderRecord<T = unknown> {
  owner: string;
  capability: string;
  version: string;
  mode: ProviderMode;
  priority: number;
  implementation: T;
}

class CapabilityRegistry {
  private providers = new Map<string, ProviderRecord[]>();

  register<T>(owner: string, capability: string, implementation: T, options: { version?: string; mode?: ProviderMode; priority?: number } = {}) {
    const record: ProviderRecord<T> = {
      owner,
      capability,
      implementation,
      version: options.version || '1.0.0',
      mode: options.mode || 'exclusive',
      priority: options.priority || 0,
    };
    const current = this.providers.get(capability) || [];
    if (record.mode === 'exclusive' && current.some((item) => item.mode === 'exclusive' && item.owner !== owner)) {
      throw new Error(`Capability ${capability} already has an exclusive provider`);
    }
    current.push(record as ProviderRecord);
    current.sort((a, b) => b.priority - a.priority || a.owner.localeCompare(b.owner));
    this.providers.set(capability, current);
    return { dispose: () => this.remove(record as ProviderRecord) };
  }

  resolve<T>(capability: string, versionRange?: string): CapabilityResult<T> {
    const records = this.providers.get(capability) || [];
    if (records.length === 0) {
      return { ok: false, code: 'CAPABILITY_UNAVAILABLE', capability, message: `Capability ${capability} is unavailable` };
    }
    const record = records[0];
    if (versionRange && !record.version.startsWith(versionRange.replace(/[\^~]/g, '').split('.')[0])) {
      return { ok: false, code: 'CAPABILITY_INCOMPATIBLE', capability, message: `Capability ${capability} does not satisfy ${versionRange}` };
    }
    return { ok: true, value: record.implementation as T };
  }

  list(capability?: string) {
    const records = capability ? this.providers.get(capability) || [] : Array.from(this.providers.values()).flat();
    return records.map(({ implementation: _implementation, ...record }) => record);
  }

  unregisterOwner(owner: string) {
    for (const [capability, records] of this.providers) {
      const remaining = records.filter((record) => record.owner !== owner);
      if (remaining.length > 0) this.providers.set(capability, remaining);
      else this.providers.delete(capability);
    }
  }

  private remove(record: ProviderRecord) {
    const current = this.providers.get(record.capability) || [];
    const remaining = current.filter((item) => item !== record);
    if (remaining.length > 0) this.providers.set(record.capability, remaining);
    else this.providers.delete(record.capability);
  }
}

export const capabilityRegistry = new CapabilityRegistry();
