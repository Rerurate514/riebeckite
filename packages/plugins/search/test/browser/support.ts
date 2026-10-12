import puppeteer, { type Browser } from "puppeteer";

export async function launchBrowser(): Promise<Browser | null> {
  const attempts: Array<Parameters<typeof puppeteer.launch>[0]> = [
    {
      headless: "shell",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
    {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  ];
  for (const options of attempts) {
    try {
      return await puppeteer.launch(options);
    } catch {}
  }
  if (process.env.RIEBECKITE_REQUIRE_BROWSER === "1") {
    throw new Error(
      "Puppeteer could not launch a browser. CI browser tests require an installed Chrome-for-Testing binary.",
    );
  }
  return null;
}
