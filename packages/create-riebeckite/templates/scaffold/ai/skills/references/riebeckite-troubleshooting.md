# Troubleshooting reference

## Establish evidence first

Record the exact command, affected source or URL, expected result, observed result, and first diagnostic. Reproduce before editing. With MCP, inspect context, diagnostics, publication state, and links for the affected source.

Run:

```sh
npm run doctor
npm run check
```

Classify the failure before changing files:

- configuration or capability resolution;
- source discovery, frontmatter, or publication state;
- link graph or route resolution;
- Plugin or Theme contract;
- generated output;
- local environment or dependency installation.

## Fix and verify

Reduce to the smallest reproduction and inspect the owning layer. Change the root cause; do not suppress a diagnostic, loosen validation, or make unrelated configuration changes.

Verify the original reproduction first, then run the narrowest relevant check. Run `npm run build` when output behavior changed. State any environment dependency that was not verified.
