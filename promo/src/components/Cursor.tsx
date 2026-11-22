import { interpolate, useCurrentFrame } from "remotion";
import { easeInOut } from "../theme";

export type CursorState = {
  x: number;
  y: number;
  visible: number;
  press: number;
};

type CursorProps = {
  state: CursorState;
};

export const Cursor = ({ state }: CursorProps) => (
  <svg
    width="24"
    height="26"
    viewBox="0 0 24 26"
    style={{
      position: "absolute",
      left: state.x - 2,
      top: state.y - 2,
      opacity: state.visible,
      scale: state.press,
      transformOrigin: "2px 2px",
      filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45))",
    }}
  >
    <path
      d="M2.5 1.8 L2.5 21.2 L7.4 16.4 L10.4 23.4 L13.4 22.1 L10.4 15.2 L17.2 14.8 Z"
      fill="#ffffff"
      stroke="#11161c"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const pressAt = (frame: number, start: number) =>
  interpolate(frame, [start, start + 2, start + 5], [1, 0.9, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const useCursorState = (): CursorState => {
  const frame = useCurrentFrame();
  const visible = interpolate(frame, [30, 38, 232, 240], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const firstMove = interpolate(frame, [42, 66], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const toInput = interpolate(frame, [76, 86], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });
  const toResult = interpolate(frame, [210, 222], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOut,
  });

  let x = 1470;
  let y = 830;
  let px = x;
  let py = y;

  if (frame >= 42) {
    px = interpolate(firstMove, [0, 1], [1470, 1312]);
    py = interpolate(firstMove, [0, 1], [830, 42]);
    x = px;
    y = py;
  }
  if (frame >= 76) {
    x = interpolate(toInput, [0, 1], [1312, 792]);
    y = interpolate(toInput, [0, 1], [42, 190]);
  }
  if (frame >= 210) {
    x = interpolate(toResult, [0, 1], [792, 787]);
    y = interpolate(toResult, [0, 1], [190, 317]);
  }

  const press = Math.min(pressAt(frame, 66), pressAt(frame, 222));

  return { x, y, visible, press };
};
