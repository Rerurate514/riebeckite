/**
 * Minimal ambient types for the `wavedrom` package, which ships no
 * declarations of its own. `client.ts` references this file with a
 * triple-slash directive so the dynamic imports stay type-safe without
 * leaking the dependency into the published declaration surface.
 */
declare module "wavedrom" {
  export type WaveJson = Record<string, unknown>;

  export interface WaveDromApi {
    version: string;
    /** The bundled default skin. */
    waveSkin: unknown;
    renderWaveForm(
      index: number,
      source: WaveJson,
      output: string,
      notFirstSignal?: boolean,
    ): void;
    renderWaveElement(
      index: number,
      source: WaveJson,
      outputElement: Element,
      waveSkin: unknown,
      notFirstSignal?: boolean,
    ): void;
    processAll(): void;
    eva(id: string): WaveJson;
    editorRefresh(): void;
    onml: Record<string, unknown>;
  }

  const WaveDrom: WaveDromApi;
  export default WaveDrom;
}

declare module "wavedrom/skins/default" {
  const skin: Record<string, unknown>;
  export default skin;
}

declare module "wavedrom/skins/narrow" {
  const skin: Record<string, unknown>;
  export default skin;
}

declare module "wavedrom/skins/lowkey" {
  const skin: Record<string, unknown>;
  export default skin;
}
