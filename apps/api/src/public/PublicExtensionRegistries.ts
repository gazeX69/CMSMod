import type {
  PublicDocumentContext,
  PublicDocumentContribution,
  PublicInterceptorDecision,
  PublicResponse,
  PublicRouteContext,
  BlockRendererFn,
  ContentFilterFn,
  CompositionContext,
} from '@modern-cms/plugin-sdk';

interface OwnedEntry { owner: string; id: string; priority: number }

interface ContributorEntry extends OwnedEntry {
  contribute(context: PublicDocumentContext): PublicDocumentContribution | Promise<PublicDocumentContribution>;
}

interface RouteEntry extends OwnedEntry {
  method: string;
  path: string;
  handler(context: PublicRouteContext): PublicResponse | Promise<PublicResponse>;
}

interface InterceptorEntry extends OwnedEntry {
  phase: 'beforeResolve' | 'afterResolve' | 'beforeRender' | 'afterRender';
  intercept(context: PublicRouteContext): PublicInterceptorDecision | Promise<PublicInterceptorDecision>;
}

function sortEntries<T extends OwnedEntry>(entries: T[]) {
  return entries.sort((a, b) => b.priority - a.priority || a.owner.localeCompare(b.owner) || a.id.localeCompare(b.id));
}

class PublicDocumentContributorRegistry {
  private entries: ContributorEntry[] = [];

  register(owner: string, input: Omit<ContributorEntry, 'owner' | 'priority'> & { priority?: number }) {
    if (this.entries.some((entry) => entry.owner === owner && entry.id === input.id)) throw new Error(`Duplicate contributor ${owner}:${input.id}`);
    const entry: ContributorEntry = { ...input, owner, priority: input.priority || 0 };
    this.entries.push(entry);
    sortEntries(this.entries);
    return { dispose: () => { this.entries = this.entries.filter((item) => item !== entry); } };
  }

  async collect(context: PublicDocumentContext) {
    const contributions: Array<{ owner: string; contribution: PublicDocumentContribution }> = [];
    for (const entry of this.entries) {
      try {
        const contribution = await Promise.race([
          entry.contribute(context),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Contributor timeout')), 2000)),
        ]);
        contributions.push({ owner: entry.owner, contribution });
      } catch {
        // Optional contributors cannot break the document producer.
      }
    }
    return contributions;
  }

  unregisterOwner(owner: string) { this.entries = this.entries.filter((entry) => entry.owner !== owner); }
}

class PublicRouteRegistry {
  private entries: RouteEntry[] = [];
  private reserved = ['/api', '/admin', '/health'];

  register(owner: string, input: Omit<RouteEntry, 'owner' | 'priority' | 'method'> & { priority?: number; method?: string }) {
    const method = (input.method || 'GET').toUpperCase();
    if (!input.path.startsWith('/') || this.reserved.some((path) => input.path === path || input.path.startsWith(`${path}/`))) {
      throw new Error(`Reserved or invalid public route: ${input.path}`);
    }
    if (this.entries.some((entry) => entry.method === method && entry.path === input.path)) throw new Error(`Public route conflict: ${method} ${input.path}`);
    const entry: RouteEntry = { ...input, method, owner, priority: input.priority || 0 };
    this.entries.push(entry);
    sortEntries(this.entries);
    return { dispose: () => { this.entries = this.entries.filter((item) => item !== entry); } };
  }

  resolve(method: string, path: string) { return this.entries.find((entry) => entry.method === method.toUpperCase() && entry.path === path) || null; }
  unregisterOwner(owner: string) { this.entries = this.entries.filter((entry) => entry.owner !== owner); }
}

class PublicRequestInterceptorRegistry {
  private entries: InterceptorEntry[] = [];

  register(owner: string, input: Omit<InterceptorEntry, 'owner' | 'priority'> & { priority?: number }) {
    if (this.entries.some((entry) => entry.owner === owner && entry.id === input.id)) throw new Error(`Duplicate interceptor ${owner}:${input.id}`);
    const entry: InterceptorEntry = { ...input, owner, priority: input.priority || 0 };
    this.entries.push(entry);
    sortEntries(this.entries);
    return { dispose: () => { this.entries = this.entries.filter((item) => item !== entry); } };
  }

  async run(phase: InterceptorEntry['phase'], context: PublicRouteContext) {
    for (const entry of this.entries.filter((item) => item.phase === phase)) {
      try {
        const decision = await Promise.race([
          entry.intercept(Object.freeze({ ...context })),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Interceptor timeout')), 2000)),
        ]);
        if (decision.action !== 'continue') return decision;
      } catch {
        // Optional interceptor failures are isolated.
      }
    }
    return { action: 'continue' as const };
  }

  unregisterOwner(owner: string) { this.entries = this.entries.filter((entry) => entry.owner !== owner); }
}

export const publicDocumentContributors = new PublicDocumentContributorRegistry();
export const publicRouteRegistry = new PublicRouteRegistry();
export const publicRequestInterceptors = new PublicRequestInterceptorRegistry();

interface BlockRendererEntry {
  owner: string;
  type: string;
  renderer: BlockRendererFn;
}

class BlockRendererRegistry {
  private entries: BlockRendererEntry[] = [];

