import assert from "node:assert/strict";
import { test } from "node:test";
import { qrCode } from "../index.js";
import {
  DEFAULT_QR_CODE_OPTIONS,
  qrElementClassName,
  resolveQrCodeOptions,
} from "../src/options.js";

test("resolves documented defaults", () => {
  assert.deepEqual(resolveQrCodeOptions(), {
    level: "M",
    margin: 1,
    width: 160,
    dark: "#000000",
    light: "#ffffff",
    caption: true,
    className: "rb-qr",
    language: "qr",
  });
  assert.equal("fallback" in DEFAULT_QR_CODE_OPTIONS, false);
});

test("uses width", () => {
  assert.equal(resolveQrCodeOptions({ width: 240 }).width, 240);
});

test("rejects the removed size option in plugin configuration", () => {
  const issues = qrCode({ size: 200 } as never).validateOptions?.({
    size: 200,
  } as never);

  assert.deepEqual(issues, [
    { path: "size", message: 'Unknown option. Use "width".' },
  ]);
});

test("falls back on invalid values instead of throwing", () => {
  assert.equal(resolveQrCodeOptions({ level: "Z" as never }).level, "M");
  assert.equal(resolveQrCodeOptions({ margin: -1 }).margin, 1);
  assert.equal(resolveQrCodeOptions({ width: 0 }).width, 160);
  assert.equal(resolveQrCodeOptions({ dark: "  " }).dark, "#000000");
  assert.equal(resolveQrCodeOptions({ className: "" }).className, "rb-qr");
  assert.equal(
    resolveQrCodeOptions({ language: "language-qrt" }).language,
    "qrt",
  );
});

test("builds sub-element class names from the figure class", () => {
  assert.equal(qrElementClassName("rb-qr", "source"), "rb-qr__source");
  assert.equal(
    qrElementClassName("my-qr", "caption-text"),
    "my-qr__caption-text",
  );
});
