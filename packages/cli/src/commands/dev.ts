import {
  resolveHonoxApplicationRoot,
  startHonoxDevServer,
} from "@riebeckite/honox";
import type { RiebeckiteApplication } from "../application_root";
import { loadApplicationConfig } from "../load_config";

export async function runDev(application: RiebeckiteApplication): Promise<void> {
  await loadApplicationConfig(application);
  const hostRoot = await resolveHonoxApplicationRoot(application.applicationRoot);
  await startHonoxDevServer({ root: hostRoot });
}
