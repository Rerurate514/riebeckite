import type { ContentManifest } from "@riebeckite/core";

export type ExcaliBrainRenderMode = "build" | "client" | "both";

/**
 * ExcaliBrain relationship roles. Mirrors Zsolt Viczián's ExcaliBrain:
 * parents, children, left/right friends, previous/next, and siblings.
 */
export type ExcaliBrainRole =
  | "parent"
  | "child"
  | "leftFriend"
  | "rightFriend"
  | "previous"
  | "next"
  | "sibling";

export type ExcaliBrainNodeRole = ExcaliBrainRole | "center";

export type ExcaliBrainRelationType = "defined" | "inferred";

/** Ontology field overrides. Field names are matched case-insensitively. */
export type ExcaliBrainOntology = {
  parents?: readonly string[];
  children?: readonly string[];
  leftFriends?: readonly string[];
  rightFriends?: readonly string[];
  previous?: readonly string[];
  next?: readonly string[];
  hidden?: readonly string[];
};

export type ExcaliBrainOptions = {
  /** Where the map is rendered: build-time SVG, client-side, or both. */
  render?: ExcaliBrainRenderMode;
  /** Append the map to notes without an explicit fence. */
  auto?: boolean;
  /** Show the optional heading. */
  heading?: boolean;
  /** Heading text. */
  headingText?: string;
  /** Root CSS class. */
  className?: string;
  /** Maximum nodes rendered per region. */
  maxPerRegion?: number;
  /** Infer relationships from links when no explicit relation exists. */
  infer?: boolean;
  /** Infer siblings from the children of this note's parents. */
  siblings?: boolean;
  /** Ontology field overrides. */
  ontology?: ExcaliBrainOntology;
  /** Include notes marked hidden by the ontology. */
  showHidden?: boolean;
  /** SVG viewBox width. */
  width?: number;
  /** SVG viewBox height. */
  height?: number;
  /** Fence language that produces a map. */
  language?: string;
};

export type ExcaliBrainNode = {
  id: string;
  slug: string | null;
  title: string;
  permalink: string | null;
  virtual: boolean;
  role: ExcaliBrainNodeRole;
  relationType: ExcaliBrainRelationType;
};

export type ExcaliBrainLink = {
  from: string;
  to: string;
  role: ExcaliBrainRole;
  relationType: ExcaliBrainRelationType;
};

export type ExcaliBrainGraph = {
  center: ExcaliBrainNode;
  nodes: ExcaliBrainNode[];
  links: ExcaliBrainLink[];
};

export type ExcaliBrainBuildInput = {
  slug: string;
  frontmatter: Record<string, unknown>;
  markdown: string;
  manifest: ContentManifest;
  options?: ExcaliBrainOptions;
};

export type ExcaliBrainRegion =
  | "parents"
  | "children"
  | "left-friends"
  | "right-friends"
  | "previous"
  | "next"
  | "siblings"
  | "center";

export type ExcaliBrainPositionedNode = {
  id: string;
  role: ExcaliBrainNodeRole;
  region: ExcaliBrainRegion;
  relationType: ExcaliBrainRelationType;
  title: string;
  slug: string | null;
  permalink: string | null;
  virtual: boolean;
  /** Top-left corner of the node box. */
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExcaliBrainPositionedLink = {
  from: string;
  to: string;
  role: ExcaliBrainRole;
  relationType: ExcaliBrainRelationType;
};

export type ExcaliBrainLayout = {
  width: number;
  height: number;
  nodes: ExcaliBrainPositionedNode[];
  links: ExcaliBrainPositionedLink[];
};

export type ExcaliBrainClientOptions = {
  className?: string;
};

export type ElementNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

export type TextNode = {
  type: "text";
  value: string;
};

export type RawNode = {
  type: "raw";
  value: string;
};

export type HastNode =
  | ElementNode
  | TextNode
  | RawNode
  | { type: string; [key: string]: unknown };