  register(owner: string, type: string, renderer: BlockRendererFn) {
    const key = type.toLowerCase();
    if (this.entries.some((entry) => entry.type === key)) {
      throw new Error(`Duplicate block renderer for type: ${type}`);
    }
    const entry: BlockRendererEntry = { owner, type: key, renderer };
    this.entries.push(entry);
    return {
      dispose: () => {
        this.entries = this.entries.filter((item) => item !== entry);
      }
    };
  }

  resolve(type: string) {
    return this.entries.find((entry) => entry.type === type.toLowerCase()) || null;
  }

  unregisterOwner(owner: string) {
    this.entries = this.entries.filter((entry) => entry.owner !== owner);
  }
}

interface ContentFilterEntry {
  id: string;
  owner: string;
  priority: number;
  filter: ContentFilterFn;
}

class ContentFilterRegistry {
  private entries: ContentFilterEntry[] = [];

  register(owner: string, input: { id: string; priority?: number; filter: ContentFilterFn }) {
    if (this.entries.some((entry) => entry.owner === owner && entry.id === input.id)) {
      throw new Error(`Duplicate content filter ${owner}:${input.id}`);
    }
    const entry: ContentFilterEntry = {
      id: input.id,
      owner,
      priority: input.priority || 0,
      filter: input.filter,
    };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.priority - a.priority);
    return {
      dispose: () => {
        this.entries = this.entries.filter((item) => item !== entry);
      }
    };
  }

  getFilters() {
    return this.entries;
  }

  unregisterOwner(owner: string) {
    this.entries = this.entries.filter((entry) => entry.owner !== owner);
  }
}

class PublicContentCompositionPipeline {
  readonly blocks = new BlockRendererRegistry();
  readonly filters = new ContentFilterRegistry();

  async compose(html: string, context: CompositionContext): Promise<string> {
    let result = html;

    // Phase 3: Resolve cms-block/plugin block
    // We scan for <cms-block type="TYPE" id="ID"></cms-block>
    const blockRegex = /<cms-block\s+type="([^"]+)"\s+id="([^"]+)"\s*><\/cms-block>/gi;
    result = await this.replaceAsync(result, blockRegex, async (match, type, id) => {
      const rendererEntry = this.blocks.resolve(type);
      if (!rendererEntry) {
        return `<!-- Block renderer not found for type: ${type} -->`;
      }
      try {
        return await rendererEntry.renderer(id, context);
      } catch (err) {
        console.error(`[PublicContentCompositionPipeline] Block renderer ${type} failed for id ${id}:`, err);
        return `<!-- Block renderer failed for type: ${type} -->`;
      }
    });

    // Phase 4: Apply text filters (e.g. SEO linkers, syntax highlighter)
    for (const filterEntry of this.filters.getFilters()) {
      try {
        result = await filterEntry.filter(result, context);
      } catch (err) {
        console.error(`[PublicContentCompositionPipeline] Content filter ${filterEntry.owner}:${filterEntry.id} failed:`, err);
      }
    }

    return result;
  }

  private async replaceAsync(
    str: string,
    regex: RegExp,
    asyncFn: (substring: string, ...args: any[]) => Promise<string>
  ): Promise<string> {
    const promises: Promise<string>[] = [];
    str.replace(regex, (match, ...args) => {
      const promise = asyncFn(match, ...args);
      promises.push(promise);
      return match;
    });
    const data = await Promise.all(promises);
    return str.replace(regex, () => data.shift()!);
  }

  unregisterOwner(owner: string) {
    this.blocks.unregisterOwner(owner);
    this.filters.unregisterOwner(owner);
  }
}

interface AssetEntry {
  owner: string;
  path: string;
  content: string | Uint8Array;
  mimeType: string;
}

class PublicAssetRegistry {
  private assets: AssetEntry[] = [];

  register(owner: string, path: string, content: string | Uint8Array, mimeType: string) {
    const cleanPath = path.replace(/^\/+/, '');
    const entry: AssetEntry = { owner, path: cleanPath, content, mimeType };
    this.assets = this.assets.filter((a) => !(a.owner === owner && a.path === cleanPath));
    this.assets.push(entry);
    return {
      dispose: () => {
        this.assets = this.assets.filter((a) => a !== entry);
      }
    };
  }

  resolve(owner: string, path: string) {
    const cleanPath = path.replace(/^\/+/, '');
    return this.assets.find((a) => a.owner.toLowerCase() === owner.toLowerCase() && a.path.toLowerCase() === cleanPath.toLowerCase()) || null;
  }

  unregisterOwner(owner: string) {
    this.assets = this.assets.filter((a) => a.owner !== owner);
  }
}

export const publicAssetRegistry = new PublicAssetRegistry();

export const publicContentCompositionPipeline = new PublicContentCompositionPipeline();

export function unregisterPublicExtensions(owner: string) {
  publicDocumentContributors.unregisterOwner(owner);
  publicRouteRegistry.unregisterOwner(owner);
  publicRequestInterceptors.unregisterOwner(owner);
  publicContentCompositionPipeline.unregisterOwner(owner);
  publicAssetRegistry.unregisterOwner(owner);
}
