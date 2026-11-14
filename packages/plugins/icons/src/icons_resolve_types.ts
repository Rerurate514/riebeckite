import type { ContentIcon, ContentManifestEntry } from "@riebeckite/core";

export type IconResolver = {
  readonly identifier: string;
  forEntry(entry: ContentManifestEntry): ContentIcon | undefined;
  forFolder(folder: string): ContentIcon | undefined;
  forTag(tag: string): ContentIcon | undefined;
  forProperty(property: string): ContentIcon | undefined;
  inline(name: string): ContentIcon | undefined;
  warnings(): readonly string[];
};
