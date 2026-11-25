import { useUiLabels } from "@riebeckite/ui";
import { copyText } from "@riebeckite/ui/copy";
import { useState } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import { codeEnhanceLabels } from "./labels.js";

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
  label,
  copiedLabel,
}: Readonly<CodeCopyProps>) {
  const labels = useUiLabels(codeEnhanceLabels);
  const effectiveLabel = label ?? labels.copy ?? "Copy";
  const effectiveCopiedLabel = copiedLabel ?? labels.copied ?? "Copied";
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
      {copied ? effectiveCopiedLabel : effectiveLabel}
    </button>
  );
}
