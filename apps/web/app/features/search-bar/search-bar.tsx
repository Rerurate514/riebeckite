export default function SearchBar() {
  return (
    <div class="search-bar" data-search-root>
      <button
        type="button"
        class="search-bar__trigger"
        data-search-open
        aria-haspopup="dialog"
        aria-controls="search-dialog"
      >
        <span class="search-bar__icon" aria-hidden="true">
          ⌕
        </span>
        <span class="search-bar__label">Search</span>
        <kbd class="search-bar__key">Ctrl K</kbd>
      </button>

      <div class="search-modal" data-search-modal hidden>
        <div class="search-modal__backdrop" data-search-close />
        <section
          id="search-dialog"
          class="search-modal__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-title"
        >
          <div class="search-modal__header">
            <h2 id="search-title" class="search-modal__title">
              Search notes
            </h2>
            <button
              type="button"
              class="search-modal__close"
              data-search-close
              aria-label="Close search"
            >
              Esc
            </button>
          </div>

          <label class="search-modal__input-wrap">
            <span class="sr-only">Search query</span>
            <input
              class="search-modal__input"
              data-search-input
              type="search"
              placeholder="Search title, tag, heading, path, or body..."
              autocomplete="off"
              spellcheck={false}
            />
          </label>

          <div class="search-modal__status" data-search-status>
            Type a keyword, tag, or path to search published notes.
          </div>
          <div class="search-modal__results" data-search-results />
        </section>
      </div>
    </div>
  );
}
