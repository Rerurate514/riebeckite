export type ClientLifecycleScope = "app" | "page";

export type ClientCleanup = () => void | Promise<void>;

export type ClientResourceScope = {
  readonly signal: AbortSignal;
  on(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: Omit<AddEventListenerOptions, "signal">,
  ): void;
  timeout(callback: () => void, delay?: number): void;
  interval(callback: () => void, delay?: number): void;
  cleanup(cleanup: ClientCleanup): void;
};

export type ClientInitializerContext<TRoot, TConfig> = {
  root: TRoot;
  signal: AbortSignal;
  scope: ClientResourceScope;
  config: TConfig;
};

export type ClientInitializer<TRoot, TConfig> = (
  context: ClientInitializerContext<TRoot, TConfig>,
) => undefined | ClientCleanup | Promise<undefined | ClientCleanup>;

export type ClientLifecycleErrorContext = {
  scope: ClientLifecycleScope;
  name: string;
  phase: "initialize" | "cleanup";
};

export type ClientLifecycleOptions = {
  onError?: (error: unknown, context: ClientLifecycleErrorContext) => void;
};

export type ClientLifecycleMount<TRoot, TConfig> = {
  scope: ClientLifecycleScope;
  name: string;
  root: TRoot;
  config: TConfig;
  initialize: ClientInitializer<TRoot, TConfig>;
};

type MountedClientInitializer<TRoot> = {
  root: TRoot;
  resources: InitializerResources;
  cleanup: Promise<ClientCleanup | undefined>;
  ready: Promise<void>;
};

type ScopeState = {
  controller: AbortController;
};

export class ClientLifecycle<TRoot> {
  private readonly mounted = new Map<
    ClientLifecycleScope,
    Map<string, MountedClientInitializer<TRoot>>
  >();
  private readonly scopes = new Map<ClientLifecycleScope, ScopeState>();
  private readonly onError: NonNullable<ClientLifecycleOptions["onError"]>;

  constructor(options: ClientLifecycleOptions = {}) {
    this.onError = options.onError ?? defaultErrorReporter;
  }

  mount<TConfig>(mount: ClientLifecycleMount<TRoot, TConfig>): Promise<void> {
    const scoped = this.scoped(mount.scope);
    const current = scoped.get(mount.name);
    if (current) {
      if (current.root === mount.root) return current.ready;
      throw new Error(
        `Client initializer "${mount.name}" is already mounted in ${mount.scope} scope.`,
      );
    }

    const scope = this.scopeState(mount.scope);
    const resources = new InitializerResources(scope.controller, (error) =>
      this.report(error, {
        scope: mount.scope,
        name: mount.name,
        phase: "cleanup",
      }),
    );
    const cleanup = this.initialize(mount, resources);
    const ready = cleanup.then(() => undefined);
    const mounted = { root: mount.root, resources, cleanup, ready };
    scoped.set(mount.name, mounted);
    return ready;
  }

  async unmount(scope: ClientLifecycleScope): Promise<void> {
    const scoped = this.mounted.get(scope);
    const state = this.scopes.get(scope);
    this.mounted.delete(scope);
    this.scopes.delete(scope);
    state?.controller.abort();
    if (!scoped) return;
    await Promise.all(
      [...scoped.entries()].map(([name, mounted]) =>
        this.cleanupMounted(scope, name, mounted),
      ),
    );
  }

  async dispose(): Promise<void> {
    await Promise.all([this.unmount("page"), this.unmount("app")]);
  }

  private scoped(scope: ClientLifecycleScope) {
    let scoped = this.mounted.get(scope);
    if (!scoped) {
      scoped = new Map();
      this.mounted.set(scope, scoped);
    }
    return scoped;
  }

  private scopeState(scope: ClientLifecycleScope): ScopeState {
    let state = this.scopes.get(scope);
    if (!state) {
      state = { controller: new AbortController() };
      this.scopes.set(scope, state);
    }
    return state;
  }

  private async initialize<TConfig>(
    mount: ClientLifecycleMount<TRoot, TConfig>,
    resources: InitializerResources,
  ): Promise<ClientCleanup | undefined> {
    try {
      const result = await mount.initialize({
        root: mount.root,
        signal: resources.signal,
        scope: resources,
        config: mount.config,
      });
      return typeof result === "function" ? result : undefined;
    } catch (error) {
      await resources.dispose();
      this.report(error, {
        scope: mount.scope,
        name: mount.name,
        phase: "initialize",
      });
      return undefined;
    }
  }

  private async cleanupMounted(
    scope: ClientLifecycleScope,
    name: string,
    mounted: MountedClientInitializer<TRoot>,
  ): Promise<void> {
    const [cleanup] = await Promise.all([
      mounted.cleanup,
      mounted.resources.dispose(),
    ]);
    try {
      await cleanup?.();
    } catch (error) {
      this.report(error, { scope, name, phase: "cleanup" });
    }
  }

  private report(error: unknown, context: ClientLifecycleErrorContext): void {
    try {
      this.onError(error, context);
    } catch {
      return;
    }
  }
}

class InitializerResources implements ClientResourceScope {
  private readonly cleanups: ClientCleanup[] = [];
  private readonly listeners: Array<{
    target: EventTarget;
    type: string;
    listener: EventListenerOrEventListenerObject;
    options?: Omit<AddEventListenerOptions, "signal">;
  }> = [];
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private readonly intervals = new Set<ReturnType<typeof setInterval>>();
  private disposed = false;

  constructor(
    private readonly controller: AbortController,
    private readonly report: (error: unknown) => void,
  ) {}

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  on(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: Omit<AddEventListenerOptions, "signal">,
  ): void {
    if (this.disposed || this.signal.aborted) return;
    target.addEventListener(type, listener, {
      ...options,
      signal: this.signal,
    });
    this.listeners.push({ target, type, listener, options });
  }

  timeout(callback: () => void, delay = 0): void {
    if (this.disposed || this.signal.aborted) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      if (!this.disposed && !this.signal.aborted) callback();
    }, delay);
    this.timers.add(timer);
  }

  interval(callback: () => void, delay = 0): void {
    if (this.disposed || this.signal.aborted) return;
    const interval = setInterval(() => {
      if (!this.disposed && !this.signal.aborted) callback();
    }, delay);
    this.intervals.add(interval);
  }

  cleanup(cleanup: ClientCleanup): void {
    if (this.disposed) {
      void this.run(cleanup);
      return;
    }
    this.cleanups.push(cleanup);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    for (const { target, type, listener, options } of this.listeners) {
      target.removeEventListener(type, listener, options);
    }
    this.listeners.length = 0;
    for (const timer of this.timers) clearTimeout(timer);
    for (const interval of this.intervals) clearInterval(interval);
    this.timers.clear();
    this.intervals.clear();
    const cleanups = this.cleanups.splice(0).reverse();
    await Promise.all(cleanups.map((cleanup) => this.run(cleanup)));
  }

  private async run(cleanup: ClientCleanup): Promise<void> {
    try {
      await cleanup();
    } catch (error) {
      this.report(error);
    }
  }
}

function defaultErrorReporter(
  error: unknown,
  context: ClientLifecycleErrorContext,
): void {
  console.error(
    `[riebeckite] Client initializer ${context.phase} failed: ${context.name}`,
    error,
  );
}
