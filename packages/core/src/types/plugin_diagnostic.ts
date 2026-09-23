import type { Diagnostic } from "./diagnostic";

export type PluginDiagnosticLevel = Diagnostic["severity"];

export type PluginDiagnostic = Diagnostic & { pluginName: string };
