export type PluginStatus =
  | 'DISCOVERED'
  | 'INSTALLING'
  | 'INSTALLED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'BROKEN'
  | 'UNINSTALLED';

export type PluginLayer = 'platform' | 'plugin' | 'application';

export interface PluginPermissionManifest {
  key: string;
  description?: string;
}

export interface PluginSettingManifest {
  key: string;
  defaultValue: string;
  type?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  isPublic?: boolean;
}

export interface PluginEventManifest {
  name: string;
  description?: string;
}

export interface PluginStorageManifest {
  disk?: string;
  root: string;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  compatibility?: string;
  layer?: PluginLayer;
  dependencies?: Array<string | { id: string; version?: string; optional?: boolean }>;
  package?: {
    type: 'plugin' | 'theme' | 'integration' | 'sdk-extension';
    sdkVersion?: string;
    publisher?: { id: string; name: string; keyId?: string };
    license?: { type: 'free' | 'paid' | 'subscription' | 'enterprise' | 'lifetime'; identifier?: string };
    integrity?: { algorithm: 'sha256'; digest: string };
    signature?: { algorithm: 'ed25519'; keyId: string; value: string };
    rollback?: { supported: boolean; migrations?: 'paired-down-files' | 'none' };
  };
  runtime?: { entry: string; format?: 'esm' };

  backend?: {
    entry: string;
    namespace?: string;
  };

  admin?: {
    menu: string;
    route: string;
    bundle: string;
    css?: string;
    runtime?: 'bundled' | 'distributed';
  };

  permissions?: Array<string | PluginPermissionManifest>;
  settings?: PluginSettingManifest[];
  events?: {
    emits?: PluginEventManifest[];
    listens?: PluginEventManifest[];
  };
  storage?: PluginStorageManifest;
  migrations?: {
    directory: string;
  };
}

export interface ScannedPlugin {
  key: string;
  pluginPath: string;
  manifestPath: string;
  manifest: PluginManifest | null;
  status: PluginStatus;
  error?: string;
}
