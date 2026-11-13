import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import type { ResolvedRiebeckiteConfig } from "@riebeckite/core";
import puppeteer from "puppeteer";
import { writeRiebeckiteAssetEntries } from "../src/asset_entries.js";

test("asset entries are not rewritten when their contents are unchanged", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-assets-"));
  const frameworkStyles = path.join(directory, "framework-styles.css");
  const pluginStyles = path.join(directory, "plugin-styles.css");
  const themeStyles = path.join(directory, "theme-styles.css");
  const config = {
    plugins: [
      {
        name: "example",
        assets: [{ kind: "style", moduleSpecifier: "@example/plugin.css" }],
      },
    ],
    theme: { styles: [{ moduleSpecifier: "@example/theme.css" }] },
  } as ResolvedRiebeckiteConfig;

  try {
    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });
    const timestamp = new Date("2020-01-01T00:00:00.000Z");
    await Promise.all([
      utimes(frameworkStyles, timestamp, timestamp),
      utimes(pluginStyles, timestamp, timestamp),
      utimes(themeStyles, timestamp, timestamp),
    ]);

    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });

    assert.equal(
      (await stat(frameworkStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
    assert.equal(
      (await stat(pluginStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
    assert.equal(
      (await stat(themeStyles)).mtime.getTime(),
      timestamp.getTime(),
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("generated entries import the framework, plugin, and theme stylesheets", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "riebeckite-assets-"));
  const frameworkStyles = path.join(directory, "framework-styles.css");
  const pluginStyles = path.join(directory, "plugin-styles.css");
  const themeStyles = path.join(directory, "theme-styles.css");
  const config = {
    plugins: [
      {
        name: "navigation",
        assets: [
          {
            kind: "style",
            moduleSpecifier: "@riebeckite/plugin-navigation/style.css",
          },
        ],
      },
    ],
    theme: {
      styles: [{ moduleSpecifier: "@riebeckite/theme-default/style.css" }],
    },
  } as ResolvedRiebeckiteConfig;

  try {
    writeRiebeckiteAssetEntries(config, {
      frameworkStyles,
      pluginStyles,
      themeStyles,
    });

    assert.match(
      await readFile(frameworkStyles, "utf8"),
      /@import "@riebeckite\/honox\/style\.css";/,
    );
    assert.match(
      await readFile(pluginStyles, "utf8"),
      /@import "@riebeckite\/plugin-navigation\/style\.css" layer\(rb-plugins\);/,
    );
    assert.match(
      await readFile(themeStyles, "utf8"),
      /@import "@riebeckite\/theme-default\/style\.css" layer\(rb-theme\);/,
    );
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("cascade layers keep theme above plugins and unlayered site CSS above both", async () => {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <style>
        @layer base, components, utilities, rb-plugins, rb-theme;
        @layer rb-plugins {
          @layer utilities {
            .plugin-target, .site-target { color: red; --cascade-token: plugin; }
          }
        }
        @layer rb-theme {
          @layer base {
            .plugin-target.plugin-target, .site-target.site-target { color: green; --cascade-token: theme; }
          }
        }
        .site-target { color: blue; --cascade-token: site; }
      </style>
      <div class="plugin-target">plugin</div>
      <div class="site-target">site</div>
    `);

    const styles = await page.evaluate(() => {
      const plugin = document.querySelector<HTMLElement>(".plugin-target");
      const site = document.querySelector<HTMLElement>(".site-target");
      if (!plugin || !site)
        throw new Error("Cascade test elements are missing.");
      return {
        pluginColor: getComputedStyle(plugin).color,
        pluginToken: getComputedStyle(plugin)
          .getPropertyValue("--cascade-token")
          .trim(),
        siteColor: getComputedStyle(site).color,
        siteToken: getComputedStyle(site)
          .getPropertyValue("--cascade-token")
          .trim(),
      };
    });

    assert.deepEqual(styles, {
      pluginColor: "rgb(0, 128, 0)",
      pluginToken: "theme",
      siteColor: "rgb(0, 0, 255)",
      siteToken: "site",
    });
  } finally {
    await browser.close();
  }
});
