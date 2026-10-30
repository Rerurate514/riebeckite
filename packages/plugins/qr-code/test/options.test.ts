import assert from "node:assert/strict";
import { test } from "node:test";
import { qrCode } from "../index.js";
import {
  DEFAULT_QR_CODE_OPTIONS,
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
