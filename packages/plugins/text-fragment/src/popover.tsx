/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { createRoot } from "hono/jsx/dom/client";
import type { TextFragmentLabels } from "./text-fragment.client.js";

export type TextFragmentPopoverProps = {
  labels: TextFragmentLabels;
  visible: boolean;
  status: string;
  onCopyLink: () => void;
  onCopyQuote: () => void;
};

export function TextFragmentPopover({
  labels,
  visible,
  status,
  onCopyLink,
  onCopyQuote,
}: TextFragmentPopoverProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: Keep the existing popover markup and styling.
    <div
      class="rr-text-fragment"
      role="group"
      aria-label={labels.regionLabel}
      hidden={!visible}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div class="rr-text-fragment__actions">
        <button
          type="button"
          class="rr-text-fragment__button"
          onClick={onCopyLink}
        >
          {labels.copyLinkLabel}
        </button>
        <button
          type="button"
          class="rr-text-fragment__button"
          onClick={onCopyQuote}
        >
          {labels.copyQuoteLabel}
        </button>
      </div>
      <p class="rr-text-fragment__status" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

export type TextFragmentPopoverState = {
  visible: boolean;
  status: string;
};

export function mountTextFragmentPopover(
  container: HTMLElement,
  options: Omit<TextFragmentPopoverProps, "visible" | "status">,
) {
  const root = createRoot(container);
  const render = (state: TextFragmentPopoverState) => {
    root.render(<TextFragmentPopover {...options} {...state} />);
  };

  render({ visible: false, status: "" });

  return {
    render,
    unmount: () => root.unmount(),
  };
}
