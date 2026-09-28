import type { RiebeckiteProject } from "./application_root.js";

export async function loadProjectConfig(project: RiebeckiteProject) {
  return project.config;
}
