export type PdfOptions = {
  /**
   * Viewer height. Numbers are treated as pixels; strings must be a CSS length
   * (for example `"640px"`, `"70vh"`) or `"auto"`.
   */
  height?: string | number;
  /** First page the native viewer opens at. Values above 1 add `#page=N`. */
  initialPage?: number;
  /**
   * Whether the browser's PDF toolbar stays visible. `false` appends
   * `#toolbar=0`, which Chrome and Firefox honor; other viewers may ignore it.
   */
  toolbar?: boolean;
  /** Show the file name, format badge, and size under the viewer. */
  showMetadata?: boolean;
  /** Label for the download links. */
  downloadLabel?: string;
};

export type ResolvedPdfOptions = {
  height: string;
  initialPage: number;
  toolbar: boolean;
  showMetadata: boolean;
  downloadLabel: string;
};
