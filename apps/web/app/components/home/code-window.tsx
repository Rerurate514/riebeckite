export default function CodeWindow({
  children,
  label,
  copiedLabel,
}: {
  children: string;
  label: string;
  copiedLabel: string;
}) {
  return (
    <div class="rb-home__code-window">
      <pre data-rb-ux-copy="true">
        <code>{children}</code>
      </pre>
      <button
        type="button"
        data-home-copy
        data-home-copy-label={copiedLabel}
        aria-label={label}
      >
        {label}
      </button>
    </div>
  );
}
