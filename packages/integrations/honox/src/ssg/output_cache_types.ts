export type OutputCacheEntry = {
  cachePath: string;
  checksum: string;
  size?: number;
  modifiedAtMs?: number;
};

export type OutputCacheState = {
  version: 4;
  appFingerprint?: string;
  bundleFingerprint?: string;
  clientManifestFingerprint?: string;
  outputs: Record<string, OutputCacheEntry>;
  finalOutputInventory?: Record<string, string>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile?: string;
};

export type OutputFileStats = {
  size: number;
  modifiedAtMs: number;
};

export type FastPathCacheState = {
  version: 1;
  outputCacheChecksum: string;
  appFingerprint?: string;
  finalOutputInventory: Record<string, string>;
  finalOutputStats?: Record<string, OutputFileStats>;
  publicDirectory?: string;
  publicFingerprint?: string;
  configFile: string;
  outputPaths: readonly string[];
};

export const outputCacheValidationConcurrency = 12;
