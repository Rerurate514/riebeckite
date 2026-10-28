import {
  createClientEntry,
  createStyleAsset,
  definePlugin,
} from "@riebeckite/core";
import {
  NAVIGATION_PLUGIN_NAME,
  validateNavigationOptions,
} from "./src/navigation.js";
import type { NavigationOptions } from "./src/types.js";

export type { SidebarNavigationProps } from "./components/sidebar-navigation.js";
export { SidebarNavigation } from "./components/sidebar-navigation.js";
export type {
  MobileSiteNavProps,
  SiteNavProps,
} from "./components/site-nav.js";
export { MobileSiteNav, SiteNav } from "./components/site-nav.js";
export {
  buildNavigation,
  NAVIGATION_PLUGIN_NAME,
  resolveSiteNavigation,
} from "./src/navigation.js";
export { initSidebarNavigation } from "./src/sidebar-navigation.client.js";
export type {
  NavigationItem,
  NavigationOptions,
  NavigationSource,
  SiteNavigation,
} from "./src/types.js";

export function navigation(options: NavigationOptions = {}) {
  return definePlugin({
    name: NAVIGATION_PLUGIN_NAME,
    options,
    assets: [
      createStyleAsset("navigation", "@riebeckite/plugin-navigation/style.css"),
    ],
    clientEntries: [
      createClientEntry(
        "navigation",
        "@riebeckite/plugin-navigation/client",
        "initSidebarNavigation",
        undefined,
        undefined,
        "context",
      ),
    ],
    validateOptions: validateNavigationOptions,
    contentOutputDependencies: [
      { type: "projection", projection: "navigation" },
    ],
  });
}
