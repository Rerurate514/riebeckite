type SearchBarProps = {
  readonly class?: string;
  readonly className?: string;
};

export default function SearchBar(props: SearchBarProps = {}) {
  const className = ["rr-search-bar", "rr-search", props.class, props.className]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <div class={className} data-search-root>
        <button
          type="button"
          class="rr-search-bar__trigger"
          data-search-open
          aria-haspopup="dialog"
          aria-controls="search-dialog"
          aria-expanded="false"
        >
          <span class="rr-search-bar__icon" aria-hidden="true">
            ⌕
          </span>
          <span class="rr-search-bar__label">Search</span>
          <kbd class="rr-search-bar__key">Ctrl K</kbd>
        </button>
      </div>

      <dialog
        id="search-dialog"
        class="rr-search-modal rr-search"
        data-search-modal
        aria-labelledby="search-title"
      >
        <section class="rr-search-modal__panel">
          <div class="rr-search-modal__header">
            <h2 id="search-title" class="rr-search-modal__title">
              Search notes
            </h2>
            <button
              type="button"
              class="rr-search-modal__close"
              data-search-close
              aria-label="Close search"
            >
              Esc
            </button>
          </div>

          <label class="rr-search-modal__input-wrap">
            <span class="sr-only">Search query</span>
            <input
              class="rr-search-modal__input"
              data-search-input
              type="search"
              placeholder="Search notes or use tag:, lang:, path:..."
              autocomplete="off"
              spellcheck={false}
            />
          </label>

          <div class="rr-search-modal__status" data-search-status role="status">
            Filter with tag:, lang:, or path:.
          </div>
          <div
            class="rr-search-modal__results"
            data-search-results
            role="listbox"
            aria-label="Search results"
          />
        </section>
      </dialog>
    </>
  );
}
