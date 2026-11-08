export const REACTION_TYPES = [
  "like",
  "heart",
  "celebrate",
  "insightful",
  "curious",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

export type ReactionEmoji = {
  type: ReactionType;
  emoji: string;
  label: string;
};

export const DEFAULT_REACTIONS: readonly ReactionEmoji[] = [
  { type: "like", emoji: "\u{1F44D}", label: "Like" },
  { type: "heart", emoji: "\u2764\uFE0F", label: "Love" },
  { type: "celebrate", emoji: "\u{1F389}", label: "Celebrate" },
  { type: "insightful", emoji: "\u{1F4A1}", label: "Insightful" },
  { type: "curious", emoji: "\u{1F914}", label: "Curious" },
];

export type ReactionsOptions = {
  provider?: ReactionsProvider;
  reactions?: readonly ReactionType[];
  className?: string;
  ariaLabel?: string;
};

export type ResolvedReactionsOptions = {
  provider: ReactionsProvider;
  reactions: readonly ReactionEmoji[];
  className: string;
  ariaLabel: string;
};

export type ReactionCount = {
  type: ReactionType;
  count: number;
  reacted: boolean;
};

export type PageReactions = {
  contentId: string;
  counts: readonly ReactionCount[];
};
