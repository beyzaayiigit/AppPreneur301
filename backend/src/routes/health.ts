import { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      service: "lumeris-backend",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  });
}
