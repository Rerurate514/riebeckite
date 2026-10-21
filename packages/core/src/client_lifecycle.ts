export type ClientLifecycleScope = "app" | "page";

export type ClientCleanup = () => void | Promise<void>;

export type ClientInitializerContext<TRoot, TConfig> = {
  root: TRoot;
  signal: AbortSignal;
  config: TConfig;
};

export type ClientInitializer<TRoot, TConfig> = (
  context: ClientInitializerContext<TRoot, TConfig>,
) => void | ClientCleanup | Promise<void | ClientCleanup>;

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
  controller: AbortController;
  cleanup: Promise<ClientCleanup | undefined>;
  ready: Promise<void>;
};

export class ClientLifecycle<TRoot> {
  private readonly mounted = new Map<
    ClientLifecycleScope,
    Map<string, MountedClientInitializer<TRoot>>
  >();
  private readonly onError: NonNullable<ClientLifecycleOptions["onError"]>;

  constructor(options: ClientLifecycleOptions = {}) {
    this.onError = options.onError ?? defaultErrorReporter;
  }

  mount<TConfig>(mount: ClientLifecycleMount<TRoot, TConfig>): Promise<void> {
    const scoped = this.scope(mount.scope);
    const current = scoped.get(mount.name);
    if (current) {
      if (current.root === mount.root) return current.ready;
      throw new Error(
        `Client initializer "${mount.name}" is already mounted in ${mount.scope} scope.`,
      );
    }

    const controller = new AbortController();
    const cleanup = this.initialize(mount, controller.signal);
    const ready = cleanup.then(() => undefined);
    const mounted = { root: mount.root, controller, cleanup, ready };
    scoped.set(mount.name, mounted);
    return ready;
  }

  async unmount(scope: ClientLifecycleScope): Promise<void> {
    const scoped = this.mounted.get(scope);
    if (!scoped) return;
    this.mounted.delete(scope);
    await Promise.all(
      [...scoped.entries()].map(([name, mounted]) =>
        this.cleanupMounted(scope, name, mounted),
      ),
    );
  }

  async dispose(): Promise<void> {
    await Promise.all([this.unmount("page"), this.unmount("app")]);
  }

  private scope(scope: ClientLifecycleScope) {
    let scoped = this.mounted.get(scope);
    if (!scoped) {
      scoped = new Map();
      this.mounted.set(scope, scoped);
    }
    return scoped;
  }

  private async initialize<TConfig>(
    mount: ClientLifecycleMount<TRoot, TConfig>,
    signal: AbortSignal,
  ): Promise<ClientCleanup | undefined> {
    try {
      const result = await mount.initialize({
        root: mount.root,
        signal,
        config: mount.config,
      });
      return typeof result === "function" ? result : undefined;
    } catch (error) {
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
    mounted.controller.abort();
    try {
      const cleanup = await mounted.cleanup;
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

function defaultErrorReporter(
  error: unknown,
  context: ClientLifecycleErrorContext,
): void {
  console.error(
    `[riebeckite] Client initializer ${context.phase} failed: ${context.name}`,
    error,
  );
}
