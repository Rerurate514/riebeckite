import type { PluginComponent } from "@riebeckite/core";
import type { ShareLink } from "../src/types.js";

export type ShareControlsProps = {
  readonly links: readonly ShareLink[];
  readonly copyUrl?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly copyLabel?: string;
  readonly copiedLabel?: string;
  readonly copyFailedLabel?: string;
};

const ShareControls = (({
  links,
  copyUrl,
  ariaLabel = "Share",
  className = "rr-share",
  copyLabel = "Copy link",
  copiedLabel = "Copied",
  copyFailedLabel = "Copy failed",
}: Readonly<ShareControlsProps>) => {
  if (links.length === 0 && !copyUrl) return null;
  const rootClass =
    className === "rr-share" ? className : `rr-share ${className}`;
  return (
    <nav class={rootClass} data-rr-share aria-label={ariaLabel}>
      <ul class="rr-share__list">
        {links.map((link) => (
          <li class="rr-share__item" key={link.service}>
            <a
              class={`rr-share__link rr-share__link--${link.service}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              data-share-service={link.service}
            >
              {link.label}
            </a>
          </li>
        ))}
        {copyUrl ? (
          <li class="rr-share__item">
            <button
              type="button"
              class="rr-share__button rr-share__copy"
              data-rr-share-copy
              data-share-url={copyUrl}
              data-rr-share-copied={copiedLabel}
              data-rr-share-copy-failed={copyFailedLabel}
              hidden
            >
              {copyLabel}
            </button>
          </li>
        ) : null}
      </ul>
      <p class="rr-share__status" role="status" aria-live="polite" />
    </nav>
  );
}) satisfies PluginComponent<ShareControlsProps>;

export default ShareControls;
