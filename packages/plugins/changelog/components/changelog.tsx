import type { PluginComponent } from "@riebeckite/core";
import type { NoteChangeHistory } from "../src/types.js";

export type ChangelogProps = {
  history: NoteChangeHistory | null;
  className?: string;
};
const Changelog = (({
  history,
  className = "rb-changelog",
}: Readonly<ChangelogProps>) => {
  if (!history || history.commits.length === 0) return null;
  return (
    <section class={className} data-changelog-note>
      <h2>Change history</h2>
      <ol>
        {history.commits.map((record) => (
          <li key={record.hash}>
            <time datetime={record.dateIso}>{record.date}</time>{" "}
            {record.subject}
          </li>
        ))}
      </ol>
    </section>
  );
}) satisfies PluginComponent<ChangelogProps>;
export default Changelog;
