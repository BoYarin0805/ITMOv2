const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const temporary = path.join(root, ".runtime/tmp");
fs.mkdirSync(temporary, { recursive: true });
process.env.TMPDIR = temporary;
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(root, ".tooling/browsers");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 350 } });
    await page.setContent('<html lang="ru"><body style="background:#f4f5f1;padding:30px"><div id="diagram"></div></body></html>');
    await page.addScriptTag({ path: path.join(root, ".tooling/mermaid.min.js") });
    const markdown = fs.readFileSync(path.join(root, "evidence/openspec-customization/after.md"), "utf8");
    const source = markdown.match(/```mermaid\n([\s\S]*?)```/)[1];
    const svg = await page.evaluate(async (source) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      const { svg } = await mermaid.render("weather-diagram", source);
      document.getElementById("diagram").innerHTML = svg;
      return svg;
    }, source);
    fs.writeFileSync(path.join(root, "evidence/openspec-customization/diagram.svg"), svg);
    await page.locator("#diagram").screenshot({ path: path.join(root, "evidence/openspec-customization/diagram.png") });
    console.log("Mermaid rendered: SVG + PNG");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
