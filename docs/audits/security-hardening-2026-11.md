# Security & Supply Chain Hardening Audit — 2026-11

## Conclusion

No P0 or P1 issue was identified during this audit. Two P2 supply-chain risks were remediated. The `satori@0.25.0` runtime dependency of `@riebeckite/og-image` was affected by GHSA-wx4j-mvgx-mqwp; it was updated to `satori@0.33.5` and `fflate@0.7.5`. Three CI references to the mutable `actions/cache@v4` tag were pinned to verified commit `0057852bfaa89a56745cba8c7296529d2fc39830`, with a regression check added.

PASS in this report means that a command was run during this audit and its expected result was confirmed. External service settings, production environments, and real vaults were not modified.

## Trust boundaries and attack surface

| Boundary | Privileges and side effects | Primary defenses | Status |
| --- | --- | --- | --- |
| Markdown, frontmatter, YAML/JSON | Produces static HTML, search indexes, and article metadata | `rehype-sanitize` after `rehype-raw`; removes dangerous URLs, event attributes, and scripts | PASS |
| Fetched external content | Plugins can make HTTP requests and produce HTML/data | Per-plugin URL, size, and DNS policies. Plugin output is trusted code | PARTIAL |
| Vault, assets, mutation, migration | Read, create, update, delete, and back up files | Logical-path validation, `lstat`, symlink exclusion, journals, and locks | PARTIAL |
| Official and third-party Plugins, Themes | Arbitrary Node and browser code, hooks, and client entries | No sandbox; the installer is the trust boundary | PASS (design confirmed) |
| Vite, HonoX, Inspector, Bridge | Local HTTP and development-time file/mutation operations | Loopback, Host, Origin, token, and 1 MiB body limit | PARTIAL |
| Browser runtime | DOM, URLs, search, and SPA navigation | Markdown sanitizer; Plugin/Theme HTML is excluded | PARTIAL |
| GitHub Actions/publication | CI execution, artifacts, npm/Cloudflare publication | Least-privilege workflows, artifact verification, and SHA pins | PARTIAL |
| npm packages | Install and runtime dependencies | pnpm lockfile integrity, package files, and audit | PASS |

## STRIDE summary

| Threat | Riebeckite-specific path | Assessment |
| --- | --- | --- |
| Spoofing | Inspector/Bridge localhost token | PARTIAL. Code checks loopback, Host, Origin, and uses constant-time token comparison. External binding and reverse proxies were not verified. |
| Tampering | Mutation plans/journals, SSG cache, CI cache/artifacts | PARTIAL. Plan fingerprints, symlink exclusion, and artifact verification were confirmed. A general TOCTOU window remains between file checks and operations because Node lacks a portable directory-handle API. |
| Repudiation | Publication state, migration journal | PASS. Publication state and mutation journals record state. |
| Information disclosure | Vault traversal, Inspector, publication configuration | PARTIAL. Existing path/symlink tests passed. Physical Windows junction/reparse points and production secret settings were not verified. |
| Denial of service | Endpoint/Bridge body, images/SVG, external fetches | PARTIAL. HonoX and Bridge's 1 MiB limits were confirmed. Image-decoder and external-provider load testing was not performed. |
| Elevation of privilege | Plugin/Theme dynamic imports, CI actions, publishing | PASS (explicit trust boundary). Plugins/Themes are unsandboxed and have Node privileges. This audit removed mutable CI action pins. |

## Validated defenses

- `packages/core/test/markdown_pipeline.test.ts` verifies removal of scripts, event handlers, iframes, `javascript:`, `data:text`, SVG `foreignObject`, and style attributes.
- `packages/node/test/content_migration_security.test.ts` verifies tampered plans, path traversal, vault symlinks, out-of-vault journals, and concurrent locks with temporary fixtures.
- Plugin namespaces in `packages/core/src/plugin/plugin_cache.ts` only allow `[A-Za-z0-9._-]` and convert invalid names to SHA-256. This does not prevent arbitrary code execution by third-party Plugins.
- `packages/dev-inspector/src/development_inspector_security.ts` checks loopback sockets/listeners/Host, rejects forwarded headers, and validates Origin and token.

## Vulnerability matrix

| ID | Severity | Reachability | Root cause | Remediation | Status |
| --- | --- | --- | --- | --- | --- |
| SC-01 | P2 | When `@riebeckite/og-image` processes malicious SVG | `satori@0.25.0` affected by GHSA-wx4j-mvgx-mqwp | Updated to `satori@0.33.5` | PASS |
| SC-02 | P2 | Each CI run for affected jobs | `actions/cache@v4` was a mutable tag | SHA pin and static regression test | PASS |
| FS-01 | P2 candidate | Requires a local attacker able to manipulate the Vault concurrently | General TOCTOU window between `lstat` and subsequent read/write/rename | A complete portable mitigation is not implemented; assume a permission-separated Vault and trusted local users | UNVERIFIED |
| HTML-01 | Design trust boundary | When an untrusted Plugin/Theme is installed | Plugin-generated HTML and Node code are outside a sandbox | No compatibility-breaking false sandbox was added; documented boundary | PASS |

## Supply-chain result

`pnpm audit --json` was run against the lockfile.

| Before | Remediation | After |
| --- | --- | --- |
| moderate 1: `satori@0.25.0` / GHSA-wx4j-mvgx-mqwp | `satori@^0.33.5`, `fflate@<0.7.5: 0.7.5` override | critical/high/moderate/low/info all 0 |

The lockfile retains pnpm integrity data. OSV-Scanner, OpenSSF Scorecard, and published tarball contents were not run in this environment and are UNVERIFIED. Build scripts permitted by `pnpm install` are listed in the workspace `allowBuilds` policy.

## CI/CD and publication

- No `pull_request_target` was found in the reviewed workflows.
- `ci.yml` defaults to `contents: read`; only the publish job has `contents: write` to update publication state.
- `scripts/check_workflow_security.mjs` checks all external `uses:` references for full SHA pins. Local actions are allowed.
- npm Trusted Publishing, OIDC, Cloudflare token permissions, environment approvals, and branch protection are repository-external settings and remain UNVERIFIED. They were not changed.

## Regression harness

| Group | Evidence | Status |
| --- | --- | --- |
| Malicious Markdown/HTML corpus | `packages/core/test/markdown_pipeline.test.ts` | PASS |
| Filesystem boundary | `packages/node/test/content_migration_security.test.ts` | PASS |
| Plugin trust boundary | Security model and plugin cache inspection | PASS (design confirmed) |
| Browser XSS | Markdown corpus; no live-browser exploit was run | PARTIAL |
| Build artifact integrity | `scripts/ci/build_artifact.test.mjs` | UNVERIFIED (not run) |
| Publication workflow | `scripts/check_workflow_security.test.mjs` and workflow scan | PASS |
| Dependency vulnerabilities | `pnpm audit --json` | PASS |

## Compatibility, performance, and residual risk

Five PNG renderer regression tests passed before and after the `satori` update. The CI action pins retain the action version and only make its fetched revision immutable. The SHA static check scans YAML under `.github` only and has no runtime effect on normal builds.

Third-party Plugins/Themes are trusted Node/browser code and this audit does not make malicious packages safe. CSP on published sites, external embed providers, physical Windows junctions in real Vaults, CI secret values, and cloud permissions are not guaranteed by this audit.
