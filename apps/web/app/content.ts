import { ContentManager } from "@riebeckite/core";
import { config } from "./config";
import { CONTENT_DIR } from "./constants/paths";

export const content = new ContentManager(CONTENT_DIR, config.content.exclude);
