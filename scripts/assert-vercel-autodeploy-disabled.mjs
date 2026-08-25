import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");
const recoveryMarkerPath = path.join(process.cwd(), "NATIVE_RECOVERY_ROLLOUT.md");

if (!fs.existsSync(configPath)) {
  console.error("[cost-guard] vercel.json is missing. Keep Vercel Git auto-deploy disabled and deploy manually when ready.");
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (error) {
  console.error("[cost-guard] vercel.json is invalid JSON.", error);
  process.exit(1);
}

const deploymentEnabled = config?.git?.deploymentEnabled;
const nativeRecovery = deploymentEnabled === true
  && process.env.VERCEL_GIT_COMMIT_REF === "main"
  && fs.existsSync(recoveryMarkerPath);

if (deploymentEnabled !== false && !nativeRecovery) {
  console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false except for the explicit native recovery rollout.");
  process.exit(1);
}

console.log(nativeRecovery
  ? "[cost-guard] OK: one native recovery rollout is authorized."
  : "[cost-guard] OK: Vercel Git auto-deploy is disabled.");
