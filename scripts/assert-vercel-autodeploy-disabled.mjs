import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");
const rolloutMarkerPath = path.join(process.cwd(), "CONTROLLED_ROLLOUT.md");

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
const controlledRollout = deploymentEnabled === true
  && process.env.VERCEL_GIT_COMMIT_REF === "main"
  && fs.existsSync(rolloutMarkerPath);

if (deploymentEnabled !== false && !controlledRollout) {
  console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false except during an explicit main-branch controlled rollout.");
  process.exit(1);
}

if (controlledRollout) {
  console.log("[cost-guard] OK: one controlled main production rollout is authorized by CONTROLLED_ROLLOUT.md.");
} else {
  console.log("[cost-guard] OK: Vercel Git auto-deploy is disabled.");
}
