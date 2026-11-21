# riebeckite-upgrade checklist

- [ ] Record current and target versions, dependency ranges, and local extensions.
- [ ] Run `npm exec riebeckite upgrade --to <version>`.
- [ ] Read migration output before editing configuration or content.
- [ ] Keep feature work separate from the upgrade.
- [ ] Ask before syncing outdated generated Skills.
- [ ] Run `npm run check` and `npm run build`.
- [ ] Report migrations, validation, deferred work, compatibility, and rollback.
