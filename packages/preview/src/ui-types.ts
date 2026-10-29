import type {
  PreviewUiInput,
  PreviewUiResponse,
  PreviewUiState,
  PreviewUiTransport,
} from "./ui-controller.js";

export type PreviewUiSelectors = {
  readonly root: string;
  readonly markdown: string;
  readonly fixture: string;
  readonly page: string;
  readonly frame: string;
  readonly theme: string;
  readonly mode: string;
  readonly status: string;
  readonly diagnostics: string;
  readonly option: string;
};

export type PreviewUiMessages = {
  readonly rendering: string;
  readonly rendered: string;
  readonly checkDiagnostics: string;
  readonly requestFailure: string;
};

export type PreviewUiOptions = {
  readonly themeStyles: Readonly<Record<string, string>>;
  readonly themeAttributes?: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly themeSettings?: (theme: string) =>
    | {
        readonly attributes: Readonly<Record<string, string>>;
        readonly style: string;
      }
    | undefined;
  readonly articleTitle?: string;
  readonly contentStyles?: readonly string[];
  readonly pluginStyles: readonly string[];
  readonly endpoint?: string;
  readonly transport?: PreviewUiTransport;
  readonly selectors?: Partial<PreviewUiSelectors>;
  readonly messages?: Partial<PreviewUiMessages>;
};

export type {
  PreviewUiInput,
  PreviewUiResponse,
  PreviewUiState,
  PreviewUiTransport,
};
