import type { PublishStrategy } from "./publish_strategy";
import type { SiteConfig } from "./site_config";

export interface RiebeckiteConfig {
  site: SiteConfig;
  content?: {
    directory?: string;
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
}
