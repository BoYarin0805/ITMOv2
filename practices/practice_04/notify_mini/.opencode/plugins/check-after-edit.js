import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL("../../", import.meta.url))

export const CheckAfterEdit = async () => ({
  "tool.execute.after": async (input, output) => {
    if (!["edit", "write", "apply_patch", "multiedit"].includes(input.tool)) return

    const run = spawnSync("sh", ["scripts/check.sh"], {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 30000,
    })
    const status = run.error || run.status !== 0 ? "FAIL" : "PASS"
    const details = [run.stdout, run.stderr, run.error?.message].filter(Boolean).join("\n").trim()
    output.output = `${output.output ?? ""}\n\n[post-edit check: ${status}]\n${details}`
  },
})
