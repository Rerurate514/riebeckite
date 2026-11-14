import type { LoadingController } from "@riebeckite/ui/loading";
import type {
  PreviewUiMessages,
  PreviewUiOptions,
  PreviewUiSelectors,
} from "./src/ui-types.js";

export const defaultSelectors: PreviewUiSelectors = {
  root: "[data-plugin-preview]",
  markdown: "[data-preview-markdown]",
  fixture: "[data-preview-fixture-select]",
  page: "[data-preview-page-select]",
  frame: "[data-preview-frame]",
  theme: "[data-preview-theme]",
  mode: "[data-preview-mode]",
  status: "[data-preview-status]",
  diagnostics: "[data-preview-diagnostics]",
  option: "[data-preview-option]",
};

export const defaultMessages: PreviewUiMessages = {
  rendering: "Rendering",
  rendered: "Rendered",
  checkDiagnostics: "Check diagnostics",
  requestFailure: "The preview could not be rendered. Try again.",
};

export type PreviewElements = {
  readonly frame: HTMLIFrameElement;
  readonly theme: HTMLSelectElement;
  readonly mode: HTMLSelectElement;
  readonly status: HTMLElement;
  readonly diagnostics: HTMLUListElement;
  readonly loading: LoadingController;
  frameRevision: number;
  readonly themeStyles: Readonly<Record<string, string>>;
  readonly themeAttributes: Readonly<
    Record<string, Readonly<Record<string, string>>>
  >;
  readonly themeSettings: PreviewUiOptions["themeSettings"];
  readonly articleTitle: PreviewUiOptions["articleTitle"];
  readonly contentStyles: readonly string[];
  readonly pluginStyles: readonly string[];
  readonly messages: PreviewUiMessages;
};

export type FixturePages = {
  readonly currentPageId?: string;
  readonly pages: readonly FixturePage[];
};

export type FixturePage = {
  readonly id: string;
  readonly title: string;
  readonly markdown: string;
};
