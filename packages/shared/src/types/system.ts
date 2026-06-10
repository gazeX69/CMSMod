export interface MemoryUsage {
  rss: number;
  heapTotal: number;
  heapUsed: number;
  external: number;
}

export interface SystemInfo {
  status: string;
  version: string;
  uptime: number;
  nodeVersion: string;
  platform: string;
  memoryUsage: MemoryUsage;
  timestamp: number;
}
