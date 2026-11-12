/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import { useRef, useState } from "hono/jsx";
import type { ResolvedImageCompareSpec } from "./types.js";

export const IMAGE_COMPARE_CLASS = "rr-image-compare";
export const IMAGE_COMPARE_ERROR_ATTRIBUTE = "data-image-compare-error";

export type ImageCompareComponentProps =
  | ({ readonly status: "ready" } & ResolvedImageCompareSpec)
  | { readonly status: "error"; readonly message: string };

export function ImageCompare(props: Readonly<ImageCompareComponentProps>) {
  const [position, setPosition] = useState(50);
  const stage = useRef<HTMLDivElement>(null);
  const range = useRef<HTMLInputElement>(null);
  const dragging = useRef(false);

  if (props.status === "error") {
    return (
      <div
        class={`${IMAGE_COMPARE_CLASS} ${IMAGE_COMPARE_CLASS}--error`}
        role="status"
        data-image-compare-error={encodeURIComponent(props.message)}
      >
        {props.message}
      </div>
    );
  }

  const vertical = props.orientation === "vertical";

  const updateFromPointer = (event: PointerEvent) => {
    const element = stage.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;
    const ratio = vertical
      ? (event.clientY - bounds.top) / bounds.height
      : (event.clientX - bounds.left) / bounds.width;
    setPosition(Math.round(Math.min(1, Math.max(0, ratio)) * 100));
  };

  const onPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    dragging.current = true;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    range.current?.focus({ preventScroll: true });
    updateFromPointer(event);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging.current) return;
    event.preventDefault();
    updateFromPointer(event);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <figure
      class={IMAGE_COMPARE_CLASS}
      data-rr-image-compare=""
      data-orientation={props.orientation}
      style={`--rr-image-compare-position:${position}%`}
      aria-label={props.label ?? "Image comparison"}
    >
      <div class={`${IMAGE_COMPARE_CLASS}__static`}>
        <span class={`${IMAGE_COMPARE_CLASS}__static-item`}>
          <img
            src={props.before}
            alt={props.beforeAlt}
            loading="lazy"
            decoding="async"
          />
          <span>Before</span>
        </span>
        <span class={`${IMAGE_COMPARE_CLASS}__static-item`}>
          <img
            src={props.after}
            alt={props.afterAlt}
            loading="lazy"
            decoding="async"
          />
          <span>After</span>
        </span>
      </div>
      <div
        class={`${IMAGE_COMPARE_CLASS}__stage`}
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          class={`${IMAGE_COMPARE_CLASS}__layer ${IMAGE_COMPARE_CLASS}__layer--before`}
        >
          <img
            class={`${IMAGE_COMPARE_CLASS}__image ${IMAGE_COMPARE_CLASS}__image--before`}
            src={props.before}
            alt={props.beforeAlt}
            loading="eager"
            decoding="async"
          />
        </div>
        <div
          class={`${IMAGE_COMPARE_CLASS}__layer ${IMAGE_COMPARE_CLASS}__layer--after`}
        >
          <img
            class={`${IMAGE_COMPARE_CLASS}__image ${IMAGE_COMPARE_CLASS}__image--after`}
            src={props.after}
            alt={props.afterAlt}
            loading="eager"
            decoding="async"
          />
        </div>
        <input
          class={`${IMAGE_COMPARE_CLASS}__range`}
          type="range"
          min="0"
          max="100"
          step="1"
          value={position}
          aria-label="Comparison position"
          aria-valuetext={`${position}%`}
          data-image-compare-range=""
          ref={range}
          onInput={(event: Event) =>
            setPosition(Number((event.currentTarget as HTMLInputElement).value))
          }
        />
        <span class={`${IMAGE_COMPARE_CLASS}__divider`} aria-hidden="true" />
      </div>
      {props.label ? (
        <figcaption class={`${IMAGE_COMPARE_CLASS}__caption`}>
          {props.label}
        </figcaption>
      ) : null}
    </figure>
  );
}
