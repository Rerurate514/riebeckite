import { createLoadingController } from "@riebeckite/ui/loading";
import { createRoot } from "hono/jsx/dom/client";
import { DiffPanel } from "../src/components/diff-panel.js";
import { createLineDiff } from "../src/diff/line_diff.js";
import type { MarkdownRevision, PostDiff } from "../src/types.js";

type DiffHistoryPayload = {
  path?: string;
  revisions?: MarkdownRevision[];
};

export function initDiffHistory() {
  const cleanups = Array.from(
    document.querySelectorAll<HTMLElement>("[data-rr-diff-history]"),
    (root) => initDiffHistoryRoot(root),
  );
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function initDiffHistoryRoot(root: HTMLElement) {
  const payload = readPayload(root);
  if (!payload) return () => {};
  let revisions = revisionsMap(payload.revisions ?? []);
  let revisionsRequest: Promise<ReadonlyMap<
    string,
    MarkdownRevision
  > | null> | null = null;

  const fromSelect = root.querySelector<HTMLSelectElement>(
    "[data-rr-diff-from]",
  );
  const toSelect = root.querySelector<HTMLSelectElement>("[data-rr-diff-to]");
  const panel = root.querySelector<HTMLElement>("[data-rr-diff-panel]");
  if (!fromSelect || !toSelect || !panel) return () => {};
  const controller = new AbortController();
  const panelView = createRoot(panel);
  const renderPanel = (diff: PostDiff) => {
    panelView.render(DiffPanel({ diff }));
  };
  const loading = createLoadingController(root, {
    signal: controller.signal,
  });
  const load = () => {
    revisionsRequest ??= loadRevisions(payload.path).then((loaded) => {
      if (!loaded) revisionsRequest = null;
      return loaded;
    });
    return revisionsRequest;
  };

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-rr-diff-select]",
  )) {
    button.addEventListener(
      "click",
      () => {
        const toHash = button.dataset.rrDiffSelect;
        if (!toHash) return;
        void updateDiff({
          root,
          renderPanel,
          loading,
          getRevisions: () => revisions,
          setRevisions: (loaded) => {
            revisions = loaded;
          },
          load,
          fromHash: fromSelect.value,
          toHash,
          fromSelect,
          toSelect,
        });
      },
      { signal: controller.signal },
    );
  }

  const updateFromSelects = () => {
    void updateDiff({
      root,
      renderPanel,
      loading,
      getRevisions: () => revisions,
      setRevisions: (loaded) => {
        revisions = loaded;
      },
      load,
      fromHash: fromSelect.value,
      toHash: toSelect.value,
      fromSelect,
      toSelect,
    });
  };

  fromSelect.addEventListener("change", updateFromSelects, {
    signal: controller.signal,
  });
  toSelect.addEventListener("change", updateFromSelects, {
    signal: controller.signal,
  });

  return () => {
    controller.abort();
    panelView.unmount();
  };
}

async function updateDiff(input: {
  root: HTMLElement;
  renderPanel: (diff: PostDiff) => void;
  loading: ReturnType<typeof createLoadingController>;
  getRevisions: () => ReadonlyMap<string, MarkdownRevision>;
  setRevisions: (revisions: ReadonlyMap<string, MarkdownRevision>) => void;
  load: () => Promise<ReadonlyMap<string, MarkdownRevision> | null>;
  fromHash: string;
  toHash: string;
  fromSelect: HTMLSelectElement;
  toSelect: HTMLSelectElement;
}) {
  const { root, renderPanel, fromHash, toHash, fromSelect, toSelect } = input;
  const token = `${fromHash}\n${toHash}`;
  root.dataset.rrDiffPending = token;
  input.loading.start();
  const loaded = await input.load();
  if (root.dataset.rrDiffPending !== token) return;
  if (!loaded) {
    input.loading.fail("Failed to load revision.");
    return;
  }
  input.setRevisions(loaded);
  const diff = createDiff(input.getRevisions(), fromHash, toHash);
  if (!diff) {
    input.loading.stop();
    return;
  }
  fromSelect.value = diff.from?.hash ?? "";
  toSelect.value = diff.to.hash;
  updateSelectedCommit(root, diff.to.hash);
  renderPanel(diff);
  input.loading.stop();
}

async function loadRevisions(
  path: string | undefined,
): Promise<ReadonlyMap<string, MarkdownRevision> | null> {
  if (!path) return null;
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const payload = (await response.json()) as DiffHistoryPayload;
    return revisionsMap(payload.revisions ?? []);
  } catch {
    return null;
  }
}

function revisionsMap(
  revisions: readonly MarkdownRevision[],
): ReadonlyMap<string, MarkdownRevision> {
  return new Map(revisions.map((revision) => [revision.hash, revision]));
}

function createDiff(
  revisions: ReadonlyMap<string, MarkdownRevision>,
  fromHash: string,
  toHash: string,
): PostDiff | null {
  const to = revisions.get(toHash);
  if (!to) return null;

  const from = fromHash ? revisions.get(fromHash) : null;
  if (fromHash && !from) return null;

  return {
    from: from ?? null,
    to,
    lines: createLineDiff(from?.markdown ?? "", to.markdown),
  };
}

function readPayload(root: HTMLElement): DiffHistoryPayload | null {
  const script = root.querySelector<HTMLScriptElement>(
    "[data-rr-diff-history-data]",
  );
  if (!script?.textContent) return null;

  try {
    return JSON.parse(script.textContent) as DiffHistoryPayload;
  } catch {
    return null;
  }
}

function updateSelectedCommit(root: HTMLElement, hash: string) {
  for (const button of root.querySelectorAll<HTMLButtonElement>(
    "[data-rr-diff-select]",
  )) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.rrDiffSelect === hash),
    );
  }
}
