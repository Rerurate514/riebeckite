import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { createElement, Fragment } from "hono/jsx";
import { renderToString } from "hono/jsx/dom/server";
import puppeteer, { type Browser, type Page } from "puppeteer";
import { MobileSiteNav, SiteNav } from "../../components/site-nav.tsx";

(globalThis as { React?: unknown }).React = { createElement, Fragment };

let browser: Browser | null = null;
const navigationStyle = await readFile(
  new URL("../../style.css", import.meta.url),
  "utf8",
);

const tokens = `:root {
  --rb-color-ink: #111;
  --rb-color-accent: #c40;
  --rb-color-surface: #fff;
  --rb-color-border: #ddd;
  --rb-space-2: 1rem;
  --rb-space-3: 1.5rem;
}`;

const placementStyle = `
  @media (max-width: 30rem) {
    .site-header__primary-navigation { display: none; }
    .rb-site-header > .rb-nav { display: none; }
  }`;

const items = [
  { label: "Docs", href: "/docs/" },
  { label: "Reference", href: "/reference/" },
  { label: "Themes", href: "/themes/" },
  { label: "Explore", href: "/explore/" },
];

function wrappedHeader(): string {
  const desktop = renderToString(
    SiteNav({ items, path: "/docs/", omitHome: true }),
  );
  const mobile = renderToString(
    MobileSiteNav({ items, path: "/docs/", omitHome: true }),
  );
  return `<header class="site-header rb-site-header">
    <a class="site-header__home rb-site-header__home" href="/">Riebeckite</a>
    <div class="site-header__primary-navigation">${desktop}</div>
    <div class="site-header__mobile-navigation">${mobile}</div>
  </header>`;
}

function directHeader(): string {
  const desktop = renderToString(
    SiteNav({ items, path: "/docs/", omitHome: true }),
  );
  const inner = renderToString(
    SiteNav({ items, path: "/docs/", omitHome: true }),
  );
  return `<header class="rb-site-header">
    <a class="rb-site-header__home" href="/">Riebeckite</a>
    ${desktop}
    <details class="rb-nav__mobile">
      <summary class="rb-nav__toggle">Menu</summary>
      ${inner}
    </details>
  </header>`;
}

async function load(page: Page, body: string, width: number): Promise<void> {
  await page.setViewport({ width, height: 800 });
  await page.setContent(
    `<!doctype html><html><head><style>${tokens}${placementStyle}${navigationStyle}</style></head><body>${body}</body></html>`,
  );
}

before(async () => {
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch {
    browser = null;
  }
});

after(async () => {
  await browser?.close();
});

for (const width of [1440, 1024]) {
  test(`desktop (${width}px) shows the primary navigation and hides the mobile menu`, async (t) => {
    if (!browser) return t.skip("Puppeteer browser is unavailable");
    const page = await browser.newPage();
    await load(page, wrappedHeader(), width);

    const state = await page.evaluate(() => {
      const details = document.querySelector("details.rb-nav__mobile");
      const primary = document.querySelector(
        ".site-header__primary-navigation",
      );
      const desktopNav = primary?.querySelector(".rb-nav") ?? null;
      return {
        detailsDisplay: details ? getComputedStyle(details).display : "MISSING",
        detailsHeight: details ? details.getBoundingClientRect().height : null,
        primaryDisplay: primary ? getComputedStyle(primary).display : "MISSING",
        desktopNavVisible: desktopNav
          ? desktopNav.getBoundingClientRect().height > 0
          : false,
      };
    });

    assert.equal(state.detailsDisplay, "none");
    assert.equal(state.detailsHeight, 0);
    assert.notEqual(state.primaryDisplay, "none");
    assert.equal(state.desktopNavVisible, true);
    await page.close();
  });
}

for (const width of [375, 320]) {
  test(`mobile (${width}px) hides the primary navigation and shows the menu button`, async (t) => {
    if (!browser) return t.skip("Puppeteer browser is unavailable");
    const page = await browser.newPage();
    await load(page, wrappedHeader(), width);

    const state = await page.evaluate(() => {
      const details = document.querySelector("details.rb-nav__mobile");
      const primary = document.querySelector(
        ".site-header__primary-navigation",
      );
      return {
        detailsDisplay: details ? getComputedStyle(details).display : "MISSING",
        detailsVisible: details
          ? details.getBoundingClientRect().height > 0
          : false,
        primaryDisplay: primary ? getComputedStyle(primary).display : "MISSING",
      };
    });

    assert.equal(state.detailsDisplay, "block");
    assert.equal(state.detailsVisible, true);
    assert.equal(state.primaryDisplay, "none");
    await page.close();
  });
}

for (const width of [768, 481]) {
  test(`tablet (${width}px) keeps exactly one navigation region visible`, async (t) => {
    if (!browser) return t.skip("Puppeteer browser is unavailable");
    const page = await browser.newPage();
    await load(page, wrappedHeader(), width);

    const state = await page.evaluate(() => {
      const details = document.querySelector("details.rb-nav__mobile");
      const primary = document.querySelector(
        ".site-header__primary-navigation",
      );
      return {
        detailsDisplay: details ? getComputedStyle(details).display : "MISSING",
        primaryDisplay: primary ? getComputedStyle(primary).display : "MISSING",
      };
    });

    assert.equal(state.detailsDisplay, "none");
    assert.notEqual(state.primaryDisplay, "none");
    await page.close();
  });
}

