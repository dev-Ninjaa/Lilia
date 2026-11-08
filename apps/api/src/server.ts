import { buildApp } from "@lilia/api/app.ts";
import { env } from "@lilia/api/config/env.ts";

const app = await buildApp();
try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info({ host: env.HOST, port: env.PORT }, "Lilia API listening");
} catch (error) {
  app.log.error({ err: error }, "Failed to start Lilia API");
  await app.close();
  process.exitCode = 1;
}
