// Rendu du film : capture la scène image par image avec Chromium, puis encode avec ffmpeg.
//
//   node motion/render.mjs --cues             repères sonores et de montage → motion/build/cues.json
//   node motion/render.mjs [--resume]         images → motion/build/frames (et cues.json)
//   node motion/render.mjs --stills 4,12.5    quelques images fixes → motion/build/stills (contrôle de mise en page)
//   node motion/render.mjs --encode           assemble images + motion/build/mix.wav → motion/out/tribune-supporters.mp4
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cpus } from "node:os";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const ROOT = dirname(fileURLToPath(import.meta.url));
const BUILD = join(ROOT, "build");
const OUT = join(ROOT, "out");
const FPS = 30;
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1] ?? true;
};

async function openScene(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("Erreur dans la scène :", e.message));
  await page.goto(pathToFileURL(join(ROOT, "scene", "index.html")).href);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 30000 });
  return page;
}

async function writeCues(page) {
  const cues = await page.evaluate(() => ({ marks: window.MARKS, sfx: window.SFX }));
  writeFileSync(join(BUILD, "cues.json"), JSON.stringify(cues, null, 1));
}

async function stills(times) {
  const browser = await chromium.launch();
  const page = await openScene(browser);
  const dir = join(BUILD, "stills");
  mkdirSync(dir, { recursive: true });
  for (const t of times) {
    await page.evaluate((t) => window.seek(t), t);
    const file = join(dir, `t${t.toFixed(2).padStart(6, "0")}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
}

async function frames() {
  const browser = await chromium.launch();
  const probe = await openScene(browser);
  const duration = await probe.evaluate(() => window.DURATION);
  await writeCues(probe);
  await probe.close();

  await browser.close();

  const total = Math.ceil(duration * FPS);
  const dir = join(BUILD, "frames");
  // --resume garde les images déjà rendues (si la scène n'a pas changé depuis).
  if (!args.includes("--resume")) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const workers = Number(opt("--workers") ?? Math.max(1, cpus().length));
  const chunk = Math.ceil(total / workers);
  let done = 0;
  const started = Date.now();
  await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      // Un navigateur par worker : les pages d'un même navigateur partagent un seul processus de rendu.
      const own = await chromium.launch();
      const page = await openScene(own);
      for (let f = w * chunk; f < Math.min(total, (w + 1) * chunk); f++) {
        const file = join(dir, `${String(f).padStart(5, "0")}.png`);
        if (existsSync(file)) {
          done++;
          continue;
        }
        await page.evaluate((t) => window.seek(t), f / FPS);
        await page.screenshot({ path: file });
        if (++done % 150 === 0) {
          const rate = done / ((Date.now() - started) / 1000);
          console.log(`${done}/${total} images · ${rate.toFixed(1)} img/s · reste ~${Math.round((total - done) / rate)} s`);
        }
      }
      await own.close();
    }),
  );
  console.log(`${total} images en ${Math.round((Date.now() - started) / 1000)} s`);
}

function encode() {
  const mix = join(BUILD, "mix.wav");
  if (!existsSync(mix)) throw new Error("motion/build/mix.wav manquant : lancez d'abord python3 motion/audio.py");
  mkdirSync(OUT, { recursive: true });
  const mp4 = join(OUT, "tribune-supporters.mp4");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", join(BUILD, "frames", "%05d.png"),
    "-i", mix,
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-tune", "film", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "224k", "-shortest", "-movflags", "+faststart",
    mp4,
  ], { stdio: "inherit" });
  console.log(mp4);
}

if (opt("--stills")) await stills(String(opt("--stills")).split(",").map(Number));
else if (args.includes("--cues")) {
  const browser = await chromium.launch();
  await writeCues(await openScene(browser));
  await browser.close();
}
else if (args.includes("--encode")) encode();
else await frames();
