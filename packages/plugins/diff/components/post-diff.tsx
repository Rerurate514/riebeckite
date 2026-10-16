import type { PluginComponent } from "@riebeckite/core";
import type { PostDiff as PostDiffData } from "../src/types.js";

export type PostDiffProps = {
  readonly diff: PostDiffData | null;
  readonly title?: string;
};

const PostDiff = (({ diff, title = "History" }: Readonly<PostDiffProps>) => {
  if (!diff) return null;
  return (
    <section class="rr-diff-history" data-rr-diff-history>
      <h2 class="rr-diff-history__title">{title}</h2>
      <p class="rr-diff-history__meta">
        {diff.from ? `${diff.from.shortHash} → ` : ""}
        {diff.to.shortHash}
      </p>
      <pre class="rr-diff-history__diff">
        <code>
          {diff.lines.map((line, index) => (
            <span
              class={`rr-diff-line rr-diff-line--${line.type}`}
              key={`${line.oldLineNumber}-${line.newLineNumber}-${index}`}
            >
              {line.type === "added"
                ? "+"
                : line.type === "removed"
                  ? "-"
                  : " "}
              {line.content}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}) satisfies PluginComponent<PostDiffProps>;

export default PostDiff;
