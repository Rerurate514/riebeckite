# Configuration reference

## Inspect before changing

Read `riebeckite.config.ts`, package scripts, the configured content root, deployment files, and active Plugins and Themes. Confirm the effective setting from the project; do not guess defaults from framework documentation.

## Change boundaries

- Change the smallest setting that fulfils the request.
- Preserve unknown fields and existing ordering.
- Resolve paths from the project root and confirm whether content belongs in this repository or an external content repository.
- Keep local-development behavior separate from publication behavior.
- Do not add a provider, environment variable, Plugin, or Theme without a concrete requirement.
- Never place secrets in configuration, generated documentation, commands, or committed files.

## Effects to check

| Changed area | Verify |
| --- | --- |
| Content root or locale | source discovery and resulting routes |
| URL, permalink, or publication | canonical URLs, redirects, and output |
| Plugin or Theme | option validity and public contract |
| Deployment | provider files, environment boundary, and rollback path |

Run `npm run check` and `npm run build`. Inspect generated routes/output whenever the change can affect publication.
