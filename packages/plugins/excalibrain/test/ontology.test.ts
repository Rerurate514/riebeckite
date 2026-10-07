import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectDefinedRelations,
  collectHiddenTargets,
  normalizeFieldName,
  resolveOntology,
} from "../index.ts";
import {
  extractInlineFields,
  extractWikilinkTargets,
} from "../src/ontology.ts";

test("normalizes ontology field names", () => {
  assert.equal(normalizeFieldName("  Parent Name "), "parent-name");
  assert.equal(normalizeFieldName("UP"), "up");
});

test("resolves the default and overridden ontologies", () => {
  const defaults = resolveOntology();
  assert.equal(defaults.fieldRole.get("parent"), "parents");
  assert.equal(defaults.fieldRole.get("friends"), "leftFriends");
  assert.equal(defaults.fieldRole.get("n"), "next");
  assert.equal(defaults.fieldRole.get("hidden"), "hidden");

  const custom = resolveOntology({ parents: ["ancestor"] });
  assert.equal(custom.fieldRole.get("ancestor"), "parents");
  assert.equal(custom.fieldRole.get("parent"), "parents");

  const merged = resolveOntology({ hidden: ["secret"] });
  assert.equal(merged.fieldRole.get("hidden"), "hidden");
  assert.equal(merged.fieldRole.get("secret"), "hidden");
});

test("maps the upstream ExcaliBrain ontology field names", () => {
  const defaults = resolveOntology();

  assert.equal(defaults.fieldRole.get("source"), "parents");
  assert.equal(defaults.fieldRole.get("parent-domain"), "parents");
  assert.equal(defaults.fieldRole.get("nurtures"), "children");
  assert.equal(defaults.fieldRole.get("jump"), "leftFriends");
  assert.equal(defaults.fieldRole.get("jumps"), "leftFriends");
  assert.equal(defaults.fieldRole.get("j"), "leftFriends");
  assert.equal(defaults.fieldRole.get("pros"), "leftFriends");
});

test("earlier ontology roles win when a field is listed twice", () => {
  const resolved = resolveOntology({ children: ["parent"] });
  assert.equal(resolved.fieldRole.get("parent"), "parents");
});

test("collects defined relations in ontology order", () => {
  const relations = collectDefinedRelations({
    frontmatter: {
      parent: "[[root]]",
      children: ["[[kid-a]]", "[[kid-b]]"],
      friends: "[[peer]]",
      priority: 5,
      draft: true,
    },
    markdown: "Body text.\n\nnext:: [[later]]\n",
    ontology: resolveOntology(),
  });

  assert.deepEqual(relations, [
    { role: "parent", target: "root" },
    { role: "child", target: "kid-a" },
    { role: "child", target: "kid-b" },
    { role: "leftFriend", target: "peer" },
    { role: "next", target: "later" },
  ]);
});

test("extracts inline fields and ignores fenced code", () => {
  const markdown = [
    "---",
    "title: Note",
    "---",
    "Body",
    "",
    "[priority:: 1]",
    "next:: [[later]]",
    "```",
    "hidden:: nope",
    "```",
  ].join("\n");

  assert.deepEqual(extractInlineFields(markdown), [
    ["priority", "1"],
    ["next", "[[later]]"],
  ]);
});

test("extracts wikilink targets without aliases or anchors", () => {
  assert.deepEqual(
    extractWikilinkTargets("[[a|Alias]] and [[b#Heading]] and [[c^block]]"),
    ["a", "b", "c"],
  );
});

test("collects hidden targets from frontmatter and inline fields", () => {
  const ontology = resolveOntology();

  assert.deepEqual(
    collectHiddenTargets({
      frontmatter: { hidden: "[[X]]" },
      markdown: "hidden:: [[Y]]",
      ontology,
    }),
    ["X", "Y"],
  );
  assert.deepEqual(
    collectHiddenTargets({
      frontmatter: { hidden: true },
      markdown: "",
      ontology,
    }),
    [],
  );
  assert.deepEqual(
    collectHiddenTargets({ frontmatter: {}, markdown: "plain", ontology }),
    [],
  );
});
