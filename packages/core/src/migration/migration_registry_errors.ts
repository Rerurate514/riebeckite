export class ContentMigrationRegistryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ContentMigrationRegistryError";
    this.code = code;
  }
}
