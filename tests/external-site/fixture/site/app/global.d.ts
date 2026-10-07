// Ambient module declarations for the virtual modules injected by the
// riebeckite Vite plugin. This file must stay a script (no top-level
// import/export) so the declarations are ambient rather than a module
// augmentation. Hono context variables are typed in `hono.d.ts`.
declare module "virtual:riebeckite/client" {
  export function initRiebeckiteClient(): void;
}

declare module "virtual:riebeckite/config" {
  export const config: import("@riebeckite/core").ResolvedRiebeckiteConfig;
}

declare module "virtual:riebeckite/content" {
  export const content: import("@riebeckite/core").ContentManager;
}
