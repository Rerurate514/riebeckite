import type { RiebeckiteProject } from "../application_root";
import { runDoctor } from "../doctor/doctor";
import { renderDoctorResults } from "../doctor/renderer";

export async function runDoctorCommand(
  project: RiebeckiteProject,
): Promise<boolean> {
  const results = await runDoctor(project);
  console.log(renderDoctorResults(results));
  return results.every((result) => result.status !== "error");
}
