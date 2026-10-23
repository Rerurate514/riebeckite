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

  const updateLineTarget = () => {
    const match = decodeURIComponent(window.location.hash.slice(1)).match(
      /^L(\d+)(?:-L(\d+))?$/i,
    );
    for (const line of document.querySelectorAll<HTMLElement>(
      ".rr-source-file [data-source-file] .rr-code__line",
    )) {
      line.classList.remove("rr-source-file__line--target");
      line.removeAttribute("aria-current");
    }
    if (!match) return;
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < start) return;
    const target = document.getElementById(`L${start}`);
    if (!target?.closest(".rr-source-file")) return;
    for (let number = start; number <= end; number += 1) {
      const line = document.getElementById(`L${number}`);
      if (line?.closest(".rr-source-file")) {
        line.classList.add("rr-source-file__line--target");
        line.setAttribute("aria-current", "location");
      }
    }
    target.scrollIntoView({ block: "center" });
    target.focus({ preventScroll: true });
  };

  window.addEventListener("hashchange", updateLineTarget);
  document.addEventListener("riebeckite:navigation", updateLineTarget);
  updateLineTarget();
}
