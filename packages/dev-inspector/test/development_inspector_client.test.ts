import assert from "node:assert/strict";
import test from "node:test";
import { inspectorClientModule } from "../src/development_inspector_client.js";

test("inspector client offers an English and Japanese interface", () => {
  const module = inspectorClientModule();

  assert.match(module, /data-language/);
  assert.match(module, /<option value="ja"/);
  assert.match(module, /"Overview": "概要"/);
  assert.match(module, /"Close": "閉じる"/);
  assert.match(module, /id: "overview"/);
  assert.match(module, /"plugin:" \+ tab\.id/);
  assert.match(module, /renderPluginTabData/);
  assert.match(module, /"Plugin tab does not export mount\(\)\."/);
});

test("inspector client reserves its vertical scrollbar gutter", () => {
  const module = inspectorClientModule();

  assert.match(module, /overflow-y:scroll;scrollbar-gutter:stable/);
});
