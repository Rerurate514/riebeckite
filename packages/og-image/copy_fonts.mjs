import { cp, mkdir } from "node:fs/promises";

await mkdir("dist/fonts", { recursive: true });
await cp("fonts", "dist/fonts", { recursive: true });
