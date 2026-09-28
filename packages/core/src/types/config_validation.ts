export type ConfigValidationIssue = {
  readonly path: string;
  readonly message: string;
};

export type PluginOptionsValidator<TOptions = unknown> = (
  options: TOptions | undefined,
) => readonly ConfigValidationIssue[] | undefined;
