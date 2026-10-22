export default function CodeWindow({
  children,
  label,
}: {
  children: string;
  label: string;
}) {
  return (
    <div class="rb-home__code-window">
      <pre data-rb-ux-copy="true">
        <code>{children}</code>
      </pre>
      <button type="button" data-home-copy aria-label={label}>
        {label}
      </button>
    </div>
  );
}
