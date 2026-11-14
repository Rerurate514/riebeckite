import type { BasesBuiltinValue } from "./types.js";

export const DEFAULT_COLUMNS = ["file.name", "file.tags"] as const;

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly message: string;
    };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = (message: string): Result<never> => ({
  ok: false,
  message,
});

export const BUILTIN_ALIASES: Record<string, BasesBuiltinValue> = {
  "file.name": "file.name",
  "file.path": "file.path",
  "file.slug": "file.slug",
  "file.folder": "file.folder",
  "file.title": "file.title",
  "file.link": "file.link",
  "file.permalink": "file.permalink",
  "file.url": "file.link",
  "file.tags": "file.tags",
  "file.ext": "file.ext",
  "file.size": "file.size",
  "file.mtime": "file.mtime",
  "file.ctime": "file.ctime",
};

export function toList(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}
