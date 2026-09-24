export function initTableOfContents() {
  const tocLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-toc-target]"),
  );

  if (tocLinks.length === 0) return;

  const linksByHeadingId = new Map<string, HTMLAnchorElement[]>();

  for (const link of tocLinks) {
    const headingId = link.dataset.tocTarget;

    if (!headingId) continue;

    linksByHeadingId.set(headingId, [
      ...(linksByHeadingId.get(headingId) ?? []),
      link,
    ]);
  }

  const headings = Array.from(linksByHeadingId.keys())
    .map((id) => document.getElementById(id))
    .filter((heading): heading is HTMLElement => heading !== null);

  const updateViewedLinks = (activeHeadingId: string) => {
    const activeHeadingIndex = headings.findIndex(
      (heading) => heading.id === activeHeadingId,
    );

    if (activeHeadingIndex === -1) return;

    for (const link of tocLinks) {
      link.removeAttribute("aria-current");
      link.dataset.tocViewed = "false";
    }

    for (const heading of headings.slice(0, activeHeadingIndex + 1)) {
      for (const link of linksByHeadingId.get(heading.id) ?? []) {
        link.dataset.tocViewed = "true";

        if (heading.id === activeHeadingId) {
          link.setAttribute("aria-current", "true");
        }
      }
    }
  };

  const updateByScrollPosition = () => {
    let currentHeading = headings[0];

    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= window.innerHeight * 0.35) {
        currentHeading = heading;
      }
    }

    updateViewedLinks(currentHeading?.id ?? headings[0]?.id ?? "");
  };

  let animationFrameId = 0;

  const scheduleUpdate = () => {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(updateByScrollPosition);
  };

  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  updateByScrollPosition();
}
