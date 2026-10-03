import type { ContentSource } from "../content/content_source.js";
import type { NavigationConfig } from "./navigation_config.js";
import type { PluginInput } from "./plugin.js";
import type { PublishStrategy } from "./publish_strategy.js";
import type { SiteConfig } from "./site_config.js";
import type { ThemeInput } from "./theme_config.js";

export interface RiebeckiteConfig {
  site: SiteConfig;
  navigation?: NavigationConfig;
  content?: {
    directory?: string;
    source?: ContentSource;
    exclude?: string[];
    filters?: {
      publishStrategy?: PublishStrategy;
    };
  };
  markdown?: {
    syntaxHighlight?: {
      theme?: string;
    };
  };
  theme?: ThemeInput;
  plugins?: PluginInput[];
  cache?: {
    enabled?: boolean;
    directory?: string;
  };
}
