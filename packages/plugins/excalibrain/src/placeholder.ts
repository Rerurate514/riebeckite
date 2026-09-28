export const EXCALIBRAIN_PLACEHOLDER_ATTRIBUTE = "data-rb-excalibrain";

export function createExcaliBrainPlaceholder(): string {
  return `<div ${EXCALIBRAIN_PLACEHOLDER_ATTRIBUTE}=""></div>`;
}

export function createExcaliBrainPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${EXCALIBRAIN_PLACEHOLDER_ATTRIBUTE}(?:="[^"]*")?[^>]*>\\s*</div>`,
    "g",
  );
}

export function hasExcaliBrainPlaceholder(html: string): boolean {
  return html.includes(EXCALIBRAIN_PLACEHOLDER_ATTRIBUTE);
}

export function replaceExcaliBrainPlaceholders(
  html: string,
  replacement: string,
): string {
  return html.replace(createExcaliBrainPlaceholderPattern(), replacement);
}
