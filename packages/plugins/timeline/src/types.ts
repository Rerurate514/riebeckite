export type TimelineOptions = {
  basePath?: string;
  className?: string;
  key?: string;
  title?: string;
};

export type ResolvedTimelineOptions = Required<TimelineOptions>;

export type TimelineEntry = {
  date: string;
  permalink: string;
  title: string;
};
