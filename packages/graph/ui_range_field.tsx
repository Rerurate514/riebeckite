export type RangeFieldProps = {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  onInput: (value: number) => void;
};

export function RangeField(props: RangeFieldProps) {
  return (
    <label class="rr-graph__range">
      <span>
        {props.label}
        <output>{formatValue(props.value, props.range.step)}</output>
      </span>
      <input
        type="range"
        min={props.range.min}
        max={props.range.max}
        step={props.range.step}
        value={props.value}
        onInput={(event) =>
          props.onInput(Number((event.currentTarget as HTMLInputElement).value))
        }
      />
    </label>
  );
}

function formatValue(value: number, step: number): string {
  return step >= 1 ? String(Math.round(value)) : value.toFixed(2);
}
