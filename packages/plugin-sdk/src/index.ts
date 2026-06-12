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
  register?: (sdk: AdminRuntimeSdk) => void | Promise<void>;
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
  permission?: string;
  runtime?: 'bundled' | 'distributed';
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
  eventId: string;
  event: string;
  version: number;
  timestamp: string;
  source: string;
  payload: TPayload;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ContentSummary {
  uuid: string;
  type: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  authorId: number | null;
  publishedAt: string | Date | null;
  updatedAt: string | Date;
  permalink: string;
  featuredImage?: FeaturedImage | null;
}

export interface FeaturedImage {
  url: string;
  assetUuid?: string | null;
  alt?: string;
  source: 'external' | 'media-library' | string;
}

export interface ContentRecord extends ContentSummary {
  body: string | null;
  metadata?: Record<string, unknown>;
}

export interface ContentQuery {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
  authorId?: number;
  search?: string;
  sort?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  order?: 'asc' | 'desc';
  includeBody?: boolean;
}

export interface ContentMetadataDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  visibility?: 'private' | 'admin' | 'public';
  maxLength?: number;
  revisionPolicy?: 'none' | 'snapshot';
}

export interface ContentMetadataEntry {
  key: string;
  value: unknown;
  visibility: 'private' | 'admin' | 'public';
  updatedAt?: string | Date;
}

export interface MediaAsset {
  uuid: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  altText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  publicUrl: string;
  editorNode?: { type: string; attrs?: Record<string, unknown> };
}

export interface MediaSearchQuery {
  query?: string;
  mimeType?: string;
  page?: number;
  limit?: number;
}

export interface CapabilityUnavailable {
  ok: false;
  code: 'CAPABILITY_UNAVAILABLE' | 'CAPABILITY_INCOMPATIBLE';
  capability: string;
  message: string;
}

export type CapabilityResult<T> = { ok: true; value: T } | CapabilityUnavailable;

export interface PublicRouteContext {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string | undefined>;
}

export interface PublicResponse {
  status: number;
  headers?: Record<string, string>;
  contentType?: string;
  body: string;
}

export interface PluginApiRequestContext {
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string | undefined>;
  params: Record<string, string>;
  body: unknown;
  user: { id: number; username: string; email: string } | null;
}

export interface PluginApiResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface PublicDocumentRequest extends PublicRouteContext {}

export interface PublicDocumentHost {
  render(request: PublicDocumentRequest): Promise<PublicResponse>;
}

export interface PublicDocumentContext {
  request: PublicRouteContext;
  route: { id: string; owner: string; params?: Record<string, string> } | null;
  site: Record<string, unknown>;
  content: ContentRecord | null;
  theme: { id: string; name: string } | null;
}

export interface PublicMetaDescriptor {
  key: string;
  name?: string;
  property?: string;
  content: string;
}

export interface PublicLinkDescriptor {
  key: string;
  rel: string;
  href: string;
  hreflang?: string;
  type?: string;
}

export interface PublicScriptDescriptor {
  key: string;
  src?: string;
  type?: string;
  async?: boolean;
  defer?: boolean;
  data?: unknown;
}

export interface PublicDocumentContribution {
  title?: string;
  meta?: PublicMetaDescriptor[];
  links?: PublicLinkDescriptor[];
  scripts?: PublicScriptDescriptor[];
  bodyAttributes?: Record<string, string>;
}

export interface PublicInterceptorDecision {
  action: 'continue' | 'rewrite' | 'respond' | 'deny';
  path?: string;
  response?: PublicResponse;
  annotations?: Record<string, string>;
}

export interface DisposableRegistration {
  dispose(): void;
}

export interface EditorDocumentContext {
  contentUuid: string | null;
  contentType: string;
  title: string;
  slug: string;
  excerpt: string;
  status: string;
  bodyHtml: string;
  dirty: boolean;
}

export interface EditorSaveContext extends EditorDocumentContext {
  contentUuid: string;
  revisionNumber?: number;
  saveId: string;
}

export interface EditorPublishCheckResult {
  status: 'pass' | 'warning' | 'block';
  message?: string;
}

export interface EditorInspectorDefinition {
  id: string;
  title: string;
  order?: number;
  component: ComponentType<any>;
}

export interface EditorSidebarDefinition {
  id: string;
  title: string;
  icon?: string;
  component: ComponentType<any>;
}

export interface AdminEditorSdk {
  inspector: { register(definition: EditorInspectorDefinition): DisposableRegistration };
  sidebar: { register(definition: EditorSidebarDefinition): DisposableRegistration };
  insertSource: { register(definition: { id: string; label: string; icon?: string; preferredWidth?: number; render?: ComponentType<any>; pick?: () => Promise<any> }): DisposableRegistration };
  node: { register(definition: { name: string; extension: unknown }): DisposableRegistration };
  command: { register(definition: { name: string; action: (editor: any, ...args: any[]) => any }): DisposableRegistration };
  propertyPanel: { register(definition: { nodeType: string; component: ComponentType<any> }): DisposableRegistration };
  document: {
    getContext(): EditorDocumentContext | null;
    onSaved(listener: (context: EditorSaveContext) => void | Promise<void>): DisposableRegistration;
    registerSupplementalSave(handler: (context: EditorSaveContext) => void | Promise<void>): DisposableRegistration;
  };
  publish: {
    registerCheck(check: (context: EditorDocumentContext) => EditorPublishCheckResult | Promise<EditorPublishCheckResult>): DisposableRegistration;
  };
}

