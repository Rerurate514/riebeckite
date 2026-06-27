export interface RiebeckiteConfig {
  site: {
    title: string;
    description?: string;
    author?: string;
    baseUrl?: string;
  };
  content?: {
    directory?: string;
    exclude?: string[];
    filters?: {
      /**
       * 'explicit'  : Publish “only” those items where `publish: true` is explicitly specified
       * 'selective' : In principle, everything is public. However, entries with `private: true` (or `draft: true`) are excluded.
       */
      publishStrategy?: "explicit" | "selective";
    };
  };
  markdown?: {};
}

export function defineConfig(config: RiebeckiteConfig): RiebeckiteConfig {
  return config;
}
