import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminApp } from "./admin-app.ts";
import { createServices } from "./app.ts";
import { Db } from "./db.ts";
import { createPartnerApp } from "./partner-app.ts";

/**
 * ByggFlyt control plane: two isolated HTTP servers sharing one SQLite database.
 *   - Business portal (PARTNER_PORT, default 4323): businesses register, log in and manage their dashboard.
 *   - Admin console  (ADMIN_PORT,   default 4322): owner moderates everything; bound to 127.0.0.1 by default.
 * The public site stays a static Astro build; admin "Publiser" writes src/data/cms-overrides.json.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

const env = process.env;
const dbFile = path.resolve(projectRoot, env.PLATFORM_DB_PATH ?? "data/platform.db");
const partnerPort = Number(env.PARTNER_PORT ?? 4323);
const adminPort = Number(env.ADMIN_PORT ?? 4322);
const partnerHost = env.PARTNER_HOST ?? "127.0.0.1";
const adminHost = env.ADMIN_HOST ?? "127.0.0.1";
const secureCookies = env.PLATFORM_SECURE_COOKIES === "1";

const db = new Db(dbFile);
const services = createServices(db, path.join(projectRoot, "src/data/cms-overrides.json"), secureCookies);

const adminUser = env.ADMIN_USERNAME ?? "admin";
const generatedCode = services.admins.bootstrap(adminUser, env.ADMIN_ACCESS_CODE);
if (generatedCode) {
  console.log("\n================ FIRST RUN ================");
  console.log(` Admin user:        ${adminUser}`);
  console.log(` One-time access:   ${generatedCode}`);
  console.log(" Change it under Innstillinger after login.");
  console.log("===========================================\n");
}

services.sessions.purgeExpired();
setInterval(() => services.sessions.purgeExpired(), 60 * 60 * 1000).unref();

createServer(createPartnerApp(services)).listen(partnerPort, partnerHost, () => {
  console.log(`[platform] Business portal  http://${partnerHost}:${partnerPort}`);
});
createServer(createAdminApp(services, env.PLATFORM_INGEST_TOKEN)).listen(adminPort, adminHost, () => {
  console.log(`[platform] Admin console    http://${adminHost}:${adminPort}`);
});
console.log(`[platform] Database         ${dbFile}`);
