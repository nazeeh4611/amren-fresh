import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] AMREN Fresh API listening on port ${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[server] failed to start", err);
  process.exit(1);
});
