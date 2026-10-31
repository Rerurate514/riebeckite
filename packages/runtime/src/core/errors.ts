export class RuntimeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "RuntimeError";
  }
}

export class RuntimeStateError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeStateError";
  }
}

export class RuntimeFailureError extends RuntimeStateError {
  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = "RuntimeFailureError";
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export class RuntimeAbortError extends RuntimeError {
  constructor(message = "Interactive runtime operation was aborted.") {
    super(message);
    this.name = "RuntimeAbortError";
  }
}

export class RuntimeTimeoutError extends RuntimeError {
  constructor(message = "Interactive runtime operation timed out.") {
    super(message);
    this.name = "RuntimeTimeoutError";
  }
}

export class RuntimePayloadError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "RuntimePayloadError";
  }
}

export class RuntimeConcurrencyError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeConcurrencyError";
  }
}

export class RuntimeWorkerError extends RuntimeError {
  readonly remoteName: string | undefined;
  readonly remoteKind: string | undefined;

  constructor(
    message: string,
    options?: ErrorOptions & { remoteName?: string; remoteKind?: string },
  ) {
    super(message, options);
    this.name = "RuntimeWorkerError";
    this.remoteName = options?.remoteName;
    this.remoteKind = options?.remoteKind;
  }
}

export class RuntimeWasmError extends RuntimeError {
  readonly trap: boolean;

  constructor(message: string, options?: ErrorOptions & { trap?: boolean }) {
    super(message, options);
    this.name = "RuntimeWasmError";
    this.trap = options?.trap ?? false;
  }
}

export class RuntimeIframeError extends RuntimeError {
  readonly remoteKind: string | undefined;

  constructor(
    message: string,
    options?: ErrorOptions & { remoteKind?: string },
  ) {
    super(message, options);
    this.name = "RuntimeIframeError";
    this.remoteKind = options?.remoteKind;
  }
}

export class RuntimeUnsupportedError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeUnsupportedError";
  }
}
