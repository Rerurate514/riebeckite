import { raw } from "hono/html";
import { joinClassNames } from "./primitives_theme.js";
import type { HtmlFragmentProps, PageBodyProps } from "./primitives_types.js";

export function HtmlFragment(props: HtmlFragmentProps) {
  return raw(props.html);
}

export function PageBody(props: PageBodyProps) {
  return (
    <div
      class={joinClassNames("rb-page-body", props.class, props.className)}
      data-rb-page-layout={props.layout ?? "wide"}
      dangerouslySetInnerHTML={{ __html: props.html }}
    />
  );
}
