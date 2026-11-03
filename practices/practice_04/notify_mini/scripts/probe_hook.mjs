// Изолированная проверка обработчика OpenCode: edit -> PASS/FAIL в ответ инструмента.
import assert from "node:assert/strict"
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const source = join(dirname(fileURLToPath(import.meta.url)), "..")
const temp = mkdtempSync(join(tmpdir(), "notify-hook-"))

try {
  cpSync(join(source, "service.py"), join(temp, "service.py"))
  cpSync(join(source, "tests"), join(temp, "tests"), { recursive: true })
  mkdirSync(join(temp, "scripts"))
  cpSync(join(source, "scripts/check.sh"), join(temp, "scripts/check.sh"))
  mkdirSync(join(temp, ".opencode/plugins"), { recursive: true })
  cpSync(join(source, ".opencode/plugins/check-after-edit.js"), join(temp, ".opencode/plugins/check-after-edit.js"))

  const { CheckAfterEdit } = await import(pathToFileURL(join(temp, ".opencode/plugins/check-after-edit.js")).href)
  const hook = await CheckAfterEdit()
  const afterEdit = async () => {
    const output = { output: "file edited" }
    await hook["tool.execute.after"]({ tool: "edit" }, output)
    return output.output
  }

  const pass = await afterEdit()
  assert.match(pass, /post-edit check: PASS/)

  writeFileSync(join(temp, "tests/test_intentional_failure.py"), "import unittest\nclass IntentionalFailure(unittest.TestCase):\n    def test_failure(self):\n        self.assertEqual(1, 2)\n")
  const fail = await afterEdit()
  assert.match(fail, /post-edit check: FAIL/)
  assert.match(fail, /FAILED/)
  console.log(JSON.stringify({ pass: pass.split("\n").filter((line) => line.includes("post-edit check") || line.startsWith("Ran ") || line === "OK"), fail: fail.split("\n").filter((line) => line.includes("post-edit check") || line.startsWith("Ran ") || line.startsWith("FAILED")) }, null, 2))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
