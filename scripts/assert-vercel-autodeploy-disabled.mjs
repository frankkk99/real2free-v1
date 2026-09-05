import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");
const markerPath = path.join(process.cwd(), ".vercel-one-off-deploy");

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

if (config?.git?.deploymentEnabled === false) {
  console.log("[cost-guard] OK: Vercel Git auto-deploy is disabled.");
  process.exit(0);
}

if (config?.git?.deploymentEnabled === true && fs.existsSync(markerPath)) {
  console.log("[cost-guard] ONE-OFF: guarded APIPlayer key redeploy marker is present.");
  process.exit(0);
}

console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false except for an explicit guarded one-off deploy.");
process.exit(1);
