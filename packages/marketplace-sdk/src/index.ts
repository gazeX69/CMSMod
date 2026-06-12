export type PackageOperation = {
  id: string;
  packageId: string | null;
  operation: string;
  source: string;
  fromVersion: string | null;
  toVersion: string | null;
  status: string;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type PackageInstallResult = {
  ok: true;
  operationId: string;
  packageId: string;
  version: string;
  previousVersion: string | null;
};

export type MarketplaceTransport = (path: string, options?: RequestInit) => Promise<Response>;

export function createMarketplaceClient(transport: MarketplaceTransport) {
  return {
    async installArchive(archive: Blob, options: { activate?: boolean; source?: 'local' | 'remote' | 'private'; allowUnsignedLocal?: boolean; sha256?: string } = {}) {
      const form = new FormData();
      form.append('package', archive, 'package.zip');
      const query = new URLSearchParams({
        activate: String(options.activate === true),
        allowUnsigned: String(options.allowUnsignedLocal === true),
        source: options.source || 'remote',
      });
      const response = await transport(`/api/admin/packages/upload?${query}`, {
        method: 'POST',
        headers: options.sha256 ? { 'X-Package-SHA256': options.sha256 } : undefined,
        body: form,
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Package installation failed');
      return response.json() as Promise<PackageInstallResult>;
    },

    async listOperations() {
      const response = await transport('/api/admin/packages/operations');
      if (!response.ok) throw new Error('Package operations could not be loaded');
      return response.json() as Promise<PackageOperation[]>;
    },

    async rollback(operationId: string) {
      const response = await transport(`/api/admin/packages/operations/${encodeURIComponent(operationId)}/rollback`, { method: 'POST' });
      if (!response.ok) throw new Error((await response.json()).error || 'Package rollback failed');
      return response.json() as Promise<PackageInstallResult>;
    },
  };
}
