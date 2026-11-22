import { AbsoluteFill, Img, staticFile } from "remotion";
import { BrowserWindow, PageScroll } from "./components/Window";
import { colors, mono, sans } from "./theme";

export const Thumbnail = () => (
  <AbsoluteFill style={{ backgroundColor: colors.background }}>
    <div
      style={{ position: "absolute", left: 120, top: 132, fontFamily: sans }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          opacity: 0.95,
        }}
      >
        <Img src={staticFile("logo.png")} style={{ width: 52, height: 52 }} />
        <span
          style={{
            fontSize: 46,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: colors.text,
          }}
        >
          Riebeckite
        </span>
      </div>
      <div
        style={{
          marginTop: 92,
          fontSize: 92,
          lineHeight: 1.04,
          fontWeight: 600,
          letterSpacing: "-0.035em",
          color: colors.text,
        }}
      >
        Your notes.
        <br />
        Your website.
      </div>
      <div
        style={{
          marginTop: 40,
          fontSize: 27,
          color: colors.muted,
          letterSpacing: "-0.005em",
        }}
      >
        Open source · Markdown &amp; Obsidian
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 23,
          fontFamily: mono,
          color: colors.accent,
        }}
      >
        riebeckite.dev
      </div>
    </div>
    <BrowserWindow
      url="riebeckite.dev/blog/obsidian-digital-garden"
      scale={0.58}
      left={820}
      top={248}
    >
      <PageScroll src={staticFile("article.png")} scroll={0} />
    </BrowserWindow>
  </AbsoluteFill>
);
