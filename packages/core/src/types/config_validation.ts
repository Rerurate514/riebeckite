export type ConfigValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type PluginOptionsValidator<TOptions = unknown> = {
  validate(
    options: TOptions | undefined,
  ): readonly ConfigValidationIssue[] | undefined;
}["validate"];
