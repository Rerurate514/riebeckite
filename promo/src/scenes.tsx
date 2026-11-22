import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Caption } from "./components/Caption";
import { BrowserWindow, MarkdownSource, PageScroll } from "./components/Window";
import { Cursor, useCursorState } from "./components/Cursor";
import { colors, easeInOut, easeOut, sans, mono } from "./theme";

export const SceneNotes = () => {
  return (
    <AbsoluteFill>
      <MarkdownSource />
      <Caption appear={10} disappear={92}>
        Your Obsidian notes.
      </Caption>
    </AbsoluteFill>
  );
};

export const SceneWebsite = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const scale = interpolate(frame, [0, 16], [0.985, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const scroll = interpolate(frame, [20, 120], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  return (
    <AbsoluteFill>
      <BrowserWindow url="riebeckite.dev/blog/obsidian-digital-garden" opacity={enter} scale={scale}>
        <PageScroll src={staticFile("article.png")} scroll={scroll} />
      </BrowserWindow>
      <Caption appear={6} disappear={138}>
        Your website.
      </Caption>
    </AbsoluteFill>
  );
};

const searchStates = [
  "search-0.png",
  "search-1.png",
  "search-2.png",
  "search-3.png",
  "search-4.png",
  "search-5.png",
  "search-6.png",
];

export const SceneDemo = () => {
  const frame = useCurrentFrame();
  const cursor = useCursorState();

  const obsidianIn = interpolate(frame, [226, 240], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const modalIn = interpolate(frame, [70, 76], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const modalOut = interpolate(frame, [226, 236], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const modalScale = interpolate(frame, [70, 76], [0.995, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  let searchState = 0;
  if (frame >= 104 && frame < 152) {
    searchState = Math.min(6, 1 + Math.floor((frame - 104) / 8));
  } else if (frame >= 152) {
    searchState = -1;
  }

  const scroll = interpolate(frame, [240, 312], [0, 722], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  const url =
    frame < 232
      ? "riebeckite.dev/docs/getting-started"
      : "riebeckite.dev/docs/plugins/showcase/obsidian-syntax";

  const windowOut = interpolate(frame, [442, 456], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  return (
    <AbsoluteFill>
      <BrowserWindow url={url} opacity={windowOut}>
        <div style={{ position: "absolute", inset: 0 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <PageScroll src={staticFile("docs.png")} scroll={0} />
          </div>
          <div style={{ position: "absolute", inset: 0, opacity: obsidianIn }}>
            <PageScroll src={staticFile("obsidian.png")} scroll={scroll} />
          </div>
          {frame >= 70 && frame < 236 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                opacity: modalIn * modalOut,
                scale: modalScale,
                transformOrigin: "50% 42%",
              }}
            >
              <Img
                src={staticFile(searchState === -1 ? "search-results.png" : searchStates[searchState])}
                style={{ display: "block", width: 1600, height: 900 }}
              />
            </div>
          ) : null}
          <Cursor state={cursor} />
        </div>
      </BrowserWindow>
      <Caption appear={150} disappear={214}>
        Search every note.
      </Caption>
      <Caption appear={330} disappear={440}>
        Obsidian syntax, rendered.
      </Caption>
    </AbsoluteFill>
  );
};

export const SceneClosing = () => {
  const frame = useCurrentFrame();
  const kicker = interpolate(frame, [2, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const logo = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const tagline = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const url = interpolate(frame, [26, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const rise = (start: number) =>
    interpolate(frame, [start, start + 12], [10, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOut,
    });

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily: sans,
        }}
      >
        <div
          style={{
            fontSize: 21,
            color: "#8b98a8",
            letterSpacing: "0.01em",
            opacity: kicker,
            translate: `0px ${rise(2)}px`,
          }}
        >
          A TypeScript framework for Markdown and Obsidian sites.
        </div>
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 20,
            opacity: logo,
            translate: `0px ${rise(10)}px`,
          }}
        >
          <Img src={staticFile("logo.png")} style={{ width: 64, height: 64 }} />
          <span style={{ fontSize: 62, fontWeight: 600, letterSpacing: "-0.02em", color: colors.text }}>
            Riebeckite
          </span>
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 30,
            color: colors.muted,
            letterSpacing: "-0.005em",
            opacity: tagline,
            translate: `0px ${rise(18)}px`,
          }}
        >
          Open source. Built for your content.
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: mono,
            fontSize: 21,
            color: colors.accent,
            opacity: url,
            translate: `0px ${rise(26)}px`,
          }}
        >
          github.com/Rerurate514/riebeckite
        </div>
      </div>
    </AbsoluteFill>
  );
};
