import type { WebmentionMention } from "./mention.js";

export type MentionsForTargetQuery = Readonly<{
  type: "mentions_for_target";
  /** Absolute target URL. */
  target: string;
  limit?: number;
}>;

export type AllMentionsQuery = Readonly<{
  type: "all_mentions";
  limit?: number;
  /** Only mentions verified at or after this ISO-8601 timestamp. */
  since?: string;
}>;

export type WebmentionQuery = MentionsForTargetQuery | AllMentionsQuery;

export type MentionsForTargetResult = Readonly<{
  type: "mentions_for_target";
  target: string;
  mentions: readonly WebmentionMention[];
}>;

export type AllMentionsResult = Readonly<{
  type: "all_mentions";
  mentions: readonly WebmentionMention[];
}>;

export type WebmentionQueryResult = MentionsForTargetResult | AllMentionsResult;
