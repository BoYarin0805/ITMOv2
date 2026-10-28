const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "../../../..");
const { weatherState } = require(path.join(root, "static/weather-state.js"));
const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "../references/cases.json"), "utf8"));
const checks = cases.map(({ code, day, ...expected }) => {
  const actual = weatherState(code, day);
  return { input: { code, day }, expected, actual,
    status: Object.entries(expected).every(([key, value]) => actual[key] === value) ? "PASS" : "FAIL" };
});
const interaction = spawnSync(process.execPath, ["--test", "tests/test_interface.cjs"], { cwd: root, encoding: "utf8", timeout: 15000 });
const report = { time: new Date().toISOString(), skill: "weather-state-check", checks,
  interactions: { status: interaction.status === 0 ? "PASS" : "FAIL", output: (interaction.stdout || "") + (interaction.stderr || "") },
  status: checks.every((check) => check.status === "PASS") && interaction.status === 0 ? "PASS" : "FAIL" };
fs.mkdirSync(path.join(root, ".runtime"), { recursive: true });
const target = path.join(root, ".runtime/skill.json");
const temporary = `${target}.${process.pid}.tmp`;
fs.writeFileSync(temporary, JSON.stringify(report, null, 2));
fs.renameSync(temporary, target);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.status === "PASS" ? 0 : 1;
