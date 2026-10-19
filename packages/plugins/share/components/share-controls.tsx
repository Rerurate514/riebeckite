import type { PluginComponent } from "@riebeckite/core";
import { useArticleContext, useSiteContext } from "@riebeckite/ui";
import { html } from "hono/html";
import { getShareLinks } from "../src/data.js";
import type { ShareLink, ShareOptions } from "../src/types.js";

export type ShareControlsProps = {
  readonly links?: readonly ShareLink[];
  readonly copyUrl?: string;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly copyLabel?: string;
  readonly copiedLabel?: string;
  readonly copyFailedLabel?: string;
};

const ShareControls = (async (props: Readonly<ShareControlsProps>) => {
  const site = useSiteContext();
  const article = useArticleContext();
  const resolved =
    props.links === undefined && site && article?.entry
      ? await getShareLinks({
          entry: article.entry,
          site: site.config,
          options: findShareOptions(site.config.plugins),
        })
      : undefined;
  const links = props.links ?? resolved?.links ?? [];
  const copyUrl = props.copyUrl ?? resolved?.copyUrl;
  const ariaLabel = props.ariaLabel ?? resolved?.ariaLabel ?? "Share";
  const className = props.className ?? resolved?.className ?? "rr-share";
  const copyLabel = props.copyLabel ?? resolved?.copyLabel ?? "Copy link";
  const copiedLabel = props.copiedLabel ?? resolved?.copiedLabel ?? "Copied";
  const copyFailedLabel =
    props.copyFailedLabel ?? resolved?.copyFailedLabel ?? "Copy failed";
  if (links.length === 0 && !copyUrl) return html``;
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

function findShareOptions(
  plugins: readonly { name: string; options?: unknown }[],
): ShareOptions | undefined {
  return plugins.find((plugin) => plugin.name === "share")?.options as
    | ShareOptions
    | undefined;
}
