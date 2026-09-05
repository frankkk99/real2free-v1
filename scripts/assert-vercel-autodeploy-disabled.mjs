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

const oneOffAllowed = config?.git?.deploymentEnabled === true && fs.existsSync(markerPath);
if (config?.git?.deploymentEnabled !== false && !oneOffAllowed) {
  console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false unless a supervised one-off marker exists.");
  process.exit(1);
}

console.log(oneOffAllowed
  ? "[cost-guard] OK: supervised one-off deployment marker accepted."
  : "[cost-guard] OK: Vercel Git auto-deploy is disabled.");
