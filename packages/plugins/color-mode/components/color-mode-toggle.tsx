import {
  COLOR_MODE_STORAGE_KEY,
  COLOR_MODES,
  type ColorMode,
} from "../src/constants.js";

export type ColorModeToggleProps = {
  /** localStorage key to persist the choice under. Defaults to the plugin default. */
  readonly storageKey?: string;
  /** Modes to offer, in order. Defaults to `["light", "dark", "system"]`. */
  readonly modes?: readonly ColorMode[];
  /** Per-mode `aria-label` overrides. */
  readonly labels?: Readonly<Partial<Record<ColorMode, string>>>;
  /** Group label, used as the `<legend>`. */
  readonly label?: string;
};

const DEFAULT_LABELS: Record<ColorMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Server-rendered control to switch between light, dark and system color
 * modes. The active state is applied by `initColorMode` at runtime; until the
 * client runs the control is hidden by the stylesheet.
 */
export default function ColorModeToggle({
  storageKey = COLOR_MODE_STORAGE_KEY,
  modes = COLOR_MODES,
  labels = {},
  label = "Color mode",
}: ColorModeToggleProps) {
  return (
    <fieldset
      class="rr-color-mode"
      data-color-mode-root
      data-color-mode-storage-key={storageKey}
    >
      <legend class="rr-color-mode__legend">{label}</legend>
      {modes.map((mode) => (
        <button
          key={mode}
          type="button"
          class="rr-color-mode__button"
          data-color-mode={mode}
          aria-label={labels[mode] ?? DEFAULT_LABELS[mode]}
        >
          <svg
            class="rr-color-mode__icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            {iconShape(mode)}
          </svg>
        </button>
      ))}
    </fieldset>
  );
}

function iconShape(mode: ColorMode) {
  switch (mode) {
    case "light":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
      );
    case "dark":
      return <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;
    case "system":
      return (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      );
  }
}
