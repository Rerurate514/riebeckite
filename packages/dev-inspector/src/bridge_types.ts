import type http from "node:http";
import type { CompletedContentBuildSnapshot } from "@riebeckite/core";
import type { ViteDevServer } from "vite";
import type { BridgeMutationStore } from "./bridge_mutation.js";

export type RiebeckiteBridgeOptions = {
  token?: string;
  mutationToken?: string;
  mutationApprovalToken?: string;
  contentRoot?: string | (() => string);
  siteId?: string | (() => string | undefined);
  siteName?: string | (() => string | undefined);
  contentRootId?: string | (() => string | undefined);
  contentSourceKind?:
    | "integrated"
    | "separate-local"
    | "separate-git"
    | "custom-mapping";
  publicOrigin?: string | (() => string | undefined);
  contentFormats?: () => {
    readonly isContentPath: (path: string) => boolean;
    readonly toSlug: (path: string) => string | undefined;
  };
  getSnapshot: (
    server: ViteDevServer,
  ) =>
    | CompletedContentBuildSnapshot
    | undefined
    | Promise<CompletedContentBuildSnapshot | undefined>;
};

export type BridgeServerState = {
  revision: number;
  mutations: BridgeMutationStore | undefined;
  eventClients: Set<http.ServerResponse>;
  serverId: string;
};

export type BridgeRequestContext = {
  options: RiebeckiteBridgeOptions;
  server: ViteDevServer;
  token: string;
  state: BridgeServerState;
};
