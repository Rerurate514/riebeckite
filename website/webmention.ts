import {
  getWebmentionSectionData as getSectionData,
  MemoryWebmentionProvider,
} from "@riebeckite/plugin-webmention";

export const webmentionProvider = new MemoryWebmentionProvider();

export const getWebmentionSectionData = getSectionData;
