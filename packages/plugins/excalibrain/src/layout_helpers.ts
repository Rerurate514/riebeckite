import type {
  ExcaliBrainNodeRole,
  ExcaliBrainRegion,
  ExcaliBrainRole,
} from "./types.js";

export const EXCALIBRAIN_REGION_ORDER: readonly ExcaliBrainRegion[] = [
  "parents",
  "children",
  "left-friends",
  "right-friends",
  "previous",
  "next",
  "siblings",
];

export const ROLE_ORDER: readonly ExcaliBrainRole[] = [
  "parent",
  "child",
  "leftFriend",
  "rightFriend",
  "previous",
  "next",
  "sibling",
];

export const ROLE_REGION: Record<ExcaliBrainNodeRole, ExcaliBrainRegion> = {
  parent: "parents",
  child: "children",
  leftFriend: "left-friends",
  rightFriend: "right-friends",
  previous: "previous",
  next: "next",
  sibling: "siblings",
  center: "center",
};

export const ROLE_ANCHOR: Record<
  ExcaliBrainRole,
  { angle: number; radius: "near" | "far" }
> = {
  parent: { angle: -90, radius: "near" },
  child: { angle: 90, radius: "near" },
  leftFriend: { angle: 180, radius: "near" },
  rightFriend: { angle: 0, radius: "near" },
  previous: { angle: 180, radius: "far" },
  next: { angle: 0, radius: "far" },
  sibling: { angle: 0, radius: "far" },
};
