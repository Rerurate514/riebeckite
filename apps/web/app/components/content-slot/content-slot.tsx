type Props = {
  html?: string;
  class?: string;
};

/** Renders an opted-in Plugin fragment at a Site-owned layout position. */
export default function ContentSlot({ html, class: className }: Props) {
  if (!html) return null;
  return <div class={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
