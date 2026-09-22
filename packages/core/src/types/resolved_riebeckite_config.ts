import type { RiebeckitePlugin } from "./plugin";
import type { PublishStrategy } from "./publish_strategy";
import type { SiteConfig } from "./site_config";
import type { ThemeConfig } from "./theme_config";

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
  theme: Required<Omit<ThemeConfig, "tokens">> & {
    tokens: NonNullable<ThemeConfig["tokens"]>;
  };
  plugins: RiebeckitePlugin[];
};
