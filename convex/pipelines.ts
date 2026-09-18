// Shared helpers for the two cron pipelines (docs/pipeline.md).

/** Crons only do work on deployments where PIPELINES_ENABLED=true is set. */
export function pipelinesEnabled(): boolean {
  return process.env.PIPELINES_ENABLED === "true";
}

/** Read a numeric cap from the deployment env, with a small default for dev. */
export function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
