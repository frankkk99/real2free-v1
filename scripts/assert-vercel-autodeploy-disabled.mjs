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

const ref = process.env.VERCEL_GIT_COMMIT_REF || "";
const env = process.env.VERCEL_ENV || "";
const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE || "";
const explicitDeploy = /\[(?:vercel deploy|deploy vercel)\]/i.test(commitMessage);
const supervisedProductionDeploy = env === "production" && ref === "main" && explicitDeploy;

if (config?.git?.deploymentEnabled !== false && !supervisedProductionDeploy) {
  console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false except for an explicit supervised production deploy on main.");
  process.exit(1);
}

if (supervisedProductionDeploy) {
  console.log("[cost-guard] OK: explicit supervised production deploy is allowed for this commit only.");
} else {
  console.log("[cost-guard] OK: Vercel Git auto-deploy is disabled.");
}
