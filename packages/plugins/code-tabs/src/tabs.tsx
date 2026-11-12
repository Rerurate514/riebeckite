/** @jsxRuntime automatic @jsxImportSource hono/jsx */
type CodeTab = {
  readonly label: string;
  readonly html: string;
};

type CodeTabsGroupProps = {
  readonly groupId: string;
  readonly sync: boolean;
  readonly tabs: readonly CodeTab[];
};

export function CodeTabsGroup({ groupId, sync, tabs }: CodeTabsGroupProps) {
  return (
    <div
      class="rr-code-tabs"
      data-code-tabs="true"
      data-code-tabs-sync={sync ? "true" : undefined}
    >
      <div class="rr-code-tabs__tablist" role="tablist">
        {tabs.map((tab, index) => (
          <button
            type="button"
            class="rr-code-tabs__tab"
            role="tab"
            id={`${groupId}-tab-${index}`}
            aria-controls={`${groupId}-panel-${index}`}
            aria-selected={index === 0 ? "true" : "false"}
            tabindex={index === 0 ? 0 : -1}
            data-code-tabs-tab="true"
            data-code-tabs-label={tab.label}
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
          data-active={index === 0 ? "true" : "false"}
          hidden={index !== 0}
          dangerouslySetInnerHTML={{ __html: tab.html }}
        />
      ))}
    </div>
  );
}
