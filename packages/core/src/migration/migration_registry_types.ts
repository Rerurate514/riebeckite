import type { ContentMigration } from "./migration_types.js";

export type ContentMigrationRegistry = {
  readonly migrations: readonly ContentMigration[];
  readonly order: readonly ContentMigration[];
  get(id: string, version?: number): ContentMigration | undefined;
  require(id: string, version?: number): ContentMigration;
  latest(id: string): ContentMigration | undefined;
  versions(id: string): readonly ContentMigration[];
  resolve(ids?: readonly string[]): readonly ContentMigration[];
};
