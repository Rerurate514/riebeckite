import type { HastElementNode } from "./types.js";

export const FOOTNOTE_REFERENCE_ATTRIBUTE = "dataFootnoteRef";

export const FOOTNOTES_SECTION_ATTRIBUTE = "dataFootnotes";

export const FOOTNOTE_ID_PREFIX_PATTERN = /^(?:user-content-)?fn-(.+)$/;

export const PLACEMENT_ATTRIBUTE = "data-rr-sidenotes-placement";

export const BLOCK_TAG_NAMES = new Set([
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

export type FootnoteNote = {
  key: string;
  bodyHtml: string;
  index: string;
  used: boolean;
};

export type BlockContainer = {
  container: HastElementNode;
  parent: HastElementNode | null;
};

export type Insertion = {
  parent: HastElementNode;
  container: HastElementNode;
  htmls: string[];
};
