# Branding your site

A theme controls how every Riebeckite site looks — colors, typography, spacing, and layout. The assets that make a site yours — its icon, header logo, and link preview image — live outside the theme. This guide replaces them. To change the look of the site itself, see [Change Your Theme](../getting-started/first-theme.md).

## Site icon

Generated sites ship `public/favicon.ico` and reference it from `app/routes/_renderer.tsx`:

```tsx
<link rel="icon" href="/favicon.ico" />
```

To keep this setup, replace `public/favicon.ico` with an ICO file of the same name. No code change is needed.

To use a PNG or SVG icon instead, put the file under `public/` and update the `href`. Add `type` when the URL does not make the format obvious:

```tsx
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
```

## Header logo

The `starter` and `showcase` presets render a header. `app/components/site-header.tsx` shows the site title next to a 28×28 logo:

```tsx
<img src="/riebeckite-logo.png" alt="" class="site-header__logo" width="28" height="28" />
```

Replace `public/riebeckite-logo.png` with your own image. A square PNG with a transparent background fits the layout best. If you rename the file, update `src` to match.

The `empty` and `minimal` presets have no header, so there is no logo to replace.

## Link preview image

Link previews (Open Graph images) use `site.defaultOgImage` as their fallback. Add the field to the `site` block in `riebeckite.config.ts`:

```ts
site: {
  title: "My Blog",
  baseUrl: "https://example.com",
  defaultOgImage: "/ogp.png",
},
```

Put the file under `public/` (here `public/ogp.png`) so it is served at `/ogp.png`. A 1200×630 PNG or JPEG is the common size. Set `site.baseUrl` to the real public URL so the absolute image URL in generated metadata is correct.

Individual pages can override the fallback. The [SEO plugin](../plugins/seo.md) reads `image` or `ogImage` from frontmatter, and its `defaultImage` option takes precedence over `site.defaultOgImage` when you prefer to configure the image there.

## Title and description

`site.title` is the site name and `site.description` is the summary used by SEO and feeds. Set them once when you [point the settings at your site](../getting-started/installation.md#point-the-settings-at-your-site). The full `site` block is documented in [Configuration](../reference/configuration.md).

## Verify

Run the development server and check the browser tab and the header:

```sh
npm exec riebeckite dev
```

Then build and confirm the assets are copied to `dist/`:

```sh
npm exec riebeckite build
```
