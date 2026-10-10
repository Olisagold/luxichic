/**
 * Picks the database for a maintenance script: local Supabase by default, or the hosted project described by
 * `--env-file <path>` (DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY).
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Target {
  databaseUrl: string;
  supabaseUrl: string;
  secretKey: string;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function readEnvFile(path: string): Record<string, string> {
  const full = resolve(process.cwd(), path);
  if (!existsSync(full)) throw new Error(`Env file not found: ${full}`);
  const out: Record<string, string> = {};
  for (const line of readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

export function resolveTarget(envFile = arg('env-file')): Target {
  if (envFile) {
    const e = readEnvFile(envFile);
    const target = {
      databaseUrl: e.DATABASE_URL ?? '',
      supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL ?? '',
      secretKey: e.SUPABASE_SECRET_KEY ?? '',
    };
    const missing = Object.entries({
      DATABASE_URL: target.databaseUrl,
      NEXT_PUBLIC_SUPABASE_URL: target.supabaseUrl,
      SUPABASE_SECRET_KEY: target.secretKey,
    })
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (missing.length) throw new Error(`${envFile} is missing ${missing.join(', ')}.`);
    return target;
  }
  const out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const local = Object.fromEntries(
    out
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
  if (!local.DB_URL) throw new Error('Local Supabase is not running. Run: pnpm db:start');
  return {
    databaseUrl: local.DB_URL,
    supabaseUrl: local.API_URL,
    secretKey: local.SECRET_KEY ?? local.SERVICE_ROLE_KEY,
  };
}
