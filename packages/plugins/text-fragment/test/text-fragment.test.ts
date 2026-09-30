import assert from "node:assert/strict";
import { test } from "node:test";
import { initTextFragmentShare } from "../client.js";
import {
  buildQuoteMarkdown,
  buildTextFragmentUrl,
  encodeTextFragment,
} from "../src/text-fragment.js";

const PAGE = "https://example.com/posts/hello";

test("encodeTextFragment encodes reserved characters", () => {
  assert.equal(encodeTextFragment("a,b-c&d"), "a%2Cb%2Dc%26d");
});

test("encodeTextFragment encodes whitespace and newlines", () => {
  assert.equal(encodeTextFragment("hello world"), "hello%20world");
  assert.equal(encodeTextFragment("line1\nline2"), "line1%0Aline2");
});

test("encodeTextFragment keeps Unicode intact per UTF-8", () => {
  assert.equal(encodeTextFragment("日本語"), "%E6%97%A5%E6%9C%AC%E8%AA%9E");
  assert.equal(
    encodeTextFragment("絵文字😀テスト"),
    "%E7%B5%B5%E6%96%87%E5%AD%97%F0%9F%98%80%E3%83%86%E3%82%B9%E3%83%88",
  );
  assert.equal(encodeTextFragment("😀"), "%F0%9F%98%80");
});

test("buildTextFragmentUrl builds a plain ASCII link", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "hello world"),
    `${PAGE}#:~:text=hello%20world`,
  );
});

test("buildTextFragmentUrl builds a Japanese link", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "こんにちは"),
    `${PAGE}#:~:text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF`,
  );
});

test("buildTextFragmentUrl builds an emoji link", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "絵文字😀"),
    `${PAGE}#:~:text=%E7%B5%B5%E6%96%87%E5%AD%97%F0%9F%98%80`,
  );
});

test("buildTextFragmentUrl encodes , - and & in the selection", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "a,b-c&d"),
    `${PAGE}#:~:text=a%2Cb%2Dc%26d`,
  );
});

test("buildTextFragmentUrl reduces a newline selection to start,end", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "first line\nsecond line"),
    `${PAGE}#:~:text=first,line`,
  );
  assert.equal(
    buildTextFragmentUrl(PAGE, "alpha\r\nbeta"),
    `${PAGE}#:~:text=alpha,beta`,
  );
});

test("buildTextFragmentUrl reduces a long selection to start,end", () => {
  const longSelection = `${"word ".repeat(45)}tail`;
  assert.ok(longSelection.length > 200);
  assert.equal(
    buildTextFragmentUrl(PAGE, longSelection),
    `${PAGE}#:~:text=word,tail`,
  );
});

test("buildTextFragmentUrl keeps a single long token without a separator", () => {
  const token = "a".repeat(240);
  assert.equal(buildTextFragmentUrl(PAGE, token), `${PAGE}#:~:text=${token}`);
});

test("buildTextFragmentUrl returns an empty string for an empty selection", () => {
  assert.equal(buildTextFragmentUrl(PAGE, ""), "");
  assert.equal(buildTextFragmentUrl(PAGE, "   \n\t "), "");
});

test("buildTextFragmentUrl strips an existing fragment or hash", () => {
  assert.equal(
    buildTextFragmentUrl(`${PAGE}#section-2`, "target"),
    `${PAGE}#:~:text=target`,
  );
  assert.equal(
    buildTextFragmentUrl(`${PAGE}#:~:text=old`, "target"),
    `${PAGE}#:~:text=target`,
  );
});

test("buildTextFragmentUrl appends prefix and suffix context", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "example", {
      prefix: "this is",
      suffix: "text fragment",
    }),
    `${PAGE}#:~:text=this%20is-,example,-text%20fragment`,
  );
});

test("buildTextFragmentUrl encodes reserved characters in prefix and suffix", () => {
  assert.equal(
    buildTextFragmentUrl(PAGE, "target", {
      prefix: "a-b",
      suffix: "c-d",
    }),
    `${PAGE}#:~:text=a%2Db-,target,-c%2Dd`,
  );
});

test("buildQuoteMarkdown prefixes every line and credits the source", () => {
  assert.equal(
    buildQuoteMarkdown({
      url: PAGE,
      title: "Hello World",
      selection: "line one\nline two",
    }),
    "> line one\n> line two\n> — [Hello World](https://example.com/posts/hello)",
  );
});

test("buildQuoteMarkdown normalizes CRLF newlines", () => {
  assert.equal(
    buildQuoteMarkdown({ url: PAGE, title: "T", selection: "a\r\nb" }),
    "> a\n> b\n> — [T](https://example.com/posts/hello)",
  );
});

test("initTextFragmentShare is a no-op without a document", () => {
  assert.equal(typeof document, "undefined");
  assert.doesNotThrow(() => initTextFragmentShare());
});
