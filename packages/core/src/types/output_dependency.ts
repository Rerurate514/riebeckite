export type OutputDependency =
  | { readonly type: "content"; readonly slug: string }
  | { readonly type: "tag"; readonly tag: string }
  | { readonly type: "folder"; readonly folder: string }
  | { readonly type: "file"; readonly path: string }
  | { readonly type: "public-location"; readonly pathname: string }
  | {
      readonly type: "projection";
      readonly projection:
        | "navigation"
        | "recent-posts"
        | "taxonomy-tags"
        | "taxonomy-folders";
    }
  | { readonly type: "external"; readonly id: string }
  | { readonly type: "global" }
  | { readonly type: "unknown" };
