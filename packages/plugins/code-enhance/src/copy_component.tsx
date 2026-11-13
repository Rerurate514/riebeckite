import { copyText } from "@riebeckite/ui/copy";
import { useState } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { DEFAULT_COPIED_LABEL, DEFAULT_COPY_LABEL } from "./init.js";

export type CodeCopyProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
};

export function renderCodeCopy(props: Readonly<CodeCopyProps>): string {
  return renderToString(<CodeCopy {...props} />);
}

export default function CodeCopy({
  text,
  label = DEFAULT_COPY_LABEL,
  copiedLabel = DEFAULT_COPIED_LABEL,
}: Readonly<CodeCopyProps>) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      class="rr-code__action"
      data-code-copy-state={copied ? "success" : undefined}
      onClick={copy}
      type="button"
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
