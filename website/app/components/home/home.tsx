import type { HomeLocale } from "../../lib/home";
import type { HomeRuntime } from "../../lib/home-runtime";
import { content } from "./home_content.js";
import { HomeConfigSection } from "./home_sections_config.js";
import { HomeContinueSection } from "./home_sections_continue.js";
import { HomeIntroSection } from "./home_sections_intro.js";
import { HomeProjectSection } from "./home_sections_project.js";

export default function HomePage({
  locale,
  runtime,
}: {
  locale: HomeLocale;
  runtime?: HomeRuntime;
}) {
  const t = content[locale];
  const href = (path: string) => `${t.prefix}${path}`;

  return (
    <div class="rb-home">
      <HomeIntroSection t={t} href={href} runtime={runtime} />
      <HomeConfigSection locale={locale} t={t} href={href} runtime={runtime} />
      <HomeProjectSection locale={locale} t={t} href={href} />
      <HomeContinueSection locale={locale} t={t} href={href} />
    </div>
  );
}
