import {
  COLOR_MODE_READY_ATTRIBUTE,
  COLOR_MODE_STORAGE_KEY,
} from "../src/constants.js";

export type ColorModeScriptProps = {
  /** localStorage key to read the persisted choice from. Defaults to the plugin default. */
  readonly storageKey?: string;
};

/**
 * Inline script (and its `data-rb-color-mode="ready"` marker) that applies the
 * persisted color mode before first paint, preventing a flash of the wrong
 * theme. Render in `<head>`, ahead of the stylesheets.
 */
export default function ColorModeScript({
  storageKey = COLOR_MODE_STORAGE_KEY,
}: ColorModeScriptProps) {
  const key = JSON.stringify(storageKey);
  const ready = JSON.stringify(COLOR_MODE_READY_ATTRIBUTE);
  const source = `(function(){var d=document.documentElement;var m=null;try{m=localStorage.getItem(${key})}catch(e){m=null}if(m==="light"||m==="dark"){d.setAttribute("data-theme",m)}else if(m==="system"){d.removeAttribute("data-theme")}d.setAttribute(${ready},"ready")})();`;
  return <script dangerouslySetInnerHTML={{ __html: source }} />;
}
