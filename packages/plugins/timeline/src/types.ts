export type TimelineOptions = {
  layout?: "article" | "wide";
  basePath?: string;
  className?: string;
  key?: string;
  title?: string;
  include?: TimelineSelector;
  exclude?: TimelineSelector;
  selection?: "automatic" | "marked";
  localeMode?: "current" | "fallback" | "all";
};

export type TimelineSelector = {
  folders?: string[];
  tags?: string[];
};

export type ResolvedTimelineOptions = {
  layout: "article" | "wide";
  basePath: string;
  className: string;
  key: string;
  title: string;
  include?: ResolvedTimelineSelector;
  exclude?: ResolvedTimelineSelector;
  selection: "automatic" | "marked";
  localeMode: "current" | "fallback" | "all";
};

export type ResolvedTimelineSelector = {
  folders: readonly string[];
  tags: readonly string[];
};

export type TimelineEntry = {
  date: string;
  permalink: string;
  title: string;
  language?: string;
};

export type InlineTimelineEvent = {
  date: string;
  title: string;
  content: string;
};

export type InlineTimeline = {
  events: readonly InlineTimelineEvent[];
  line?: 2 | 3 | 4 | 5;
  body?: 2 | 3 | 4;
  activeColor?: string;
};
