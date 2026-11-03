import { defineOgLayout } from "@riebeckite/og-image";

export default defineOgLayout(({ page, palette, site }) => (
  <div
    style={{
      backgroundColor: palette.background,
      color: palette.foreground,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      justifyContent: "space-between",
      padding: 64,
      width: "100%",
    }}
  >
    <div style={{ color: palette.accent, fontSize: 28 }}>{site.title}</div>
    <div style={{ fontSize: 68, fontWeight: 700 }}>{page.title}</div>
  </div>
));
