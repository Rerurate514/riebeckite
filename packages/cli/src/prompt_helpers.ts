import { cancel, isCancel } from "@clack/prompts";

export async function resolvePrompt<T>(
  result: Promise<T>,
): Promise<Exclude<T, symbol> | null> {
  const value = await result;
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    return null;
  }
  return value as Exclude<T, symbol>;
}

export function validateInput(
  assertion: (value: string) => void,
): (value: string | undefined) => string | undefined {
  return (value) => {
    try {
      assertion((value ?? "").trim());
      return undefined;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  };
}
