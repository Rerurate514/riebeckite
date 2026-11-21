# Riebeckite upgrade checklist

- [ ] Record current `@riebeckite/*` versions, lockfile, and package manager.
- [ ] Inspect local Plugins, Themes, content formats, scripts, Skills, and deployment.
- [ ] Capture baseline `check`, `doctor`, and `build` results.
- [ ] Read release notes and migration guidance.
- [ ] Run `npm exec riebeckite upgrade --to <version>` as a preflight.
- [ ] Resolve BLOCKED or UNVERIFIED results before installing.
- [ ] Update all `@riebeckite/*` packages together with the package manager.
- [ ] Do not hand-edit the lockfile.
- [ ] Apply required configuration, Plugin, Theme, or content migrations.
- [ ] Run `npm run check`, `npm run doctor`, and `npm run build`.
- [ ] Inspect routes, assets, feeds, redirects, and publication state.
- [ ] Review Skills sync output; accept replacement only with user consent.
- [ ] Record the previous versions and lockfile as the rollback target.
- [ ] Report versions, preflight, migrations, verification, Skill decision, and rollback.
