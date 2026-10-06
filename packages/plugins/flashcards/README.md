# @riebeckite/plugin-flashcards

Turn a `flashcards` code block into a study island: a small deck of cards that
shows a question, reveals the answer, and can be navigated and shuffled in the
browser. The build emits an accessible static list first, so the deck stays
readable with no JavaScript at all.

[日本語](./README_ja.md)

## Overview

`flashcards()` recognises fenced blocks

````md
```flashcards
What is the capital of France? :: Paris

What is 2 + 2? :: 4
```
````

and replaces them with an interactive deck.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { flashcardsPlugin } from "@riebeckite/plugin-flashcards";

export default defineConfig({
  // ...
  plugins: [flashcardsPlugin()],
});
```

The plugin adds `style.css` and a client entry. The script tag is emitted by the
site layout; the plugin only declares it.

## Block syntax

A block holds one or more cards. Each card is a `Question :: Answer` pair. Cards
are separated by a blank line or by a `---` line, and an answer may span
multiple lines:

````md
```flashcards
Which language is this plugin written in? :: TypeScript

What does the client render? :: An interactive deck
---
Describe the fallback. :: A static ordered list.
It stays readable without JavaScript.
```
````

A block with no cards, a card without `::`, or a card with an empty side is
reported as a diagnostic (`invalid-flashcards`) and left as a code block.

## Output

At build time the block becomes

```html
<div class="rb-flashcards" data-flashcards data-flashcards-count="2">
  <script type="application/json" data-flashcards-payload>
    {"cards":[{"front":"...","back":"..."}]}
  </script>
  <ol class="rb-flashcards__list" data-flashcards-fallback>
    <li class="rb-flashcards__item">
      <span class="rb-flashcards__front">...</span>
      <span class="rb-flashcards__back">...</span>
    </li>
  </ol>
</div>
```

The payload is inert and escaped, so card text containing `<`, `>`, or `&` can
never close the script element. The ordered list is the no-JavaScript fallback.

## Client behaviour

`initFlashcards()` reads the payload of every `[data-flashcards]` element and
adds an interactive deck above the fallback. It supports:

- Reveal / hide the answer
- Previous and next card with wrap-around
- Shuffle
- A live card counter
- Keyboard control: `Space` reveals, `ArrowLeft` / `ArrowRight` navigate

On success the root gets `data-flashcards="ready"` and the static list is
hidden. If the payload is missing or invalid the client leaves the fallback
untouched. No options are passed from the build to the client; the deck reads
`data-flashcards-shuffle` when it is present.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `className` | `string` | `"rb-flashcards"` | Root CSS class for the deck |
| `language` | `string` | `"flashcards"` | Fence language to target |
| `shuffle` | `boolean` | `false` | Start the deck in a shuffled order |
| `fallback` | `boolean` | `true` | Emit the static ordered list |

## Exports

- `flashcards(options?)` / `flashcardsPlugin(options?)` — plugin factory
- `initFlashcards(root?)` — client initializer
- `parseFlashcards(source)` — parse a block into cards
- `splitFlashcardGroups(source)` — split a block into card groups
- `remarkFlashcards(options?)` — the remark transform on its own
- `renderFlashcards(cards, options)` / `renderFlashcardsPayload(cards)` /
  `renderFlashcardsFallback(cards, className?)` — build-time rendering helpers
- `resolveFlashcardsOptions(options?)`, `createFlashcardsRuntime(options?)`
- Types: `FlashcardsOptions`, `FlashcardsCard`, `FlashcardsPayload`,
  `ResolvedFlashcardsOptions`

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.en.md)

