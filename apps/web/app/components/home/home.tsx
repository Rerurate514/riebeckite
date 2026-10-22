import type { HomeLocale } from "../../lib/home";
import EnglishHomePage from "./english-home";
import JapaneseHomePage from "./japanese-home";

export default function HomePage({ locale }: { locale: HomeLocale }) {
  return locale === "ja" ? <JapaneseHomePage /> : <EnglishHomePage />;
}
