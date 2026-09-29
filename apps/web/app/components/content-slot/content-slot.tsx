type Props = {
  html?: string;
};

/** Renders an opted-in Plugin fragment at a Site-owned layout position. */
export default function ContentSlot({ html }: Props) {
  if (!html) return null;
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
