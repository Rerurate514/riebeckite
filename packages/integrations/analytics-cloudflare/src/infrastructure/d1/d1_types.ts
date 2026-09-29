export interface D1Result<T = unknown> {
  results?: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}
