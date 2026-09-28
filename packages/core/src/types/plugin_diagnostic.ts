import type { Diagnostic } from "./diagnostic.js";

export type PluginDiagnosticLevel = Diagnostic["severity"];

export type PluginDiagnostic = Diagnostic & { pluginName: string };
