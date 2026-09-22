import path from "node:path";
import { config } from "../config";

export const CONTENT_DIR = path.resolve(
  process.cwd(),
  config.content.directory,
);
export const ASSETS_ROOT = "public/";
