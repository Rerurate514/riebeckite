/**
 * A resolved, render-ready icon. Plugins own resolution; Core only carries the
 * result so every Site surface can use the same value.
 */
export type ContentIcon = {
  readonly id: string;
  readonly kind: "svg" | "emoji" | "text";
  /** Sanitized markup. Must be safe to inject into HTML. */
  readonly html: string;
  /** Source that resolved the icon, for example `frontmatter` or `iconic`. */
  readonly source?: string;
  readonly color?: string;
  readonly label?: string;
};

export type ContentIconRegistry = {
  readonly tags?: Readonly<Record<string, ContentIcon>>;
  readonly properties?: Readonly<Record<string, ContentIcon>>;
  readonly folders?: Readonly<Record<string, ContentIcon>>;
};
