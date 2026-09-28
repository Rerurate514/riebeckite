// Ambient module declaration for the virtual module injected by the
// riebeckite Vite plugin. Hono's `Env` is a type alias, so it cannot be
// augmented with `interface Env` from an external site; this fixture does
// not need custom bindings, so it declares only the virtual module.
declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}
