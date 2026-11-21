# Application component checklist

- [ ] Inspect the affected route, content, Theme, and existing components.
- [ ] Confirm the public URL, params, and route state contract.
- [ ] Choose the correct ownership boundary: Plugin, Theme, application, or config.
- [ ] Reuse existing UI primitives and Theme tokens.
- [ ] Preserve route data, error states, and redirects.
- [ ] Use semantic HTML, accessible names, and visible focus.
- [ ] Check keyboard order and heading hierarchy.
- [ ] Check narrow layouts, long content, empty states, and reduced motion.
- [ ] Do not encode meaning in colour alone.
- [ ] Add or update focused tests where the project supports them.
- [ ] Run `npm run check`.
- [ ] Run `npm run build` when routes, rendering, or assets changed.
- [ ] Inspect the affected route and one unrelated route in a browser.
- [ ] Report URL/accessibility impact, tests, and remaining risk.
