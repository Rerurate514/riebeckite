import type { GraphMode } from "./index.js";
import type { GraphContextMenu } from "./ui_types.js";

type GraphContextMenuViewProps = {
  menu: GraphContextMenu;
  mode: GraphMode;
  onOpen: () => void;
  onCopyLink: () => void;
  onFocusLocal: () => void;
  onFilter: () => void;
};

export function GraphContextMenuView(props: GraphContextMenuViewProps) {
  const node = props.menu.node;
  return (
    <div
      class="rr-graph__menu"
      role="menu"
      style={`left:${props.menu.x}px;top:${props.menu.y}px`}
    >
      <p class="rr-graph__menu-title">{node.title}</p>
      {node.permalink ? (
        <button type="button" role="menuitem" onClick={props.onOpen}>
          Open note
        </button>
      ) : null}
      {node.permalink ? (
        <button
          type="button"
          role="menuitem"
          onClick={() =>
            window.open(node.permalink ?? "", "_blank", "noopener")
          }
        >
          Open in new tab
        </button>
      ) : null}
      {node.permalink ? (
        <button type="button" role="menuitem" onClick={props.onCopyLink}>
          Copy link
        </button>
      ) : null}
      {node.slug ? (
        <button type="button" role="menuitem" onClick={props.onFocusLocal}>
          {props.mode === "global" ? "Show local graph" : "Open in Explorer"}
        </button>
      ) : null}
      <button type="button" role="menuitem" onClick={props.onFilter}>
        Filter to this node
      </button>
    </div>
  );
}
