export interface ContentTypeDefinition {
  key: string;
  singular: string;
  plural: string;
  apiBasePath: string;
  icon?: string;
}

class ContentTypeRegistry {
  private definitions = new Map<string, ContentTypeDefinition>();

  register(definition: ContentTypeDefinition) {
    this.definitions.set(definition.key, definition);
  }

  get(key: string): ContentTypeDefinition | null {
    return this.definitions.get(key) || null;
  }

  getAll(): ContentTypeDefinition[] {
    return Array.from(this.definitions.values());
  }
}

export const contentTypeRegistry = new ContentTypeRegistry();

// Register default built-in types
contentTypeRegistry.register({
  key: 'article',
  singular: 'Post',
  plural: 'Posts',
  apiBasePath: '/api/posts'
});

contentTypeRegistry.register({
  key: 'page',
  singular: 'Page',
  plural: 'Pages',
  apiBasePath: '/api/pages'
});
