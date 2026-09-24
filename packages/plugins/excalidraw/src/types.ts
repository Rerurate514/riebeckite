export type ExcalidrawOptions = {
  lazy?: boolean;
};

export type ExcalidrawScene = {
  type?: string;
  version?: number;
  source?: string;
  elements: readonly Record<string, unknown>[];
  appState?: Record<string, unknown>;
  files?: Record<string, Record<string, unknown>>;
};

export type ObsidianEmbeddedFile = {
  fileId: string;
  target: string;
};

export type ParsedExcalidrawDocument = {
  scene: ExcalidrawScene;
  embeddedFiles: readonly ObsidianEmbeddedFile[];
};

export type ExcalidrawPayload = {
  elements: readonly Record<string, unknown>[];
  appState: Record<string, unknown>;
  files: Record<string, Record<string, unknown>>;
};
