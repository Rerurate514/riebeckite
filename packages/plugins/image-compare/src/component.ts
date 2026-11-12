import type {
  JsonValue,
  PluginComponentResolveContext,
  PluginMarkdownComponent,
} from "@riebeckite/core";
import { definePluginComponent } from "@riebeckite/core";
import { parseImageCompare } from "./parse.js";
import { renderImageCompare, renderImageCompareError } from "./render.js";
import type { ImageCompareOrientation } from "./types.js";

type ImageCompareProps = {
  readonly source: string;
  readonly before?: string;
  readonly after?: string;
  readonly beforeAlt?: string;
  readonly afterAlt?: string;
  readonly orientation?: ImageCompareOrientation;
  readonly label?: string;
  readonly error?: string;
};

export const imageCompareComponent: PluginMarkdownComponent<ImageCompareProps> =
  definePluginComponent<ImageCompareProps>({
    name: "ImageCompare",
    deferUntilManifest: true,
    parseProps(props: Record<string, JsonValue>): ImageCompareProps {
      if (typeof props.source !== "string") {
        throw new Error('ImageCompare requires a string "source" prop.');
      }
      return { source: props.source };
    },
    resolveProps(props, context) {
      return resolveImageCompare(props, context);
    },
    render(props) {
      if (props.error) return renderImageCompareError(props.error);
      return renderImageCompare({
        before: props.before ?? "",
        after: props.after ?? "",
        beforeAlt: props.beforeAlt ?? "Before",
        afterAlt: props.afterAlt ?? "After",
        orientation: props.orientation ?? "horizontal",
        ...(props.label ? { label: props.label } : {}),
      });
    },
    renderError(error) {
      return renderImageCompareError(formatError(error));
    },
  });

function resolveImageCompare(
  props: ImageCompareProps,
  context: PluginComponentResolveContext,
): ImageCompareProps {
  const parsed = parseImageCompare(props.source);
  if (parsed.ok === false) {
    return fail(props, parsed.reason, context);
  }

  const before = context.resolveAssetUrl(parsed.spec.before);
  const after = context.resolveAssetUrl(parsed.spec.after);
  if (!before || !after) {
    const invalid = !before ? parsed.spec.before : parsed.spec.after;
    return fail(
      props,
      `references an unsupported image: "${invalid}".`,
      context,
    );
  }

  return {
    ...props,
    ...parsed.spec,
    before: before.url,
    after: after.url,
  };
}

function fail(
  props: ImageCompareProps,
  reason: string,
  context: PluginComponentResolveContext,
): ImageCompareProps {
  const slug = context.sourceSlug ?? "";
  const message = `Image comparison block in \`${slug}\` ${reason}`;
  context.diagnostics?.push({
    code: "image-compare-invalid",
    severity: "error",
    pluginName: "image-compare",
    slug,
    message,
  });
  return { ...props, error: message };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type { ImageCompareProps };
