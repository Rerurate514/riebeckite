---
name: riebeckite-deployment
description: Use when configuring or changing Riebeckite deployment, CI publishing, hosting output, or external content checkout.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Deployment workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Identify the hosting target, build command, output directory, public origin, and content source before changing deployment files.
2. Inspect existing CI, deployment configuration, and provider documentation. Change only the selected deployment path.
3. Keep credentials in the provider's secret store. Never commit access tokens, deployment keys, or external-content credentials.
4. When content is external, verify checkout order, read-only access requirements, content path, and local/CI parity.
5. Preserve redirects, canonical URLs, locale paths, cache headers, and asset paths unless the deployment change explicitly requires them.
6. Run `npm run check` and `npm run build` locally. Inspect the generated output and provider-specific configuration before publishing.
7. After deployment, verify the public URL, representative pages, assets, feeds or sitemap, and any configured redirects.
8. Report the target, secrets required by name only, configuration changes, verification result, and rollback route.
