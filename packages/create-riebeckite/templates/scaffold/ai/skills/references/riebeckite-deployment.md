# Deployment reference

## Establish the delivery contract

Before editing CI or hosting configuration, identify the provider, build command, output directory, public origin, and content source. Read the project's existing workflow and provider documentation rather than replacing the pipeline with a generic template.

## Security and external content

Use the provider's secret store for tokens, deploy keys, and repository credentials. Mention required secret names in reports, never their values. For an external content repository, ensure the workflow checks it out before the build, uses the configured content path, and has only the permissions it needs.

## Preserve public behavior

Deployment changes can alter base paths, locale routes, redirects, canonical URLs, caching, and asset URLs. Run:

```bash
npm run check
npm run build
```

Inspect generated output before publishing. After publishing, check the public URL, a representative page, assets, feeds or sitemap, and redirects. Keep a rollback target: the previous deployment artifact, revision, or provider release.
