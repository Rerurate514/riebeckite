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
   * Per-language UI label dictionaries. Keys are language codes matched
   * case-insensitively against the UI language; missing keys fall back to the
   * built-in English labels.
   */
  labels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
};

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
  spa?: boolean | SpaConfig;
  ui?: UiConfig;
}
