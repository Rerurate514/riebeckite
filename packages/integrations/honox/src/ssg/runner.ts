import { defaultExtensionMap, redirectPlugin, toSSG } from "hono/ssg";

type ToSsgOptions = NonNullable<Parameters<typeof toSSG>[2]>;

export type SsgRunnerOptions = {
  readonly app: Parameters<typeof toSSG>[0];
  readonly outDir: string;
  readonly write: (path: string, data: string | Uint8Array) => Promise<void>;
  readonly plugins?: ToSsgOptions["plugins"];
  readonly extensionMap?: Record<string, string>;
  readonly incremental: boolean;
};

export async function runSsg(options: SsgRunnerOptions) {
  return await withSsgRenderEnvironment(options.incremental, () =>
    toSSG(
      options.app,
      {
        writeFile: options.write,
        mkdir: async () => {},
      },
      {
        dir: options.outDir,
        plugins: [redirectPlugin(), ...(options.plugins ?? [])],
        extensionMap: options.extensionMap ?? defaultExtensionMap,
      },
    ),
  );
}

async function withSsgRenderEnvironment<T>(
  incremental: boolean,
  operation: () => Promise<T>,
): Promise<T> {
  const previousFullRegeneration = process.env.RIEBECKITE_SSG_FULL_REGENERATION;
  const previousSkipUnchanged = process.env.RIEBECKITE_SSG_SKIP_UNCHANGED;
  process.env.RIEBECKITE_SSG_FULL_REGENERATION = incremental ? "" : "1";
  process.env.RIEBECKITE_SSG_SKIP_UNCHANGED = incremental ? "1" : "";
  try {
    return await operation();
  } finally {
    restoreEnvironmentVariable(
      "RIEBECKITE_SSG_FULL_REGENERATION",
      previousFullRegeneration,
    );
    restoreEnvironmentVariable(
      "RIEBECKITE_SSG_SKIP_UNCHANGED",
      previousSkipUnchanged,
    );
  }
}

function restoreEnvironmentVariable(
  name: string,
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
