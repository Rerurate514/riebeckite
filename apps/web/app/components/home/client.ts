export function initHomeCodeCopy() {
  if (document.documentElement.dataset.homeCodeCopyReady) return;
  document.documentElement.dataset.homeCodeCopyReady = "true";
  document.addEventListener("click", async (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>(
      "[data-home-copy]",
    );
    const code = button?.parentElement?.querySelector("code")?.textContent;
    if (!code || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(code);
      const label = button.dataset.homeCopyLabel;
      if (label) {
        button.textContent = label;
        button.setAttribute("aria-label", label);
      }
    } catch {}
  });
}
