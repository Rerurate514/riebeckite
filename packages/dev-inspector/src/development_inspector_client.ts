import { inspectorClientCore } from "./development_inspector_client_core.js";
import { inspectorClientI18n } from "./development_inspector_client_i18n.js";
import { inspectorClientRender } from "./development_inspector_client_render.js";
import { inspectorClientStyles } from "./development_inspector_client_styles.js";
import { diagnosticMatchesPage } from "./development_inspector_query.js";
export const reportPath = "/__riebeckite/inspector/report";
export const outputPath = "/__riebeckite/inspector/output";
export const graphPath = "/__riebeckite/inspector/graph";
export const pluginsPath = "/__riebeckite/inspector/plugins";
export const provenancePath = "/__riebeckite/inspector/provenance";
export const assetsPath = "/__riebeckite/inspector/assets";
export const tabsPath = "/__riebeckite/inspector/tabs";
export const bootstrapPath = "/__riebeckite/inspector/bootstrap";
export const inspectorTokenHeader = "x-riebeckite-inspector-token";
export const listedOutputLimit = 20;
export const maximumListedOutputLimit = 100;

export function inspectorClientModule(): string {
  return `
const reportEndpoint = ${JSON.stringify(reportPath)};
const outputEndpoint = ${JSON.stringify(outputPath)};
const graphEndpoint = ${JSON.stringify(graphPath)};
const pluginsEndpoint = ${JSON.stringify(pluginsPath)};
const provenanceEndpoint = ${JSON.stringify(provenancePath)};
const assetsEndpoint = ${JSON.stringify(assetsPath)};
const tabsEndpoint = ${JSON.stringify(tabsPath)};
const bootstrapEndpoint = ${JSON.stringify(bootstrapPath)};
const tokenHeader = ${JSON.stringify(inspectorTokenHeader)};
const panelId = "riebeckite-development-inspector";
const outputLimit = ${listedOutputLimit};
${diagnosticMatchesPage.toString()}

${inspectorClientI18n}${inspectorClientCore}${inspectorClientRender}${inspectorClientStyles}
`;
}
