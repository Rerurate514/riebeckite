import { definePlugin } from "@riebeckite/core";
import {
  NAVIGATION_PLUGIN_NAME,
  validateNavigationOptions,
} from "./src/navigation.js";
import type { NavigationOptions } from "./src/types.js";

export type { SiteNavProps } from "./components/site-nav.js";
export { SiteNav } from "./components/site-nav.js";
export {
  buildNavigation,
  NAVIGATION_PLUGIN_NAME,
  resolveSiteNavigation,
} from "./src/navigation.js";
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
    validateOptions: validateNavigationOptions,
    outputDependencies: [{ type: "global" }],
  });
}

export const navigationPlugin = navigation;
