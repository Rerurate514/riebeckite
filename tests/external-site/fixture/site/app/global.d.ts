// Ambient module declaration for the virtual module injected by the
// riebeckite Vite plugin. This file must stay a script (no top-level
// import/export) so the declaration is ambient rather than a module
// augmentation. Hono context variables are typed in `hono.d.ts`.
declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}
