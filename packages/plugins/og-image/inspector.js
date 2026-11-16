const LABELS = {
  en: {
    preview: "Preview",
    configuration: "Configuration",
    missing: "This page does not declare an OG image.",
    failed: "The OG image could not be loaded.",
  },
  ja: {
    preview: "プレビュー",
    configuration: "設定",
    missing: "このページにはOG画像が設定されていません。",
    failed: "OG画像を読み込めませんでした。",
  },
};

const STYLES = `.og-tab{display:grid;gap:16px}.og-label{color:#b8b8b8;font-size:12px;text-transform:uppercase}.og-frame{margin-top:6px;border:1px solid #444;background:#111;padding:8px}.og-frame img{display:block;width:100%;height:auto}.og-message{color:#b8b8b8;margin:0}.og-source{color:#b8b8b8;overflow-wrap:anywhere;margin:6px 0 0}.og-rows{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px;margin-top:6px}.og-key{color:#b8b8b8}.og-value{overflow-wrap:anywhere}`;

function labelsFor(locale) {
  return LABELS[locale] ?? LABELS.en;
}

function readMeta(property) {
  const element =
    document.querySelector(`meta[property="${property}"]`) ??
    document.querySelector(`meta[name="${property}"]`);
  return element?.getAttribute("content")?.trim() ?? "";
}

function siteOrigin() {
  const canonical = document.querySelector('link[rel="canonical"]');
  try {
    return canonical
      ? new URL(canonical.getAttribute("href") ?? "", document.baseURI).origin
      : "";
  } catch {
    return "";
  }
}

function previewUrls(value) {
  let absolute;
  try {
    absolute = new URL(value, document.baseURI);
  } catch {
    return [];
  }
  if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
    return [];
  }
  const origin = siteOrigin();
  if (absolute.origin !== location.origin && absolute.origin !== origin) {
    return [absolute.href];
  }
  const local = `${absolute.pathname}${absolute.search}`;
  return absolute.origin === location.origin
    ? [absolute.href]
    : [local, absolute.href];
}

function textValue(value, locale) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("en" in value || "ja" in value) {
      return String(value[locale] ?? value.en ?? value.ja ?? "");
    }
    return JSON.stringify(value);
  }
  return String(value ?? "");
}

function renderPreview(container, text) {
  const label = document.createElement("div");
  label.className = "og-label";
  label.textContent = text.preview;
  const frame = document.createElement("div");
  frame.className = "og-frame";
  container.append(label, frame);

  const value = readMeta("og:image");
  const urls = previewUrls(value);
  if (urls.length === 0) {
    const message = document.createElement("p");
    message.className = "og-message";
    message.textContent = text.missing;
    frame.append(message);
    return;
  }

  const image = document.createElement("img");
  image.alt = readMeta("og:image:alt");
  image.loading = "lazy";
  let next = 0;
  image.addEventListener("error", () => {
    next += 1;
    if (next < urls.length) {
      image.src = urls[next];
      return;
    }
    image.remove();
    const message = document.createElement("p");
    message.className = "og-message";
    message.textContent = text.failed;
    frame.append(message);
  });
  image.src = urls[0];
  frame.append(image);

  const source = document.createElement("p");
  source.className = "og-source";
  source.textContent = value;
  container.append(source);
}

function renderConfiguration(container, data, locale, text) {
  if (data?.kind !== "key-value" || !Array.isArray(data.items)) return;
  const label = document.createElement("div");
  label.className = "og-label";
  label.textContent = text.configuration;
  const rows = document.createElement("div");
  rows.className = "og-rows";
  for (const item of data.items) {
    const key = document.createElement("span");
    key.className = "og-key";
    key.textContent = textValue(item.key, locale);
    const value = document.createElement("span");
    value.className = "og-value";
    value.textContent = textValue(item.value, locale);
    rows.append(key, value);
  }
  container.append(label, rows);
}

export function mount(root, { data, locale }) {
  const text = labelsFor(locale);
  const style = document.createElement("style");
  style.textContent = STYLES;
  const container = document.createElement("div");
  container.className = "og-tab";
  renderPreview(container, text);
  renderConfiguration(container, data, locale, text);
  root.replaceChildren(style, container);
}
