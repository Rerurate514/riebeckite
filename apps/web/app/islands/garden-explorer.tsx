import type { GardenExplorerData } from "@riebeckite/plugin-garden-explorer";
import GardenExplorer from "@riebeckite/plugin-garden-explorer/components";

export default function GardenExplorerIsland(props: {
  data: GardenExplorerData;
}) {
  return <GardenExplorer data={props.data} />;
}
