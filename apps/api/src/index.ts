import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { logger } from "./lib/logger.js";
import { buildApp } from "./server.js";

async function main() {
  await connectDB();
  const app = buildApp();
  app.listen(env.API_PORT, () => logger.info(`API listening on :${env.API_PORT}`));
}
main().catch((e) => { logger.error({ e }, "Fatal boot error"); process.exit(1); });
