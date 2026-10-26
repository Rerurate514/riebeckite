export type MetaBindValue = string | number | boolean | null;
export type MetaBindTarget = { readonly path: readonly string[] };
type MetaBindInputKind = "text" | "number" | "slider" | "toggle" | "select";
type MetaBindOption = {
  readonly value: MetaBindValue;
  readonly label: string;
};
export type MetaBindInput = {
  readonly kind: "input";
  readonly input: MetaBindInputKind;
  readonly target: MetaBindTarget;
  readonly arguments: Readonly<Record<string, readonly MetaBindValue[]>>;
  readonly options: readonly MetaBindOption[];
};
export type MetaBindExpression =
  | { readonly kind: "literal"; readonly value: MetaBindValue }
  | { readonly kind: "reference"; readonly target: MetaBindTarget }
  | {
      readonly kind: "unary";
      readonly operator: "!" | "-";
      readonly value: MetaBindExpression;
    }
  | {
      readonly kind: "binary";
      readonly operator: string;
      readonly left: MetaBindExpression;
      readonly right: MetaBindExpression;
    };
type MetaBindView = {
  readonly kind: "view";
  readonly source: string;
  readonly expression: MetaBindExpression;
  readonly dependencies: readonly MetaBindTarget[];
};
export type MetaBindModel = MetaBindInput | MetaBindView;
export type MetaBindParseResult =
  | { readonly ok: true; readonly value: MetaBindModel }
  | { readonly ok: false; readonly message: string };
