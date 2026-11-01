import crypto from "node:crypto";
import type rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "rehype-sanitize";
import { stableStringify } from "./plugin/plugin_memo.js";
import type { JsonValue } from "./types/json_value.js";

export const markdownSanitizeSchema: Parameters<typeof rehypeSanitize>[0] = {
  ...defaultSchema,
  required: {},
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "aside",
    "button",
    "figcaption",
    "figure",
    "object",
    "option",
    "output",
    "mark",
    "select",
    "svg",
    "g",
    "path",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "rect",
    "title",
    "desc",
    "defs",
    "linearGradient",
    "radialGradient",
    "stop",
    "math",
    "semantics",
    "mrow",
    "msup",
    "mi",
    "mn",
    "mo",
    "mfrac",
    "msqrt",
    "mroot",
    "mtext",
    "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []).filter(
        (attribute) =>
          attribute !== "className" &&
          (!Array.isArray(attribute) || attribute[0] !== "className"),
      ),
      "className",
      "download",
    ],
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "data*",
      "role",
      "ariaControls",
      "ariaDescribedBy",
      "ariaExpanded",
      "ariaHidden",
      "ariaLabel",
      "ariaLabelledBy",
      "ariaLive",
      "ariaSelected",
      "hidden",
      "style",
      "tabIndex",
      "tabindex",
    ],
    button: ["type", "disabled"],
    input: ["type", "value", "min", "max", "step", "placeholder", "checked"],
    object: ["data", ["type", "application/pdf"]],
    option: ["value", "selected"],
    svg: ["xmlns", "viewBox", "width", "height", "role", "focusable"],
    circle: ["cx", "cy", "r"],
    ellipse: ["cx", "cy", "rx", "ry"],
    line: ["x1", "y1", "x2", "y2"],
    rect: ["x", "y", "width", "height", "rx", "ry"],
    polyline: ["points"],
    polygon: ["points"],
    path: ["d", "pathLength"],
    g: ["clipPath", "mask"],
    linearGradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "x1",
      "y1",
      "x2",
      "y2",
    ],
    radialGradient: [
      "id",
      "gradientUnits",
      "gradientTransform",
      "cx",
      "cy",
      "r",
      "fx",
      "fy",
    ],
    stop: ["offset", "stopColor", "stopOpacity"],
    math: ["xmlns"],
    annotation: ["encoding"],
  },
};

export const safeMarkdownStyle =
  /^(?:--shiki-(?:light|dark):#[\da-f]{3,8};?)+$|^height:\d+(?:\.\d+)?px$|^--rb-(?:qr-size:\d+(?:\.\d+)?px|rich-embed-aspect:\d+(?:\.\d+)?)$/i;

export const markdownSanitizeFingerprint = crypto
  .createHash("sha256")
  .update(
    stableStringify({
      schema: markdownSanitizeSchema as unknown as JsonValue,
      style: safeMarkdownStyle.source,
      styleFlags: safeMarkdownStyle.flags,
    }),
  )
  .digest("hex");
