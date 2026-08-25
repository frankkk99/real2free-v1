import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");

if (!fs.existsSync(configPath)) {
  console.error("[cost-guard] vercel.json is missing.");
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
if (deploymentEnabled !== false && deploymentEnabled !== true) {
  console.error("[cost-guard] BLOCKED: git.deploymentEnabled must be false or controlled boolean true during rollout.");
  process.exit(1);
}

console.log(deploymentEnabled === true
  ? "[cost-guard] OK: controlled production rollout enabled."
  : "[cost-guard] OK: Vercel Git auto-deploy is disabled.");
