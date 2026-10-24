import type {
  MetaBindExpression,
  MetaBindInput,
  MetaBindParseResult,
  MetaBindTarget,
  MetaBindValue,
} from "./types.js";

const MAX_SOURCE_LENGTH = 4_096;
const MAX_TOKENS = 512;
const targetPattern = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/;
const forbiddenTargetParts = new Set(["__proto__", "constructor", "prototype"]);

export function parseMetaBind(
  source: string,
  inline = true,
): MetaBindParseResult {
  if (source.length > MAX_SOURCE_LENGTH) return failure("Syntax is too long.");
  try {
    if (source.startsWith("INPUT[")) return parseInput(source, inline);
    if (source.startsWith("VIEW[")) return parseView(source);
    return failure("Expected INPUT[...] or VIEW[...].");
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Invalid syntax.");
  }
}

function parseInput(source: string, inline: boolean): MetaBindParseResult {
  const body = bracketBody(source, "INPUT[");
  if (body.end !== source.length)
    throw new Error("Unexpected content after INPUT.");
  const colon = splitTopLevel(body.value, ":");
  if (!colon) throw new Error("An INPUT field needs a same-page bind target.");
  const head = colon[0].trim();
  const target = parseTarget(colon[1].trim());
  const match = /^([A-Za-z]+)(?:\((.*)\))?$/.exec(head);
  if (!match) throw new Error("Invalid INPUT field.");
  const input = match[1] as MetaBindInput["input"];
  if (
    !(["text", "number", "slider", "toggle", "select"] as const).includes(input)
  )
    throw new Error(`Unsupported input type \`${match[1]}\`.`);
  if (input === "select" && inline)
    throw new Error("select is only supported in meta-bind code blocks.");
  const arguments_ = parseArguments(match[2] ?? "");
  const options = (arguments_.option ?? []).map((values) => ({
    value: values[0] ?? "",
    label: String(values[1] ?? values[0] ?? ""),
  }));
  if (input === "select" && options.length === 0)
    throw new Error("select needs at least one option(...).");
  return {
    ok: true,
    value: {
      kind: "input",
      input,
      target,
      arguments: Object.fromEntries(
        Object.entries(arguments_).map(([key, values]) => [key, values.flat()]),
      ),
      options,
    },
  };
}

function parseView(source: string): MetaBindParseResult {
  const body = bracketBody(source, "VIEW[");
  const suffix = source.slice(body.end);
  if (suffix !== "" && suffix !== "[math]")
    throw new Error("Only the default math VIEW is supported.");
  const expression = new ExpressionParser(body.value).parse();
  const dependencies: MetaBindTarget[] = [];
  collectDependencies(expression, dependencies);
  return {
    ok: true,
    value: { kind: "view", source: body.value, expression, dependencies },
  };
}

function bracketBody(source: string, prefix: string) {
  if (!source.startsWith(prefix)) throw new Error("Invalid field.");
  let depth = 1;
  for (let index = prefix.length; index < source.length; index += 1) {
    if (source[index] === "[") depth += 1;
    if (source[index] === "]") depth -= 1;
    if (depth === 0)
      return { value: source.slice(prefix.length, index), end: index + 1 };
  }
  throw new Error("Unclosed bracket.");
}

function parseTarget(source: string): MetaBindTarget {
  if (!targetPattern.test(source))
    throw new Error("Only same-page frontmatter properties are supported.");
  const path = source.split(".");
  if (path.some((part) => forbiddenTargetParts.has(part)))
    throw new Error("Unsafe frontmatter property path.");
  return { path };
}

function parseArguments(source: string): Record<string, MetaBindValue[][]> {
  if (source.trim() === "") return {};
  const values: Record<string, MetaBindValue[][]> = {};
  for (const item of splitArguments(source)) {
    const match = /^([A-Za-z]+)\((.*)\)$/.exec(item.trim());
    if (!match) throw new Error("Invalid input argument.");
    const parsed = splitArguments(match[2]).map(parseValue);
    const named = values[match[1]] ?? [];
    named.push(parsed);
    values[match[1]] = named;
  }
  return values;
}

