import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors, easeOut, sans } from "../theme";

type CaptionProps = {
  children: ReactNode;
  appear: number;
  disappear: number;
  style?: CSSProperties;
};

export const Caption = ({ children, appear, disappear, style }: CaptionProps) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [appear, appear + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const exit = interpolate(frame, [disappear - 8, disappear], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });
  const rise = interpolate(frame, [appear, appear + 8], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: 176,
          bottom: 56,
          fontFamily: sans,
          fontSize: 34,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          color: colors.text,
          opacity: Math.min(enter, exit),
          translate: `0px ${rise}px`,
          ...style,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
