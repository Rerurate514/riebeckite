export function initSourceFiles() {
  document.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("[data-source-file-copy]");
    if (!button) return;
    const code = document.querySelector<HTMLElement>(
      ".rr-source-file .rr-code__code, .rr-source-file pre code",
    );
    if (!code?.textContent) return;
    await navigator.clipboard?.writeText(code.textContent);
    button.dataset.sourceFileCopied = "true";
  });
}
