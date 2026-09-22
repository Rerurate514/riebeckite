import type { PublishStrategy } from "./publish_strategy";
import type { SiteConfig } from "./site_config";

export type ResolvedRiebeckiteConfig = {
  site: Required<SiteConfig>;
  content: {
    directory: string;
    exclude: string[];
    filters: {
      publishStrategy: PublishStrategy;
    };
  };
  markdown: {
    syntaxHighlight: {
      theme: string;
    };
  };
};
