import {
  approveEntries,
  publicationEntriesFromManifest,
  resolvePublishingBuildTime,
} from "@riebeckite/core";
import type { RiebeckiteProject } from "../application_root.js";
import { loadPublicationManifest } from "../publication/manifest.js";
import {
  PublicationStateError,
  readPublicationApprovals,
  writePublicationApprovals,
} from "../publication/state.js";
import type { PublishCommandOptions } from "./publish.js";

export async function runApprove(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  const buildTime =
    options.at === undefined
      ? new Date()
      : resolvePublishingBuildTime(options.at);
  if (options.slugs.length === 0 && !options.all) {
    throw new PublicationStateError(
      "Pass one or more note slugs or --all to approve.",
    );
  }
  const manifest = await loadPublicationManifest(project, buildTime);
  const entries = publicationEntriesFromManifest(manifest).filter(
    (entry) => entry.visibility !== "draft",
  );
  const selected = options.all
    ? entries
    : entries.filter((entry) => options.slugs.includes(entry.slug));
  const missing = options.slugs.filter(
    (slug) => !entries.some((entry) => entry.slug === slug),
  );
  if (missing.length > 0) {
    throw new PublicationStateError(
      `Unknown or unpublished note(s): ${missing.join(", ")}.`,
    );
  }
  if (selected.length === 0) {
    throw new PublicationStateError("No notes matched the approval request.");
  }
  const { approvals } = await readPublicationApprovals(
    project,
    options.approvals,
  );
  const next = approveEntries(approvals, selected, {
    approvedAt: new Date(),
    ...(options.approvedBy === undefined
      ? {}
      : { approvedBy: options.approvedBy }),
  });
  const file = await writePublicationApprovals(
    project,
    next,
    options.approvals,
  );
  if (options.json) {
    console.log(
      JSON.stringify(
        {
          approved: selected.map((entry) => entry.slug),
          file,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Approved ${selected.length} note(s):`);
    for (const entry of selected) console.log(`  ${entry.slug}`);
    console.log(`Approval records: ${file}`);
    console.log(
      "Commit this file if CI should trust the approval; Riebeckite never stores credentials in it.",
    );
  }
  return true;
}

export async function runRevoke(
  project: RiebeckiteProject,
  options: PublishCommandOptions,
): Promise<boolean> {
  if (options.slugs.length === 0 && !options.all) {
    throw new PublicationStateError(
      "Pass one or more note slugs or --all to revoke approval.",
    );
  }
  const { approvals } = await readPublicationApprovals(
    project,
    options.approvals,
  );
  const selected = options.all
    ? Object.keys(approvals.approvals)
    : options.slugs.filter((slug) => approvals.approvals[slug] !== undefined);
  if (selected.length === 0) {
    throw new PublicationStateError("No matching approval records to revoke.");
  }
  const remove = new Set(selected);
  const next = {
    version: approvals.version,
    approvals: Object.fromEntries(
      Object.entries(approvals.approvals).filter(([slug]) => !remove.has(slug)),
    ),
  };
  const file = await writePublicationApprovals(
    project,
    next,
    options.approvals,
  );
  if (options.json) {
    console.log(JSON.stringify({ revoked: selected, file }, null, 2));
  } else {
    console.log(`Revoked ${selected.length} approval(s):`);
    for (const slug of selected) console.log(`  ${slug}`);
    console.log(`Approval records: ${file}`);
  }
  return true;
}