function splitArguments(source: string): string[] {
  const values: string[] = [];
  let quote = false;
  let depth = 0;
  let start = 0;
  for (let index = 0; index <= source.length; index += 1) {
    const char = source[index];
    if (char === "'" && source[index - 1] !== "\\") quote = !quote;
    if (!quote && char === "(") depth += 1;
    if (!quote && char === ")") depth -= 1;
    if ((char === "," && !quote && depth === 0) || index === source.length) {
      values.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (quote || depth !== 0 || values.some((value) => value === ""))
    throw new Error("Invalid input arguments.");
  return values;
}

function splitTopLevel(
  source: string,
  separator: string,
): [string, string] | undefined {
  let quote = false;
  let depth = 0;
  let match = -1;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "'" && source[index - 1] !== "\\") quote = !quote;
    if (!quote && char === "(") depth += 1;
    if (!quote && char === ")") depth -= 1;
    if (!quote && depth === 0 && source.startsWith(separator, index)) {
      if (match >= 0) return undefined;
      match = index;
    }
  }
  if (quote || depth !== 0 || match < 0) return undefined;
  return [source.slice(0, match), source.slice(match + separator.length)];
}

function parseValue(value: string): MetaBindValue {
  if (/^'(?:\\.|[^'])*'$/.test(value))
    return value.slice(1, -1).replaceAll("\\'", "'").replaceAll("\\\\", "\\");
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  const number = Number(value);
  return value !== "" && Number.isFinite(number) ? number : value;
}

function failure(message: string): MetaBindParseResult {
  return { ok: false, message };
}
function collectDependencies(
  expression: MetaBindExpression,
  dependencies: MetaBindTarget[],
) {
  if (expression.kind === "reference") {
    dependencies.push(expression.target);
    return;
  }
  if (expression.kind === "unary")
    collectDependencies(expression.value, dependencies);
  if (expression.kind === "binary") {
    collectDependencies(expression.left, dependencies);
    collectDependencies(expression.right, dependencies);
  }
}

type Token = {
  readonly kind: "number" | "string" | "reference" | "operator" | "eof";
  readonly value: string;
};
class ExpressionParser {
  private index = 0;
  private readonly tokens: readonly Token[];
  constructor(source: string) {
    this.tokens = tokenize(source);
  }
  parse(): MetaBindExpression {
    const expression = this.expression();
    if (this.current.kind !== "eof")
      throw new Error("Invalid VIEW expression.");
    return expression;
  }
  private get current() {
    return this.tokens[this.index] ?? ({ kind: "eof", value: "" } as Token);
  }
  private expression(minimum = 0): MetaBindExpression {
    let left = this.prefix();
    while (precedence(this.current.value) >= minimum) {
      const operator = this.current.value;
      const level = precedence(operator);
      this.index += 1;
      left = {
        kind: "binary",
        operator,
        left,
        right: this.expression(level + 1),
      };
    }
    return left;
  }
  private prefix(): MetaBindExpression {
    const token = this.current;
    this.index += 1;
    if (token.value === "(") {
      const value = this.expression();
      if (this.current.value !== ")") throw new Error("Expected ).");
      this.index += 1;
      return value;
    }
    if (token.value === "!" || token.value === "-")
      return {
        kind: "unary",
        operator: token.value,
        value: this.expression(7),
      };
    if (token.kind === "reference")
      return { kind: "reference", target: parseTarget(token.value) };
    if (token.kind === "number")
      return { kind: "literal", value: Number(token.value) };
    if (token.kind === "string") return { kind: "literal", value: token.value };
    if (
      token.value === "true" ||
      token.value === "false" ||
      token.value === "null"
    )
      return {
        kind: "literal",
        value: token.value === "null" ? null : token.value === "true",
      };
    throw new Error("Expected a VIEW expression.");
  }
}
function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    const reference = /^\{([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\}/.exec(
      rest,
    );
    const string = /^'((?:\\.|[^'])*)'/.exec(rest);
    const number = /^(?:\d+\.?\d*|\.\d+)/.exec(rest);
    const operator = /^(===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%()<>!])/.exec(rest);
    const identifier = /^(true|false|null)\b/.exec(rest);
    const match = reference ?? string ?? number ?? operator ?? identifier;
    if (!match) throw new Error("Invalid VIEW expression.");
    tokens.push({
      kind: reference
        ? "reference"
        : string
          ? "string"
          : number
            ? "number"
            : operator
              ? "operator"
              : "operator",
      value: string
        ? string[1].replaceAll("\\'", "'")
        : reference
          ? reference[1]
          : match[0],
    });
    index += match[0].length;
    if (tokens.length > MAX_TOKENS)
      throw new Error("VIEW expression is too complex.");
  }
  return [...tokens, { kind: "eof", value: "" }];
}
function precedence(operator: string): number {
  return (
    (
      {
        "||": 1,
        "&&": 2,
        "==": 3,
        "===": 3,
        "!=": 3,
        "!==": 3,
        ">": 4,
        ">=": 4,
        "<": 4,
        "<=": 4,
        "+": 5,
        "-": 5,
        "*": 6,
        "/": 6,
        "%": 6,
      } as Record<string, number>
    )[operator] ?? -1
  );
}
