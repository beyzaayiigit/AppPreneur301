const defaultPort = 3001;

function parsePort(value: string | undefined): number {
  if (!value) return defaultPort;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultPort;
}

export const env = {
  host: process.env.HOST ?? "0.0.0.0",
  port: parsePort(process.env.PORT)
};
