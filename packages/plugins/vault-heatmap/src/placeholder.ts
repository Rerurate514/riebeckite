export const VAULT_HEATMAP_ATTRIBUTE = "data-rr-vault-heatmap-source";

export function encodeVaultHeatmapSource(source: string): string {
  return encodeURIComponent(source);
}

export function decodeVaultHeatmapSource(encoded: string): string {
  return decodeURIComponent(encoded);
}

export function createVaultHeatmapPlaceholder(source: string): string {
  return `<div ${VAULT_HEATMAP_ATTRIBUTE}="${encodeVaultHeatmapSource(source)}"></div>`;
}

export function createVaultHeatmapPlaceholderPattern(): RegExp {
  return new RegExp(
    `<div\\b[^>]*\\b${VAULT_HEATMAP_ATTRIBUTE}="([^"]*)"[^>]*>\\s*</div>`,
    "g",
  );
}
