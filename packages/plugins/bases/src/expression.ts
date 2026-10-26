import type { BasesExpression } from "./types.js";

type Token = {
  readonly kind:
    | "number"
    | "string"
    | "identifier"
    | "operator"
    | "punctuation"
    | "eof";
  readonly text: string;
};

type ExpressionResult =
  | { readonly ok: true; readonly value: BasesExpression }
  | { readonly ok: false; readonly message: string };

export function parseBasesExpression(source: string): ExpressionResult {
  try {
    const parser = new Parser(tokenize(source));
    const value = parser.expression();
    if (parser.current.kind !== "eof")
      throw new Error(`Unexpected token \`${parser.current.text}\`.`);
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: readonly Token[]) {}
  get current(): Token {
    return this.tokens[this.index] ?? { kind: "eof", text: "" };
  }
  expression(minimum = 0): BasesExpression {
    let left = this.prefix();
    while (true) {
      if (this.current.text === ".") {
        this.next();
        left = {
          kind: "member",
          object: left,
          property: this.expect("identifier").text,
        };
        continue;
      }
      if (this.current.text === "[") {
        this.next();
        const index = this.expression();
        this.expectText("]");
        left = { kind: "index", object: left, index };
        continue;
      }
      if (this.current.text === "(") {
        left = { kind: "call", callee: left, arguments: this.arguments() };
        continue;
      }
      const precedence = precedenceOf(this.current.text);
      if (precedence < minimum) break;
      const operator = this.current.text as Extract<
        BasesExpression,
        { kind: "binary" }
      >["operator"];
      this.next();
      left = {
        kind: "binary",
        operator,
        left,
        right: this.expression(precedence + 1),
      };
    }
    return left;
  }
  private prefix(): BasesExpression {
    if (this.current.text === "!" || this.current.text === "-") {
      const operator = this.current.text as "!" | "-";
      this.next();
      return { kind: "unary", operator, value: this.expression(8) };
    }
    if (this.current.text === "(") {
      this.next();
      const value = this.expression();
      this.expectText(")");
      return value;
    }
    if (this.current.text === "[") {
      this.next();
      const values = this.list("]");
      return { kind: "array", values };
    }
    if (this.current.kind === "number") {
      const value = Number(this.current.text);
      this.next();
      return { kind: "literal", value };
    }
    if (this.current.kind === "string") {
      const value = this.current.text;
      this.next();
      return { kind: "literal", value };
    }
    if (this.current.kind === "identifier") {
      const text = this.current.text;
      this.next();
      if (text === "true" || text === "false" || text === "null")
        return {
          kind: "literal",
          value: text === "null" ? null : text === "true",
        };
      return { kind: "reference", path: [text] };
    }
    throw new Error(
      `Expected an expression, found \`${this.current.text || "end of input"}\`.`,
    );
  }
  private arguments(): readonly BasesExpression[] {
    this.expectText("(");
    return this.list(")");
  }
  private list(end: string): readonly BasesExpression[] {
    const values: BasesExpression[] = [];
    if (this.current.text === end) {
      this.next();
      return values;
    }
    while (true) {
      values.push(this.expression());
      if (this.current.text === end) {
        this.next();
        return values;
      }
      this.expectText(",");
    }
  }
  private expect(kind: Token["kind"]): Token {
    if (this.current.kind !== kind)
      throw new Error(
        `Expected ${kind}, found \`${this.current.text || "end of input"}\`.`,
      );
    const value = this.current;
    this.next();
    return value;
  }
  private expectText(text: string): void {
    if (this.current.text !== text)
      throw new Error(
        `Expected \`${text}\`, found \`${this.current.text || "end of input"}\`.`,
      );
    this.next();
  }
  private next(): void {
    this.index += 1;
  }
}

function precedenceOf(operator: string): number {
  return (
    (
      {
        "||": 1,
        "&&": 2,
        "==": 3,
        "!=": 3,
        ">": 4,
        "<": 4,
        ">=": 4,
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

function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    const string = rest.match(/^(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')/);
    if (string) {
      tokens.push({
        kind: "string",
        text: JSON.parse(
          `"${(string[1] ?? string[2] ?? "").replace(/\\"/g, '\\"')}"`,
        ),
      });
      index += string[0].length;
      continue;
    }
    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) {
      tokens.push({ kind: "number", text: number[0] });
      index += number[0].length;
      continue;
    }
    const identifier = rest.match(/^[A-Za-z_$][\w$]*/);
    if (identifier) {
      tokens.push({ kind: "identifier", text: identifier[0] });
      index += identifier[0].length;
      continue;
    }
    const operator = rest.match(/^(?:&&|\|\||==|!=|>=|<=|[+\-*/%><!])/);
    if (operator) {
      tokens.push({ kind: "operator", text: operator[0] });
      index += operator[0].length;
      continue;
    }
    if ("().,[]".includes(rest[0] ?? "")) {
      tokens.push({ kind: "punctuation", text: rest[0] ?? "" });
      index += 1;
      continue;
    }
    throw new Error(`Unexpected character \`${rest[0]}\`.`);
  }
  return [...tokens, { kind: "eof", text: "" }];
}
