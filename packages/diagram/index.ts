export { resolveDiagramCaption } from "./src/caption.js";
export { reportDiagramDiagnostic } from "./src/diagnostic.js";
export { buildDiagramFigure, deterministicDiagramId } from "./src/figure.js";
export {
  element,
  findDiagramBlocks,
  getStringProperty,
  getTextContent,
  hasClass,
  mergeClassName,
  text,
  visitElements,
} from "./src/hast.js";
export { defineDiagramPlugin } from "./src/plugin.js";
export { createRenderSession } from "./src/session.js";
export type {
  DiagramBlock,
  DiagramBuildRenderer,
  DiagramBuildResult,
  DiagramCaptionStrategy,
  DiagramContent,
  DiagramErrorKind,
  DiagramFigureInput,
  DiagramNode,
  DiagramPluginDefinition,
  DiagramRenderMode,
  DiagramSession,
} from "./src/types.js";