test("mobile breakpoint boundary switches regions without a duplicate", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();

  const readRegions = () => {
    const details = document.querySelector("details.rb-nav__mobile");
    const primary = document.querySelector(".site-header__primary-navigation");
    return {
      details: details ? getComputedStyle(details).display : "MISSING",
      primary: primary ? getComputedStyle(primary).display : "MISSING",
    };
  };

  await load(page, wrappedHeader(), 480);
  const atBoundary = await page.evaluate(readRegions);
  assert.equal(atBoundary.details, "block");
  assert.equal(atBoundary.primary, "none");

  await load(page, wrappedHeader(), 481);
  const afterBoundary = await page.evaluate(readRegions);
  assert.equal(afterBoundary.details, "none");
  assert.notEqual(afterBoundary.primary, "none");
  await page.close();
});

test("opening the mobile menu stacks links vertically and closing hides them", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await load(page, wrappedHeader(), 375);

  await page.click(".rb-nav__toggle");
  const open = await page.evaluate(() => {
    const details = document.querySelector("details.rb-nav__mobile");
    if (!(details instanceof HTMLDetailsElement)) {
      throw new Error("mobile menu is missing");
    }
    const list = details.querySelector(".rb-nav__list");
    const links = Array.from(details.querySelectorAll(".rb-nav__link"));
    const boxes = links.map((link) => link.getBoundingClientRect());
    const stacked = boxes.every((box, index) => {
      const previous = boxes[index - 1];
      return index === 0 || previous === undefined || box.top >= previous.top;
    });
    return {
      open: details.open,
      flexDirection: list ? getComputedStyle(list).flexDirection : "MISSING",
      stacked,
      linkCount: links.length,
      visible: links.every((link) => link.checkVisibility()),
    };
  });

  assert.equal(open.open, true);
  assert.equal(open.flexDirection, "column");
  assert.equal(open.stacked, true);
  assert.equal(open.linkCount, 4);
  assert.equal(open.visible, true);

  await page.click(".rb-nav__toggle");
  const closed = await page.evaluate(() => {
    const details = document.querySelector("details.rb-nav__mobile");
    const link = details?.querySelector(".rb-nav__link");
    return {
      open: details instanceof HTMLDetailsElement ? details.open : true,
      linkVisible: link ? link.checkVisibility() : true,
    };
  });
  assert.equal(closed.open, false);
  assert.equal(closed.linkVisible, false);
  await page.close();
});

test("keyboard toggles the mobile menu open and closed", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();
  await load(page, wrappedHeader(), 375);

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement?.className),
    "rb-nav__toggle",
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.$eval("details.rb-nav__mobile", (details) => details.open),
    true,
  );
  await page.keyboard.press("Enter");
  assert.equal(
    await page.$eval("details.rb-nav__mobile", (details) => details.open),
    false,
  );
  await page.close();
});

test("direct mobile menu usage never duplicates the desktop navigation", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();

  for (const width of [1440, 768, 375, 320]) {
    await load(page, directHeader(), width);
    const state = await page.evaluate(() => {
      const details = document.querySelector("details.rb-nav__mobile");
      const desktopNav = document.querySelector(".rb-site-header > .rb-nav");
      const detailsVisible = details
        ? details.getBoundingClientRect().height > 0
        : false;
      const desktopVisible = desktopNav
        ? desktopNav.getBoundingClientRect().height > 0
        : false;
      return { detailsVisible, desktopVisible, width: window.innerWidth };
    });
    assert.notEqual(
      state.detailsVisible && state.desktopVisible,
      true,
      `both navigations visible at ${width}px`,
    );
    if (state.width <= 480) {
      assert.equal(state.desktopVisible, false);
      assert.equal(state.detailsVisible, true);
    } else {
      assert.equal(state.desktopVisible, true);
      assert.equal(state.detailsVisible, false);
    }
  }
  await page.close();
});

test("mobile menu never overflows the viewport, even with long labels", async (t) => {
  if (!browser) return t.skip("Puppeteer browser is unavailable");
  const page = await browser.newPage();

  const longItems = [
    { label: "A very long navigation label that should wrap", href: "/long/" },
    { label: "Docs", href: "/docs/" },
  ];
  const desktop = renderToString(
    SiteNav({ items: longItems, path: "/docs/", omitHome: true }),
  );
  const mobile = renderToString(
    MobileSiteNav({ items: longItems, path: "/docs/", omitHome: true }),
  );
  const body = `<header class="site-header rb-site-header">
    <a class="site-header__home rb-site-header__home" href="/">Riebeckite</a>
    <div class="site-header__primary-navigation">${desktop}</div>
    <div class="site-header__mobile-navigation">${mobile}</div>
  </header>`;

  for (const width of [320, 375, 480, 481, 768, 1024, 1440]) {
    await load(page, body, width);
    const hasMenu = await page.evaluate(() => {
      const toggle = document.querySelector(".rb-nav__toggle");
      return toggle ? toggle.getBoundingClientRect().height > 0 : false;
    });
    if (hasMenu) {
      await page.click(".rb-nav__toggle");
    }
    const state = await page.evaluate(() => {
      const root = document.documentElement;
      const panel = document.querySelector(".rb-nav__mobile > .rb-nav");
      const panelBox = panel?.getBoundingClientRect();
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
        panelRight: panelBox ? panelBox.right : null,
        panelLeft: panelBox ? panelBox.left : null,
      };
    });
    assert.ok(
      state.scrollWidth <= state.clientWidth,
      `horizontal scroll at ${width}px (${state.scrollWidth} > ${state.clientWidth})`,
    );
    if (state.panelLeft !== null && state.panelRight !== null) {
      assert.ok(state.panelLeft >= -0.5, `panel overflows left at ${width}px`);
      assert.ok(
        state.panelRight <= width + 0.5,
        `panel overflows right at ${width}px`,
      );
    }
  }
  await page.close();
});
