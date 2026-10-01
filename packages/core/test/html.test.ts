import assert from "node:assert/strict";
import { test } from "node:test";
import {
  escapeHtml,
  escapeHtmlAttribute,
  escapeScriptJson,
} from "../src/utils/html.js";

test("escapeHtml escapes text for HTML body contexts", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')"> & text`),
    "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; text",
  );
});

test("escapeHtmlAttribute escapes quoted attribute contexts", () => {
  assert.equal(
    `<a href="${escapeHtmlAttribute('https://example.test/?q="x"&a=<b>')}">`,
    '<a href="https://example.test/?q=&quot;x&quot;&amp;a=&lt;b&gt;">',
  );
});

test("escapeScriptJson escapes <, >, &, U+2028 and U+2029", () => {
  const input = `<script> & "quotes" \u2028\u2029`;
  const escaped = escapeScriptJson(input);
  assert.equal(escaped.includes("</script>"), false);
  assert.equal(escaped.includes("<"), false);
  assert.equal(escaped.includes(">"), false);
  assert.equal(escaped.includes("&"), false);
  assert.equal(escaped, '\\u003cscript\\u003e \\u0026 "quotes" \\u2028\\u2029');
});

test("escapeScriptJson keeps the result valid parseable JSON", () => {
  const input = { title: `A <b>bold</b> line & more\u2028`, nested: ["x"] };
  const roundTrip = JSON.parse(escapeScriptJson(JSON.stringify(input)));
  assert.deepEqual(roundTrip, input);
});

test("escapeScriptJson leaves plain JSON untouched", () => {
  const input = JSON.stringify({ a: 1, b: "plain" });
  assert.equal(escapeScriptJson(input), input);
});

test("escapeScriptJson does not disable JSON injection inside a script tag", () => {
  const payload = { name: `</script><script>alert("xss")</script>` };
  const rendered = `<script type="application/json">${escapeScriptJson(JSON.stringify(payload))}</script>`;
  assert.equal(rendered.includes("</script><script>"), false);
  // The escaped content still round-trips when parsed.
  const match = /<script[^>]*>([\s\S]*?)<\/script>/g.exec(rendered);
  assert.ok(match);
  assert.deepEqual(JSON.parse(match[1] ?? ""), {
    name: `</script><script>alert("xss")</script>`,
  });
});
