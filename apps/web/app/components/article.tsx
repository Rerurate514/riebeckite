import { PostContent } from "@riebeckite/core";

type Props = {
  content: PostContent;
};

export default function Article(props: Props) {
  return (
    <article class="prose">
      <div
        class="max-w-4xl mx-auto px-4"
        dangerouslySetInnerHTML={{ __html: props.content.html ?? "" }}
      />
    </article>
  );
}
