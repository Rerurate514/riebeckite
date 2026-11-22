import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { colors, easeInOut, easeOut, mono, sans } from "../theme";

type Segment = { text: string; color?: string; weight?: number };

const key = "#7f9fbf";
const val = "#d8e4f2";
const body = "#b9c6d6";
const rule = "#4a5869";
const heading = "#eef4fb";

const lines: Segment[][] = [
  [{ text: "---", color: rule }],
  [
    { text: "title", color: key },
    { text: ":", color: rule },
    {
      text: ' "Obsidian as a Digital Garden: Why the Tool Fits the Practice"',
      color: val,
    },
  ],
  [
    { text: "description", color: key },
    { text: ":", color: rule },
    {
      text: " What a digital garden actually is, where the idea came from,",
      color: val,
    },
  ],
  [
    {
      text: "  and how Obsidian's features map onto it — plus how each publishing tool",
      color: val,
    },
  ],
  [{ text: "  handles selective sharing.", color: val }],
  [
    { text: "date", color: key },
    { text: ":", color: rule },
    { text: " 2026-11-21", color: val },
  ],
  [
    { text: "tags", color: key },
    { text: ":", color: rule },
  ],
  [
    { text: "  - ", color: rule },
    { text: "obsidian", color: body },
  ],
  [
    { text: "  - ", color: rule },
    { text: "publishing", color: body },
  ],
  [
    { text: "  - ", color: rule },
    { text: "digital-garden", color: body },
  ],
  [{ text: " " }],
  [
    {
      text: "Disclosure first: this blog runs on Riebeckite, a framework I develop, and",
      color: body,
    },
  ],
  [{ text: "Riebeckite ships a digital-garden preset.", color: body }],
  [{ text: " " }],
  [
    {
      text: "## What a digital garden actually is",
      color: heading,
      weight: 600,
    },
  ],
];

const panelStyle: CSSProperties = {
  position: "absolute",
  left: 370,
  top: 200,
  width: 1180,
  height: 580,
  borderRadius: 14,
  background: colors.panel,
  border: `1px solid ${colors.panelBorder}`,
  boxShadow: "0 22px 60px rgba(0, 0, 0, 0.32)",
  overflow: "hidden",
};

export const MarkdownSource = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const exit = interpolate(frame, [92, 102], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const rise = interpolate(frame, [0, 12], [10, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{ opacity: enter * exit }}>
      <div style={{ ...panelStyle, translate: `0px ${rise}px` }}>
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: `1px solid ${colors.panelBorder}`,
          }}
        >
          <span
            style={{
              fontFamily: mono,
              fontSize: 15,
              color: "#93a1b3",
              letterSpacing: "0.01em",
            }}
          >
            obsidian-digital-garden.md
          </span>
          <span
            style={{
              fontFamily: sans,
              fontSize: 11,
              color: "#5d6b7d",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Markdown
          </span>
        </div>
        <div
          style={{
            padding: "24px 30px",
            fontFamily: mono,
            fontSize: 19,
            lineHeight: "32px",
          }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{ whiteSpace: "pre", height: 32 }}>
              {line.map((seg, j) => (
                <span
                  key={j}
                  style={{ color: seg.color, fontWeight: seg.weight ?? 400 }}
                >
                  {seg.text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const LockIcon = () => (
  <svg
    aria-hidden="true"
    width="10"
    height="12"
    viewBox="0 0 10 12"
    fill="none"
  >
    <rect
      x="0.75"
      y="5"
      width="8.5"
      height="6.25"
      rx="1.25"
      stroke="#66788c"
      strokeWidth="1.2"
    />
    <path
      d="M2.75 5V3.5a2.25 2.25 0 0 1 4.5 0V5"
      stroke="#66788c"
      strokeWidth="1.2"
    />
  </svg>
);

type WindowProps = {
  url: string;
  opacity?: number;
  scale?: number;
  left?: number;
  top?: number;
  children: ReactNode;
};

export const BrowserWindow = ({
  url,
  opacity = 1,
  scale = 1,
  left = 176,
  top = 32,
  children,
}: WindowProps) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width: 1600,
      borderRadius: 12,
      background: "#171b21",
      border: "1px solid #2a333f",
      boxShadow: "0 30px 80px rgba(0, 0, 0, 0.45)",
      overflow: "hidden",
      transformOrigin: "0 0",
      scale,
      opacity,
    }}
  >
    <div
      style={{
        position: "relative",
        height: 42,
        background: "#191f27",
        borderBottom: "1px solid #262f3a",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 6,
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            background: "#39424e",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: "50%",
          translate: "-50% 0px",
          height: 26,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "0 14px",
          borderRadius: 7,
          background: "#11161c",
          border: "1px solid #2a333f",
          fontFamily: mono,
          fontSize: 13,
          color: "#7f8ea2",
        }}
      >
        <LockIcon />
        {url}
      </div>
    </div>
    <div
      style={{
        position: "relative",
        width: 1600,
        height: 900,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  </div>
);

export const PageScroll = ({
  src,
  scroll,
}: {
  src: string;
  scroll: number;
}) => (
  <Img
    src={src}
    style={{
      display: "block",
      width: 1600,
      translate: `0px ${-scroll}px`,
    }}
  />
);