export interface AdminMediaSdk {
  openPicker(options?: { mimeTypes?: string[]; multiple?: boolean }): Promise<MediaAsset | MediaAsset[] | null>;
}

export interface AdminRuntimeSdk {
  pluginId: string;
  editor: AdminEditorSdk;
  media: AdminMediaSdk;
  capabilities: {
    registerProvider<T>(capability: string, provider: T): DisposableRegistration;
    resolve<T>(capability: string): CapabilityResult<T>;
  };
}

export interface CompositionContext {
  contentUuid: string;
  contentType: string;
  status: string;
  locale: string;
  theme: {
    id: string;
    name: string;
  };
  mode: 'public' | 'preview' | 'headless';
  request?: PublicRouteContext;
  assets: {
    scripts: Array<{ key: string; src?: string; data?: any; type?: string; defer?: boolean }>;
    styles: Array<{ key: string; href?: string; data?: any }>;
  };
}

export type BlockRendererFn = (blockId: string, context: CompositionContext) => string | Promise<string>;
export type ContentFilterFn = (html: string, context: CompositionContext) => string | Promise<string>;

export interface PluginRuntimeSdk {
  pluginId: string;
  auth: { requireUser(request: unknown, reply: unknown): Promise<void> };
  settings: PluginRuntimeSdkSettings;
  permissions: {
    can(userId: number, permissionKey: string): Promise<boolean>;
  };
  events: {
    emit<TPayload = unknown>(eventName: string, payload: TPayload, version?: number): Promise<void>;
    on<TPayload = unknown>(
      eventName: string,
      handler: (event: PluginEventEnvelope<TPayload>) => void | Promise<void>
    ): DisposableRegistration;
  };
  content: {
    getByUuid(uuid: string, options?: { includeBody?: boolean; includeMetadata?: boolean }): Promise<ContentRecord | null>;
    list(query?: ContentQuery): Promise<PageResult<ContentSummary | ContentRecord>>;
    listPublished(query?: ContentQuery): Promise<PageResult<ContentSummary | ContentRecord>>;
    search(query: ContentQuery & { search: string }): Promise<PageResult<ContentSummary | ContentRecord>>;
    resolvePermalink(uuid: string): Promise<string | null>;
    metadata: {
      registerDefinition(definition: ContentMetadataDefinition): DisposableRegistration;
      get(contentUuid: string, options?: { visibility?: 'private' | 'admin' | 'public' }): Promise<ContentMetadataEntry[]>;
      set(contentUuid: string, entries: Array<{ key: string; value: unknown }>): Promise<void>;
      delete(contentUuid: string, keys: string[]): Promise<void>;
    };
  };
  capabilities: {
    registerProvider<T>(capability: string, provider: T, options?: { version?: string; mode?: 'exclusive' | 'multi' | 'composite'; priority?: number }): DisposableRegistration;
    resolve<T>(capability: string, versionRange?: string): CapabilityResult<T>;
  };
  publicDocument: {
    registerContributor(input: { id: string; priority?: number; contribute(context: PublicDocumentContext): PublicDocumentContribution | Promise<PublicDocumentContribution> }): DisposableRegistration;
  };
  publicRoutes: {
    register(input: { id: string; method?: string; path: string; priority?: number; handler(context: PublicRouteContext): PublicResponse | Promise<PublicResponse> }): DisposableRegistration;
  };
  publicRequests: {
    registerInterceptor(input: { id: string; phase: 'beforeResolve' | 'afterResolve' | 'beforeRender' | 'afterRender'; priority?: number; intercept(context: PublicRouteContext): PublicInterceptorDecision | Promise<PublicInterceptorDecision> }): DisposableRegistration;
  };
  publicSlots: {
    register(slot: string, resolver: (targetUuid: string) => Promise<string>): DisposableRegistration;
  };
  publicContent: {
    registerBlockRenderer(type: string, renderer: BlockRendererFn): DisposableRegistration;
    registerContentFilter(id: string, filter: ContentFilterFn, priority?: number): DisposableRegistration;
  };
  publicAssets: {
    register(path: string, content: string | Uint8Array, mimeType: string): DisposableRegistration;
  };
  apiRoutes: {
    register(input: {
      id: string;
      method?: string;
      path: string;
      permission?: string;
      handler(context: PluginApiRequestContext): PluginApiResponse | Promise<PluginApiResponse>;
    }): DisposableRegistration;
  };
  media: {
    getByUuid(uuid: string): Promise<CapabilityResult<MediaAsset | null>>;
    resolve(uuid: string, options?: Record<string, string>): Promise<CapabilityResult<string>>;
    search(query?: MediaSearchQuery): Promise<CapabilityResult<PageResult<MediaAsset>>>;
  };
  requireActive(request: unknown, reply: unknown): Promise<void>;
  database: { orm: unknown };
}

export interface PluginRuntimeSdkSettings {
  get(key: string, defaultValue?: string): Promise<string | null>;
  getWithFallback(key: string, defaultValue: string, legacyKeys?: string[]): Promise<string>;
  set(key: string, value: string, options?: { description?: string | null; group?: string; type?: string; isPublic?: boolean }): Promise<void>;
  getPublic(): Promise<unknown[]>;
  getByScope(scope: string): Promise<unknown[]>;
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
  runtime?: {
    entry: string;
    format?: 'esm';
  };
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
