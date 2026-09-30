/** Services a note can be shared to. `copy` is the copy-link action. */
export const SHARE_SERVICES = [
  "x",
  "bluesky",
  "mastodon",
  "facebook",
  "linkedin",
  "hatena",
  "copy",
] as const;

export type ShareService = (typeof SHARE_SERVICES)[number];

/** Where the controls sit relative to the note body. */
export type SharePlacement = "top" | "bottom";

/** Options accepted by `share()`. */
export type ShareOptions = {
  /**
   * Services to render, in order. Defaults to every service except
   * `mastodon`; add `"mastodon"` and set {@link ShareOptions.mastodonInstance}
   * to enable it.
   */
  services?: readonly ShareService[];
  /** Where the controls appear. Defaults to `"bottom"`. */
  placement?: SharePlacement;
  /**
   * Instance host used by the `mastodon` service, for example
   * `"mastodon.social"`. Accepts a bare host or a full URL; the scheme and
   * trailing slash are stripped. Required when `services` includes
   * `"mastodon"`.
   */
  mastodonInstance?: string;
  /**
   * Extra CSS class added to the root element alongside the stable
   * `rr-share` hook. Defaults to none.
   */
  className?: string;
  /** Accessible name for the share group. Defaults to `"Share"`. */
  ariaLabel?: string;
  /** Per-service visible labels, merged over the defaults. */
  labels?: Partial<Record<ShareService, string>>;
  /** Status text announced after a successful copy. Defaults to `"Copied"`. */
  copiedLabel?: string;
  /** Status text announced when a copy fails. Defaults to `"Copy failed"`. */
  copyFailedLabel?: string;
};

/** `ShareOptions` with every default applied. */
export type ResolvedShareOptions = {
  services: readonly ShareService[];
  placement: SharePlacement;
  mastodonInstance: string;
  className: string;
  ariaLabel: string;
  labels: Readonly<Record<ShareService, string>>;
  copiedLabel: string;
  copyFailedLabel: string;
};

/** A rendered share link. `url` is absolute and ready for an `href`. */
export type ShareLink = {
  service: ShareService;
  label: string;
  url: string;
};
