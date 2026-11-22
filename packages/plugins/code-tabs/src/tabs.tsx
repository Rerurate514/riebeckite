/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { useEffect, useState } from "hono/jsx";

export type CodeTab = {
  readonly label: string;
  readonly html: string;
};

export type CodeTabsGroupProps = {
  readonly groupId: string;
  readonly sync: boolean;
  readonly tabs: readonly CodeTab[];
};

const CODE_TABS_SYNC_EVENT = "riebeckite:code-tabs-select";

type SyncDetail = {
  readonly groupId: string;
  readonly label: string;
};

export function CodeTabsGroup({ groupId, sync, tabs }: CodeTabsGroupProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!sync) return;
    const onSync = (event: Event) => {
      const detail = (event as CustomEvent<SyncDetail>).detail;
      if (!detail || detail.groupId === groupId) return;
      const index = tabs.findIndex((tab) => tab.label === detail.label);
      if (index >= 0) setActive(index);
    };
    document.addEventListener(CODE_TABS_SYNC_EVENT, onSync);
    return () => document.removeEventListener(CODE_TABS_SYNC_EVENT, onSync);
  }, [groupId, sync, tabs]);

  const select = (index: number) => {
    setActive(index);
    if (!sync) return;
    const label = tabs[index]?.label;
    if (label === undefined) return;
    document.dispatchEvent(
      new CustomEvent<SyncDetail>(CODE_TABS_SYNC_EVENT, {
        detail: { groupId, label },
      }),
    );
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const next =
      event.key === "ArrowLeft"
        ? (index - 1 + tabs.length) % tabs.length
        : event.key === "ArrowRight"
          ? (index + 1) % tabs.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? tabs.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next);
    const list = (event.currentTarget as HTMLElement | null)?.parentElement;
    list?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <>
      <div class="rr-code-tabs__tablist" role="tablist">
        {tabs.map((tab, index) => (
          <button
            type="button"
            class="rr-code-tabs__tab"
            role="tab"
            id={`${groupId}-tab-${index}`}
            aria-controls={`${groupId}-panel-${index}`}
            aria-selected={index === active ? "true" : "false"}
            tabindex={index === active ? 0 : -1}
            data-code-tabs-tab="true"
            data-code-tabs-label={tab.label}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          class="rr-code-tabs__panel"
          role="tabpanel"
          id={`${groupId}-panel-${index}`}
          aria-labelledby={`${groupId}-tab-${index}`}
          data-code-tabs-panel="true"
          data-code-tabs-label={tab.label}
          data-active={index === active ? "true" : "false"}
          hidden={index !== active}
          dangerouslySetInnerHTML={{ __html: tab.html }}
        />
      ))}
    </>
  );
}
