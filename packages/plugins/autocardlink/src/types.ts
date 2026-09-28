export type AutoCardLink = {
  url: string;
  title: string;
  description: string;
  host: string;
  favicon: string;
  image: string;
};

export type AutoCardLinkOptions = {
  /** Extra CSS class added to the card root. The `rr-cardlink` hook is always applied. */
  className?: string;
};
