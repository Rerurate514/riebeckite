import assert from "node:assert/strict";
import { test } from "node:test";
import { parseKanban, resolveKanbanOptions } from "../index.ts";

const options = resolveKanbanOptions();

test("parseKanban reads columns and cards", () => {
  const result = parseKanban(
    ["## Backlog", "", "- [ ] Draft", "- [x] Ship"].join("\n"),
    options,
  );

  assert.deepEqual(result.columns, [
    {
      name: "Backlog",
      cards: [
        { checked: false, text: "Draft" },
        { checked: true, text: "Ship" },
      ],
    },
  ]);
  assert.deepEqual(result.fallback, []);
  assert.deepEqual(result.problems, []);
});

test("parseKanban ignores task syntax inside fenced code blocks", () => {
  const result = parseKanban(
    [
      "## Backlog",
      "",
      "- [ ] Real card",
      "",
      "```md",
      "## Not a column",
      "- [ ] Not a card",
      "```",
    ].join("\n"),
    options,
  );

  assert.deepEqual(result.columns, [
    { name: "Backlog", cards: [{ checked: false, text: "Real card" }] },
  ]);
  assert.equal(
    result.columns.some((column) => column.name === "Not a column"),
    false,
  );
  assert.equal(
    result.columns.some((column) =>
      column.cards.some((card) => card.text === "Not a card"),
    ),
    false,
  );
  assert.ok(result.fallback.includes("- [ ] Not a card"));
  assert.ok(result.fallback.includes("## Not a column"));
});
