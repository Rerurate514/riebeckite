import { useEffect, useState } from "hono/jsx";
import type { GraphSettings } from "./index.js";
import {
  GRAPH_SETTINGS_RANGES,
  normalizeGraphSettings,
  readStoredGraphSettings,
  writeStoredGraphSettings,
} from "./index.js";
import type { GraphSettingsSetter, GraphViewProps } from "./ui_types.js";

export function useGraphSettingsStorage(
  props: GraphViewProps,
  settings: GraphSettings,
  setSettings: GraphSettingsSetter,
): boolean {
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (!props.storageKey) {
      setStorageReady(true);
      return;
    }
    const stored = readStoredGraphSettings(
      window.localStorage,
      props.storageKey,
    );
    if (stored) {
      setSettings((current) =>
        normalizeGraphSettings({
          ...current,
          ...stored,
          depth: Math.min(
            stored.depth,
            props.maxDepth ?? GRAPH_SETTINGS_RANGES.depth.max,
          ),
        }),
      );
    }
    setStorageReady(true);
  }, [props.storageKey]);

  useEffect(() => {
    if (!storageReady || !props.storageKey) return;
    writeStoredGraphSettings(window.localStorage, props.storageKey, settings);
  }, [settings, storageReady, props.storageKey]);

  return storageReady;
}
