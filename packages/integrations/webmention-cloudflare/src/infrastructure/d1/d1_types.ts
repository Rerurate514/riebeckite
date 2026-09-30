/** Minimal structural subset of the Cloudflare D1 binding used by the adapter. */
export interface D1PreparedStatement {
  bind(...values: readonly unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
