/** @jsxRuntime automatic @jsxImportSource hono/jsx */
import { renderToString } from "hono/jsx/dom/server";
import { ImageCompare, type ImageCompareComponentProps } from "./component.js";

export {
  IMAGE_COMPARE_CLASS,
  IMAGE_COMPARE_ERROR_ATTRIBUTE,
  ImageCompare,
  type ImageCompareComponentProps,
} from "./component.js";

export function renderImageCompare(
  props: Readonly<ImageCompareComponentProps>,
): string {
  return renderToString(<ImageCompare {...props} />);
}

export function renderImageCompareError(message: string): string {
  return renderImageCompare({ status: "error", message });
}
