export type PluginDataHelper<Input, Model> = (
  input: Readonly<Input>,
) => Model | Promise<Model>;

export type PluginComponent<Props> = (props: Readonly<Props>) => unknown;
