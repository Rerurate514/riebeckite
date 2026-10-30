export type TimelineOptions = {
  basePath?: string;
  className?: string;
  key?: string;
  title?: string;
  include?: TimelineSelector;
  exclude?: TimelineSelector;
  selection?: "automatic" | "marked";
};

export type TimelineSelector = {
  folders?: string[];
  tags?: string[];
};

export type ResolvedTimelineOptions = {
  basePath: string;
  className: string;
  key: string;
  title: string;
  include?: ResolvedTimelineSelector;
  exclude?: ResolvedTimelineSelector;
  selection: "automatic" | "marked";
};

export type ResolvedTimelineSelector = {
  folders: readonly string[];
  tags: readonly string[];
};

export type TimelineEntry = {
  date: string;
  permalink: string;
  title: string;
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
