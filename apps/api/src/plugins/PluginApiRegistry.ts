import type { PluginApiRequestContext, PluginApiResponse } from '@modern-cms/plugin-sdk';

type Handler = (context: PluginApiRequestContext) => PluginApiResponse | Promise<PluginApiResponse>;

type RouteEntry = {
  owner: string;
  id: string;
  method: string;
  path: string;
  permission?: string;
  handler: Handler;
};

function normalizePath(value: string) {
  const path = `/${value}`.replace(/\/+/g, '/').replace(/\/$/, '');
  if (path.includes('..')) throw new Error(`Invalid plugin API path: ${value}`);
  return path || '/';
}

function matchPath(pattern: string, path: string) {
  const patternParts = normalizePath(pattern).split('/').filter(Boolean);
  const pathParts = normalizePath(path).split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const expected = patternParts[index];
    const actual = pathParts[index];
    if (expected.startsWith(':')) params[expected.slice(1)] = decodeURIComponent(actual);
    else if (expected !== actual) return null;
  }
  return params;
}

class PluginApiRegistry {
  private routes: RouteEntry[] = [];

  register(owner: string, input: Omit<RouteEntry, 'owner' | 'method'> & { method?: string }) {
    const route: RouteEntry = {
      ...input,
      owner,
      method: (input.method || 'GET').toUpperCase(),
      path: normalizePath(input.path),
    };
    if (this.routes.some((entry) => entry.owner === owner && (entry.id === route.id || (entry.method === route.method && entry.path === route.path)))) {
      throw new Error(`Duplicate plugin API route ${owner}:${route.method} ${route.path}`);
    }
    this.routes.push(route);
    return { dispose: () => { this.routes = this.routes.filter((entry) => entry !== route); } };
  }

  resolve(owner: string, method: string, path: string) {
    for (const route of this.routes) {
      if (route.owner !== owner || route.method !== method.toUpperCase()) continue;
      const params = matchPath(route.path, path);
      if (params) return { route, params };
    }
    return null;
  }

  unregisterOwner(owner: string) {
    this.routes = this.routes.filter((route) => route.owner !== owner);
  }

  diagnostics() {
    return this.routes.map(({ handler: _handler, ...route }) => route);
  }
}

export const pluginApiRegistry = new PluginApiRegistry();
