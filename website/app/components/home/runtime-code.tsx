export default function RuntimeCode({ html }: { html: string }) {
  return (
    <div
      class="rb-home__runtime-code"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
