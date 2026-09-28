import type { RiebeckiteApplication } from "../application_root";
import { runDoctor } from "../doctor/doctor";
import { renderDoctorResults } from "../doctor/renderer";

export async function runDoctorCommand(
  application: RiebeckiteApplication,
): Promise<boolean> {
  const results = await runDoctor(application);
  console.log(renderDoctorResults(results));
  return results.every((result) => result.status !== "error");
}
