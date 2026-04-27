import Fastify from "fastify";
import { env } from "./config/env.js";
import { registerHealthRoute } from "./routes/health.js";

async function buildServer() {
  const app = Fastify({ logger: true });
  await registerHealthRoute(app);
  return app;
}

async function main() {
  const app = await buildServer();

  try {
    await app.listen({ host: env.host, port: env.port });
    app.log.info(`Backend is running at http://${env.host}:${env.port}`);
  } catch (error) {
    app.log.error(error, "Failed to start backend");
    process.exit(1);
  }
}

void main();
