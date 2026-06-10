import { ComponentType } from 'react';

/**
 * Props passed to custom plugin icons in the sidebar.
 */
export interface PluginMenuIconProps {
  size?: number;
  className?: string;
}

/**
 * The runtime contract that every admin-facing plugin must implement.
 */
export interface AdminPlugin {
  id: string;
  icon?: ComponentType<PluginMenuIconProps>;
  component: ComponentType<any>;
}

/**
 * The runtime contract representing an active plugin's menu item in the sidebar.
 */
export interface PluginMenu {
  label: string;
  route: string;
  icon?: ComponentType<PluginMenuIconProps>;
}

/**
 * Manifest definitions for the admin interface.
 */
export interface PluginAdminManifest {
  menu: string;
  route: string;
  bundle: string;
  css?: string;
}

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

export interface PluginEventEnvelope<TPayload = unknown> {
  event: string;
  timestamp: string;
  source: string;
  payload: TPayload;
}

export interface PluginRuntimeSdk {
  settings: {
    get(key: string, defaultValue?: string): Promise<string | null>;
    getWithFallback(key: string, defaultValue: string, legacyKeys?: string[]): Promise<string>;
    set(
      key: string,
      value: string,
      options?: {
        description?: string | null;
        group?: string;
        type?: string;
        isPublic?: boolean;
      }
    ): Promise<void>;
    getPublic(): Promise<unknown[]>;
    getByScope(scope: string): Promise<unknown[]>;
  };
  permissions: {
    can(userId: number, permissionKey: string): Promise<boolean>;
  };
  events: {
    emit<TPayload = unknown>(eventName: string, payload: TPayload): Promise<void>;
    on<TPayload = unknown>(
      eventName: string,
      handler: (event: PluginEventEnvelope<TPayload>) => void | Promise<void>
    ): () => void;
  };
}

/**
 * The static manifest structure of plugin.json.
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  compatibility?: string;
  layer?: PluginLayer;
  dependencies?: string[];
  backend?: {
    entry: string;
    namespace?: string;
  };
  admin?: PluginAdminManifest;
  permissions?: Array<string | PluginPermissionManifest>;
  settings?: PluginSettingManifest[];
  events?: {
    emits?: PluginEventManifest[];
    listens?: PluginEventManifest[];
  };
  storage?: {
    disk?: string;
    root: string;
  };
  migrations?: {
    directory: string;
  };
}
