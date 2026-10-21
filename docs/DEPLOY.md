# Deploying Vocabulary & Mind Studio

Two ways to run it. Cloud is the main target; Docker on your own machine works too.

> **Free-tier limits change.** I have not checked Render's or Turso's current free-plan limits as of this
> writing (2026-10-20). Before relying on them, open each pricing page and confirm: Render's free web
> service sleeps after idle time (the first visit after a nap is slow), and Turso's free database has
> storage and request limits. The app uses very little of either.

## Option A: Render (free) + Turso (free database)

Why two services: Render's free web service forgets files when it restarts, so your word history
and notes live in a Turso database instead. The app creates its tables and loads its words
automatically on every start. There are no manual database steps.

### 1. Put the code on GitHub (one time)

Render deploys from a Git repository.

1. Create an empty **private** repository on GitHub (no README).
2. In the project folder run `git init`, `git add .`, `git commit -m "Mind Studio"`, then follow the
   two `git remote add` / `git push` lines GitHub shows you. `.env` and `data/` are already ignored,
   so no secrets are uploaded.

### 2. Create the Turso database

1. Sign up at <https://turso.tech>.
2. Create a database (any name, nearest region).
3. Copy two values from the database page:
   - **URL**, which looks like `libsql://your-db-your-org.turso.io`
   - **Auth token** (create a read-write token)

### 3. Create the Render service

1. Sign up at <https://render.com> and connect your GitHub account.
2. **New → Blueprint**, pick your repository. Render reads `render.yaml`.
3. When asked, fill in:

   | Variable              | Value                                       |
   | --------------------- | ------------------------------------------- |
   | `APP_PASSCODE`        | The passcode you will type to enter the app |
   | `DATABASE_URL`        | The Turso URL from step 2                   |
   | `DATABASE_AUTH_TOKEN` | The Turso token from step 2                 |

   `SESSION_SECRET` is generated for you.

4. Click **Apply**. The first build takes a few minutes.
5. Open the `.onrender.com` address Render shows you, sign in, and your five words are there.

### Your timezone

Open **Settings → Your day** in the app and pick your timezone (for example `Asia/Manila` or
`America/New_York`). It is stored in the database, so it survives redeploys, and it only changes which
date counts as today from then on; your history is never rewritten. `DEFAULT_TIMEZONE` (default
`UTC`) is just the starting value used until you choose one.

### Backups

**Settings → Your data → Download backup** saves your progress, notes and settings as one file. Do it
now and then, because the free Turso database is the only copy. To restore, use the same page; see
`docs/EXPORT-FORMAT.md` for what is included.

### Checking it works

- `https://<your-app>.onrender.com/healthz` should show `{"ok":true}`.
- Redeploy from the Render dashboard and confirm the same five words are still there. They are stored
  in Turso, so history survives.

## Option B: Docker on your own machine

1. Copy `.env.example` to `.env` and set `APP_PASSCODE` and `SESSION_SECRET`.
2. Run `docker compose up -d`.
3. Open <http://localhost:3000>.

Your data lives in the `mindstudio-data` Docker volume, so `docker compose down` and `up` keeps it.
`docker compose down -v` deletes it.

## Other hosts

The image is a plain Node container, so Koyeb or Hugging Face Spaces (Docker) also work. Set the same
environment variables. If the host sits behind an HTTPS proxy, also set `PROTOCOL_HEADER` and
`HOST_HEADER` as in `render.yaml`. For plain http, set `ASSUME_HTTP=1` (see `server.js`). Without one of those, login
form submissions are rejected by SvelteKit's cross-site protection.
