export class RuntimeTransfer<TOutput> {
  constructor(
    readonly value: TOutput,
    readonly transfer: readonly unknown[] = [],
  ) {}
}

export function transferOutput<TOutput>(
  value: TOutput,
  transfer: readonly unknown[] = [],
): RuntimeTransfer<TOutput> {
  return new RuntimeTransfer(value, transfer);
}

export function isRuntimeTransfer<TOutput>(
  value: unknown,
): value is RuntimeTransfer<TOutput> {
  return value instanceof RuntimeTransfer;
}
