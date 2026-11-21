# riebeckite-troubleshooting checklist

- [ ] Capture command, expected result, observed result, source, and first diagnostic.
- [ ] Reproduce the failure before changing files.
- [ ] Run `npm run doctor` and `npm run check`.
- [ ] Classify the owning layer and make the smallest root-cause fix.
- [ ] Verify the original reproduction and the narrowest relevant check.
- [ ] Run `npm run build` if output behavior changed.
- [ ] Report cause, evidence, validation, and unverified environment dependencies.
