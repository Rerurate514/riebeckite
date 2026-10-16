import type { PluginComponent } from "@riebeckite/core";
import type { ShareLink } from "../src/types.js";

export type ShareControlsProps = {
  readonly links: readonly ShareLink[];
  readonly copyUrl?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly copyLabel?: string;
};

const ShareControls = (({
  links,
  copyUrl,
  ariaLabel = "Share",
  className = "rr-share",
  copyLabel = "Copy link",
}: Readonly<ShareControlsProps>) => {
  if (links.length === 0 && !copyUrl) return null;
  return (
    <nav class={className} data-share aria-label={ariaLabel}>
      {links.map((link) => (
        <a class={`${className}__link`} href={link.url} key={link.service}>
          {link.label}
        </a>
      ))}
      {copyUrl ? (
        <button type="button" data-share-copy={copyUrl}>
          {copyLabel}
        </button>
      ) : null}
    </nav>
  );
}) satisfies PluginComponent<ShareControlsProps>;

export default ShareControls;
