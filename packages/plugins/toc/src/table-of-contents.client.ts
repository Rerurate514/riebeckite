type ClientContext = { root?: ParentNode };

export function initTableOfContents(context: ClientContext = {}) {
  const root = context.root ?? document;

  const bind = () => {
    const tocLinks = Array.from(
      root.querySelectorAll<HTMLAnchorElement>("[data-toc-target]"),
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

    const headingsById = new Map(
      Array.from(root.querySelectorAll<HTMLElement>("[id]")).map((heading) => [
        heading.id,
        heading,
      ]),
    );
    const headings = Array.from(linksByHeadingId.keys())
      .map((id) => headingsById.get(id))
      .filter((heading): heading is HTMLElement => heading !== undefined);

    if (headings.length === 0) return;

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

      const activeHeadingId = currentHeading.id;
      if (activeHeadingId === currentActiveHeadingId) return;

      currentActiveHeadingId = activeHeadingId;
      updateViewedLinks(activeHeadingId);
    };

    let currentActiveHeadingId = "";
    let animationFrameId = 0;

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateByScrollPosition);
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    updateByScrollPosition();
    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      cancelAnimationFrame(animationFrameId);
    };
  };

  let cleanup = bind();
  const initialize = () => {
    cleanup?.();
    cleanup = bind();
  };

  if (root === document) {
    document.addEventListener("spa:navigation", initialize);
  }

  return () => {
    if (root === document) {
      document.removeEventListener("spa:navigation", initialize);
    }
    cleanup?.();
  };
}
