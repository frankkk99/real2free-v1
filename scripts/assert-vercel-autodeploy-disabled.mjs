import fs from "node:fs";
import path from "node:path";

const configPath = path.join(process.cwd(), "vercel.json");
const oneOffMarkerPath = path.join(process.cwd(), ".vercel-one-off-deploy");

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

if (config?.git?.deploymentEnabled !== false) {
  if (!fs.existsSync(oneOffMarkerPath)) {
    console.error("[cost-guard] BLOCKED: git.deploymentEnabled must stay false. Deploy production manually when ready.");
    process.exit(1);
  }
  console.log("[cost-guard] ONE-OFF: guarded production deployment marker is present.");
} else {
  console.log("[cost-guard] OK: Vercel Git auto-deploy is disabled.");
}
