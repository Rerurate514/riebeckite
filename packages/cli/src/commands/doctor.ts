import type { RiebeckiteProject } from "../application_root.js";
import { runDoctor } from "../doctor/doctor.js";
import { renderDoctorResults } from "../doctor/renderer.js";

export async function runDoctorCommand(
  project: RiebeckiteProject,
  options: { readonly github?: boolean } = {},
): Promise<boolean> {
  const results = await runDoctor(project, options);
  console.log(renderDoctorResults(results));
  return results.every((result) => result.status !== "error");
}
