export async function copyText(value: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {}

  return copyWithExecCommand(value);
}

function copyWithExecCommand(value: string): boolean {
  const selection = window.getSelection();
  const savedRanges: Range[] = [];
  if (selection) {
    for (let index = 0; index < selection.rangeCount; index += 1) {
      savedRanges.push(selection.getRangeAt(index).cloneRange());
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (selection && savedRanges.length > 0) {
      selection.removeAllRanges();
      for (const range of savedRanges) selection.addRange(range);
    }
  }

  return copied;
}
