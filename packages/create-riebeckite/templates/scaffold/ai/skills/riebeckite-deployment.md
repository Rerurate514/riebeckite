---
name: riebeckite-deployment
description: Use when configuring, changing, or verifying a Riebeckite site deployment.
riebeckiteVersion: "{{riebeckite-version}}"
---

# Deployment workflow

Read `references/guide.md` and complete `assets/checklist.md`.

1. Identify the deployment provider, build command, output directory, public origin, and content source before changing anything.
2. Inspect the existing workflow, provider configuration, scripts, and environment variable names. Preserve the working deployment path.
3. Keep secrets in the provider's secret store. Report only secret names, never values, and never commit them.
4. For external content, verify the checkout path, repository permissions, fetch order, and `content.directory` alignment.
5. Preserve base paths, locales, redirects, canonical URLs, asset URLs, and cache headers.
6. Run `npm run check` and `npm run build` locally. Inspect `dist/` for the expected routes, assets, feeds, and redirects.
7. Deploy through the project's existing command or CI workflow. Do not replace a working provider setup without an explicit request.
8. Verify the public origin, a representative page, assets, feeds/sitemap, redirects, and one deep link after deployment.
9. Identify the previous artifact, revision, or provider deployment as the rollback target before declaring success.
10. Report the deployment target, changes, verification URLs/results, secret names, and rollback path.
