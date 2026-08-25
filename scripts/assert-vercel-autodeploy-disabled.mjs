import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");

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
const strictOff = deploymentEnabled === false;
const controlledMainOnly = deploymentEnabled
  && typeof deploymentEnabled === "object"
  && deploymentEnabled["*"] === false
  && deploymentEnabled.main === true
  && Object.keys(deploymentEnabled).every((key) => key === "*" || key === "main");

if (!strictOff && !controlledMainOnly) {
  console.error("[cost-guard] BLOCKED: Git deploy must be fully disabled or explicitly limited to a controlled main-only rollout.");
  process.exit(1);
}

console.log(controlledMainOnly
  ? "[cost-guard] OK: controlled main-only production rollout."
  : "[cost-guard] OK: Vercel Git auto-deploy is disabled.");
