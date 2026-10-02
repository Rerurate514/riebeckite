import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DIAGNOSTIC_INVALID,
  DIAGNOSTIC_UNKNOWN,
  remarkShortcodes,
} from "../index.ts";

type CapturedMessage = { reason: string; ruleId?: string };

function createFile(): {
  messages: CapturedMessage[];
  message(reason: string, options: { ruleId?: string }): string;
} {
  const messages: CapturedMessage[] = [];
  return {
    messages,
    message(reason, options) {
      messages.push({ reason, ruleId: options.ruleId });
      return reason;
    },
  };
}

test("unknown shortcodes become an escaped fallback and are diagnosed", () => {
  const file = createFile();
  const tree = {
    type: "root",
    children: [
      {
        type: "leafDirective",
        name: 'no"pe',
        attributes: { a: "<b>" },
        children: [{ type: "text", value: "Foo" }],
      },
    ],
  };

  const root = tree as unknown as {
    children: { type: string; value: string }[];
  };
  remarkShortcodes()(tree as never, file);

  const node = root.children[0];
  assert.equal(node.type, "html");
  assert.ok(node.value.includes("rb-shortcode--unknown"));
  assert.ok(node.value.includes('data-shortcode-name="no&quot;pe"'));
  assert.ok(node.value.includes("::no&quot;pe[Foo]{a=&quot;&lt;b&gt;&quot;}"));
  assert.equal(file.messages[0]?.ruleId, DIAGNOSTIC_UNKNOWN);
});

test("malformed attributes are dropped and diagnosed", () => {
  const file = createFile();
  const tree = {
    type: "root",
    children: [
      {
        type: "leafDirective",
        name: "badge",
        attributes: { "bad key": "x", text: "Hi" },
        children: [],
      },
    ],
  };

  const root = tree as unknown as {
    children: { type: string; value: string }[];
  };
  remarkShortcodes()(tree as never, file);

  const node = root.children[0];
  assert.equal(node.type, "html");
  assert.ok(node.value.includes(">Hi<"));
  assert.ok(!node.value.includes("bad key"));
  assert.equal(file.messages[0]?.ruleId, DIAGNOSTIC_INVALID);
});
