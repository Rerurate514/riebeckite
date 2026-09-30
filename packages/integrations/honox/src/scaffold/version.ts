// Version spec applied to every Riebeckite package a scaffold depends on.
// `pnpm bump:version` rewrites this value together with the workspace
// manifests, and scripts/check_scaffold.mjs fails when it drifts from the
// release version.
export const RIEBECKITE_VERSION = "^0.0.7";
