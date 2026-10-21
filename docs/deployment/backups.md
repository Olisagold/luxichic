# Database backups

The free Supabase plan has no backups you can download, so `.github/workflows/backup.yml` makes one every Monday
at 03:00 (Lagos) and keeps each for 90 days under the repository's **Actions → Database backup** runs. It can
also be run by hand there ("Run workflow").

Each backup is one encrypted file, `luxichic-prod-YYYY-MM-DD.tar.gz.enc`, holding:

- `roles.sql`: database roles
- `schema.sql`: tables, functions, policies
- `data.sql`: every row, including sign-in accounts (password hashes) and storage records

Photos themselves live in Supabase Storage and are not in the backup.

The file is encrypted (AES-256) with a passphrase kept only in GitHub secrets and your password manager, so a
downloaded copy is useless without it, even while the repository is public.

## Setup (once)

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**:

- `PROD_DATABASE_URL`: the production `DATABASE_URL`, the same value as in Vercel.
- `BACKUP_PASSPHRASE`: a long random passphrase. Save it in your password manager first: without it no
  backup can be opened.

Then run the workflow once by hand and check it finishes green.

## Opening a backup

Download the artifact from the run (a `.zip`), unzip it, then on a Mac:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 \
  -in luxichic-prod-YYYY-MM-DD.tar.gz.enc | tar -xzf -
```

It asks for the passphrase and leaves `roles.sql`, `schema.sql` and `data.sql` in the folder.

## Restoring

Into a **new, empty** Supabase project (never over the live one), with its connection string (session pooler,
port 5432) as `$URL`:

```bash
psql "$URL" -v ON_ERROR_STOP=1 -f roles.sql -f schema.sql \
  -c 'SET session_replication_role = replica' -f data.sql
```

Then point Vercel's Supabase variables at the new project and redeploy. See Supabase's guide "Migrating within
Supabase" for details.
