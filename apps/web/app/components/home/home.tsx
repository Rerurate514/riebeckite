import type { HomeLocale } from "../../lib/home";
import type { HomeRuntime } from "../../lib/home-runtime";
import EnglishHomePage from "./english-home";
import JapaneseHomePage from "./japanese-home";

export default function HomePage({
  locale,
  runtime,
}: {
  locale: HomeLocale;
  runtime?: HomeRuntime;
}) {
  return locale === "ja" ? (
    <JapaneseHomePage runtime={runtime} />
  ) : (
    <EnglishHomePage runtime={runtime} />
  );
}
