import fs from "node:fs";

const file = process.env.RIEBECKITE_BENCH_RSS_FILE;
let peak = process.memoryUsage().rss;

const timer = setInterval(() => {
  const rss = process.memoryUsage().rss;
  if (rss > peak) peak = rss;
}, 50);
timer.unref();

process.on("exit", () => {
  if (!file) return;
  try {
    const rss = process.memoryUsage().rss;
    if (rss > peak) peak = rss;
    fs.writeFileSync(file, String(peak));
  } catch {}
});
