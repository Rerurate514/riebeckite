export type ExpressionResult =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly reason: string };

const MAX_EXPRESSION_LENGTH = 200;

export function evaluateExpression(source: string): ExpressionResult {
  const input = source.trim();
  if (!input) {
    return { ok: false, reason: "The expression is empty." };
  }
  if (input.length > MAX_EXPRESSION_LENGTH) {
    return {
      ok: false,
      reason: `The expression exceeds ${MAX_EXPRESSION_LENGTH} characters.`,
    };
  }

  try {
    const value = new ExpressionParser(input).parse();
    if (!Number.isFinite(value)) {
      return { ok: false, reason: "The result is not a finite number." };
    }
    return { ok: true, value };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Invalid expression.",
    };
  }
}

export function formatExpressionValue(value: number): string {
  return String(Number(value.toPrecision(12)));
}

class ExpressionParser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): number {
    const value = this.expression();
    this.skipWhitespace();
    if (this.index < this.source.length) {
      throw new Error(`Unexpected "${this.source[this.index]}".`);
    }
    return value;
  }

  private expression(): number {
    let value = this.term();
    for (;;) {
      this.skipWhitespace();
      const operator = this.source[this.index];
      if (operator !== "+" && operator !== "-") return value;
      this.index += 1;
      const right = this.term();
      value = operator === "+" ? value + right : value - right;
    }
  }

  private term(): number {
    let value = this.factor();
    for (;;) {
      this.skipWhitespace();
      const operator = this.source[this.index];
      if (operator !== "*" && operator !== "/") return value;
      this.index += 1;
      const right = this.factor();
      if (operator === "/" && right === 0) {
        throw new Error("Division by zero.");
      }
      value = operator === "*" ? value * right : value / right;
    }
  }

  private factor(): number {
    this.skipWhitespace();
    const character = this.source[this.index];
    if (character === "+" || character === "-") {
      this.index += 1;
      const value = this.factor();
      return character === "-" ? -value : value;
    }
    if (character === "(") {
      this.index += 1;
      const value = this.expression();
      this.skipWhitespace();
      if (this.source[this.index] !== ")") {
        throw new Error("Missing a closing parenthesis.");
      }
      this.index += 1;
      return value;
    }
    return this.number();
  }

  private number(): number {
    this.skipWhitespace();
    const start = this.index;
    while (isDigit(this.source[this.index])) this.index += 1;
    let hasDigits = this.index > start;
    if (this.source[this.index] === ".") {
      this.index += 1;
      const decimalStart = this.index;
      while (isDigit(this.source[this.index])) this.index += 1;
      if (this.index === decimalStart && !hasDigits) {
        throw new Error("Expected a number.");
      }
      hasDigits = true;
    }
    if (!hasDigits) throw new Error("Expected a number.");
    return Number(this.source.slice(start, this.index));
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.source[this.index] ?? "")) this.index += 1;
  }
}

function isDigit(character: string | undefined): boolean {
  return character !== undefined && character >= "0" && character <= "9";
}
