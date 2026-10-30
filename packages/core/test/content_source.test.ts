import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ContentSource,
  cacheContentSource,
  getContentSourceEntrySize,
} from "../index.ts";

test("cached content sources share scans and reads", async () => {
  let scans = 0;
  let reads = 0;
  const source: ContentSource = {
    async scan() {
      scans += 1;
      return [{ path: "asset.bin", metadata: { size: 3 } }];
    },
    async read() {
      reads += 1;
      return new Uint8Array([1, 2, 3]);
    },
  };
  const cached = cacheContentSource(source);
  const [first, second] = await Promise.all([cached.scan(), cached.scan()]);

  assert.equal(scans, 1);
  await Promise.all([cached.read(first[0]), cached.read(second[0])]);
  assert.equal(reads, 1);
});

test("content entry size uses metadata before reading", async () => {
  let reads = 0;
  const source: ContentSource = {
    async scan() {
      return [{ path: "asset.bin", metadata: { size: 3 } }];
    },
    async read() {
      reads += 1;
      return new Uint8Array([1, 2, 3]);
    },
  };

  assert.equal(await getContentSourceEntrySize(source, "asset.bin"), 3);
  assert.equal(reads, 0);
});
