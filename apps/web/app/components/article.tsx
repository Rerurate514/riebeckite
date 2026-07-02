import { PostContent } from "@riebeckite/core";

type Props = {
  content: PostContent;
};

export default function Article(props: Props) {
  return (
    <article class="prose">
      <div dangerouslySetInnerHTML={{ __html: props.content.html ?? "" }} />
    </article>
  );
}
