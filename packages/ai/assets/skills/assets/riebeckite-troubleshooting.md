# Troubleshooting checklist

- [ ] Capture the exact command, full error, project root, and versions.
- [ ] Identify recent changes and whether the failure is local, CI, or deployed.
- [ ] Reproduce with the smallest failing command.
- [ ] Run `npm run check`.
- [ ] Run `npm run doctor`.
- [ ] Run `npm exec riebeckite inspect config` when paths or resolved values are unclear.
- [ ] Run `npm exec riebeckite inspect content --list` before link/embed diagnosis.
- [ ] Classify the failure before editing.
- [ ] Test one hypothesis at a time.
- [ ] Fix the shared root cause, not only the first symptom.
- [ ] Do not disable checks or suppress diagnostics to pass.
- [ ] Re-run the failing command and a broader check/build.
- [ ] Report cause, evidence, changes, verification, and remaining risk.
