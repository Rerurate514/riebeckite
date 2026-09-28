import type { PluginInput } from "./plugin";
import type { PublishStrategy } from "./publish_strategy";
import type { SiteConfig } from "./site_config";
import type { ThemeInput } from "./theme_config";
import type { ContentSource } from "../content/content_source";

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
  markdown?: {
    syntaxHighlight?: {
      theme?: string;
    };
  };
  theme?: ThemeInput;
  plugins?: PluginInput[];
}
