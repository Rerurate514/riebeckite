import { AbsoluteFill, Composition, Sequence, Still } from "remotion";
import { SceneClosing, SceneDemo, SceneNotes, SceneWebsite } from "./scenes";
import { Thumbnail } from "./Thumbnail";

const Promo = () => (
  <AbsoluteFill style={{ backgroundColor: "#0c0f14" }}>
    <Sequence from={0} durationInFrames={102}>
      <SceneNotes />
    </Sequence>
    <Sequence from={96} durationInFrames={150}>
      <SceneWebsite />
    </Sequence>
    <Sequence from={246} durationInFrames={456}>
      <SceneDemo />
    </Sequence>
    <Sequence from={696} durationInFrames={144}>
      <SceneClosing />
    </Sequence>
  </AbsoluteFill>
);

export const RemotionRoot = () => (
  <>
    <Composition
      id="RiebeckitePromo"
      component={Promo}
      durationInFrames={840}
      fps={30}
      width={1920}
      height={1080}
    />
    <Still
      id="RiebeckiteThumbnail"
      component={Thumbnail}
      width={1920}
      height={1080}
    />
  </>
);
