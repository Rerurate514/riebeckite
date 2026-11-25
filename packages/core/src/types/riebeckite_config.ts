import type { ContentSource } from "../content/content_source.js";
import type { PublicationConfig } from "../publication/config.js";
import type { PluginInput } from "./plugin.js";
import type { PublishStrategy } from "./publish_strategy.js";
import type { SiteConfig } from "./site_config.js";
import type { ThemeInput } from "./theme_config.js";

export type SpaConfig = {
  prefetch?: false | "hover" | "intent";
  scrollRestoration?: boolean;
  viewTransitions?: boolean;
};

export type UiConfig = {
  /**
   * Pin the UI language instead of following the resolved content language.
   */
  locale?: string;
  /**
   * Per-plugin label dictionaries: namespace → language → label. Namespace and
   * language are matched against plugin label definitions case-insensitively;
   * missing labels fall back to the label shipped with the plugin.
   */
  labels?: Readonly<
    Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>
  >;
};

export interface RiebeckiteIntegrations {
  readonly [integration: string]: unknown;
}

export interface RiebeckiteConfig {
  site: SiteConfig;
  content?: {
    directory?: string;
    source?: ContentSource;
    exclude?: string[];
    filters?: {
      publishStrategy?: PublishStrategy;
    };
  };
  theme?: ThemeInput;
  plugins?: PluginInput[];
  cache?: {
    enabled?: boolean;
    directory?: string;
  };
  provenance?: {
    enabled?: boolean;
  };
  publication?: PublicationConfig;
  integrations?: RiebeckiteIntegrations;
  spa?: boolean | SpaConfig;
  ui?: UiConfig;
}
