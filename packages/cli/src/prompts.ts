import { createInterface } from "node:readline/promises";

export type SelectChoice<T> = {
  readonly value: T;
  readonly label: string;
};

export type SetupPrompts = {
  readonly interactive: boolean;
  select<T>(message: string, choices: readonly SelectChoice<T>[]): Promise<T>;
  confirm(message: string, initial: boolean): Promise<boolean>;
  password(message: string): Promise<string>;
};

export class NonInteractiveSetupError extends Error {
  readonly hint: string;

  constructor(message: string, hint?: string) {
    super(message);
    this.name = "NonInteractiveSetupError";
    this.hint =
      hint ??
      "Run the command in an interactive terminal, or provide the value through the environment.";
  }
}

export function createSetupPrompts(): SetupPrompts {
  return {
    interactive: isInteractive(),
    async select(message, choices) {
      assertInteractive();
      if (choices.length === 0) {
        throw new NonInteractiveSetupError("There is nothing to select.");
      }
      const lines: string[] = [message];
      choices.forEach((choice, index) => {
        lines.push(`  ${index + 1}) ${choice.label}`);
      });
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        while (true) {
          const answer = (
            await rl.question(
              `${lines.join("\n")}\nSelect [1-${choices.length}]: `,
            )
          ).trim();
          const index = Number.parseInt(answer, 10);
          if (index >= 1 && index <= choices.length) {
            const choice = choices[index - 1];
            if (choice !== undefined) return choice.value;
          }
        }
      } finally {
        rl.close();
      }
    },
    async confirm(message, initial) {
      assertInteractive();
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      const suffix = initial ? " [Y/n]: " : " [y/N]: ";
      try {
        while (true) {
          const answer = (await rl.question(message + suffix)).trim();
          if (answer === "") return initial;
          const normalized = answer.toLowerCase();
          if (normalized === "y" || normalized === "yes") return true;
          if (normalized === "n" || normalized === "no") return false;
        }
      } finally {
        rl.close();
      }
    },
    password(message) {
      return readHidden(message);
    },
  };
}

async function readHidden(message: string): Promise<string> {
  assertInteractive();
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const writable = rl as unknown as {
    _writeToOutput?: (value: string) => void;
  };
  if (typeof writable._writeToOutput !== "function") {
    rl.close();
    throw new NonInteractiveSetupError(
      "This terminal cannot hide the token input.",
      "Set CLOUDFLARE_API_TOKEN in the environment instead.",
    );
  }
  const original = writable._writeToOutput.bind(rl);
  let muted = false;
  writable._writeToOutput = (value: string) => {
    if (!muted) original(value);
  };
  process.stdout.write(message);
  muted = true;
  try {
    return await rl.question("");
  } finally {
    muted = false;
    writable._writeToOutput = original;
    process.stdout.write("\n");
    rl.close();
  }
}

function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

function assertInteractive(): void {
  if (!isInteractive()) {
    throw new NonInteractiveSetupError(
      "Cannot prompt for input in a non-interactive environment.",
    );
  }
}
