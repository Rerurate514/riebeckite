import type { GraphGroup } from "./index.js";

type GraphGroupsFieldProps = {
  groups: GraphGroup[];
  addGroup: () => void;
  updateGroup: (id: string, next: Partial<GraphGroup>) => void;
  moveGroup: (id: string, direction: -1 | 1) => void;
  removeGroup: (id: string) => void;
};

export function GraphGroupsField(props: GraphGroupsFieldProps) {
  return (
    <>
      {props.groups.length === 0 ? (
        <p class="rr-graph__help">
          Groups color nodes that match a query. The first match wins.
        </p>
      ) : null}
      {props.groups.map((group, index) => (
        <div class="rr-graph__group" key={group.id}>
          <input
            type="color"
            value={group.color}
            aria-label={`Group ${index + 1} color`}
            onInput={(event) =>
              props.updateGroup(group.id, {
                color: (event.currentTarget as HTMLInputElement).value,
              })
            }
          />
          <input
            type="text"
            value={group.query}
            placeholder="tag:#topic"
            aria-label={`Group ${index + 1} query`}
            onInput={(event) =>
              props.updateGroup(group.id, {
                query: (event.currentTarget as HTMLInputElement).value,
              })
            }
          />
          <button
            type="button"
            aria-label={`Move group ${index + 1} up`}
            onClick={() => props.moveGroup(group.id, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={`Move group ${index + 1} down`}
            onClick={() => props.moveGroup(group.id, 1)}
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={`Delete group ${index + 1}`}
            onClick={() => props.removeGroup(group.id)}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={props.addGroup}>
        New group
      </button>
    </>
  );
}
