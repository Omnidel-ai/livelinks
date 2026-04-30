# LLL Deployment Runbook

This runbook is written for someone who is **not a developer**. Every step
either happens in the browser (a tab open in Supabase, GitHub, Vercel, or your
domain registrar) or in Claude Code chat. Plain language throughout.

If anything in here looks wrong, **stop and ask**. Nothing here is destructive
on its own, but a wrong env var or a wrong DNS record can take the site down
for an hour while it propagates.

---

## What we are deploying

- A Next.js app called **livelinks** (this repo)
- A Supabase project that holds the database
- A Vercel project that hosts the app at **vatika.live**
- Magic-link sign-in restricted to **@ky21c.org** addresses

You will end up with three browser tabs open: Supabase, Vercel, and your
domain registrar.

---

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or sign up).
2. Click **New project**.
3. Fill in:
   - **Name**: `livelinks` (or `lll` — your call)
   - **Database password**: click the generator and **save the password to
     1Password / your password manager**. You will not need it for v1, but if
     it is lost it is gone.
   - **Region**: pick the one closest to where the team mostly is (Mumbai,
     Singapore, Frankfurt — whichever is geographically nearest).
4. Wait ~2 minutes while the project provisions.

> **Open question (RamDa to decide):** dedicated new project, or reuse a
> shared Gunakul one? This runbook assumes a dedicated new project. If you
> are reusing an existing one, skip step 1 and just collect the keys in
> step 2 from that project instead.

## 2. Collect the three Supabase keys

Once the project is up, in the left sidebar:

- Click **Project Settings** (the gear) → **API**.
- You will see three values. Copy each into a temporary note:
  - **Project URL** — looks like `https://abcd1234.supabase.co`. This is
    `NEXT_PUBLIC_SUPABASE_URL`.
  - **anon public** key — a long string starting with `eyJ...`. This is
    `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Safe to expose in the browser.
  - **service_role** key — also starts with `eyJ...`, but in red with a
    warning. This is `SUPABASE_SERVICE_ROLE_KEY`. **Never paste this anywhere
    public.** Treat it like a password.

## 3. Apply the database migration

The schema lives at `supabase/migrations/0001_init.sql`. The simplest way for
v1 is to paste it into the Supabase SQL editor.

1. In the Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **New query**.
3. Open `supabase/migrations/0001_init.sql` in this repo, copy everything,
   paste it into the SQL editor.
4. Click **Run** (bottom right).
5. You should see "Success. No rows returned." If you see an error, copy it
   into the chat and Claude will sort it.
6. Verify by clicking **Table Editor** in the sidebar — you should see
   `categories` (8 rows seeded) and `links` (empty).

## 4. Configure the email allowlist

LLL is restricted to `@ky21c.org` addresses. The app double-checks this in
the sign-in form, but Supabase should also enforce it:

1. **Authentication** → **Sign In / Up** (or **Providers** → **Email**,
   depending on the dashboard layout).
2. Make sure **Email** is enabled and **Confirm email** is **off** (we are
   using magic links, no separate confirmation step).
3. Find **Email Domain Allow List** (sometimes called "restrict signups to
   these domains") and enter `ky21c.org`.
4. Save.

> If you cannot find this setting, tell Claude in the chat — different
> Supabase plans surface it in different places. Worst case the app-side
> check still blocks non-allowed addresses.

## 5. Connect the GitHub repo to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**.
3. Find `Omnidel-ai/livelinks` in the list. If you do not see it, click
   **Adjust GitHub App Permissions** and grant Vercel access.
4. Click **Import**.
5. On the configuration screen:
   - **Framework Preset**: Vercel auto-detects Next.js. Leave it.
   - **Root Directory**: leave as is.
   - **Build & Output Settings**: leave defaults.
   - **Environment Variables**: this is the important bit — see step 6.

## 6. Add environment variables on Vercel

Still on the Vercel "Configure Project" screen, in the
**Environment Variables** section, add three rows:

| Name | Value | Environments |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL from step 2 | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon public key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key | **Production** only |

For the third one, click **All Environments** and **uncheck Preview and
Development** so the service-role key is only available on production builds.

Click **Deploy**. The first build takes ~3 minutes.

## 7. Point vatika.live at Vercel

Once the first deploy succeeds:

1. In the Vercel project, go to **Settings** → **Domains**.
2. Click **Add**, type `vatika.live`, submit.
3. Vercel will show DNS records to add — usually one of:
   - **Apex (`vatika.live`)**: an `A` record pointing to `76.76.21.21`
   - **Or** a `CNAME` pointing to `cname.vercel-dns.com`
4. Open your domain registrar (wherever vatika.live is registered) and add
   the records exactly as Vercel shows them. **Do not change anything else
   in DNS.**
5. Add `www.vatika.live` too (Vercel will guide you).
6. Wait for the green check next to the domain in Vercel — usually 5–30
   minutes. DNS can take up to a few hours in the worst case.

> **If you are nervous about touching DNS, paste the Vercel "Add these
> records" screen into the Claude chat and let it walk you through which
> field maps to what in your registrar.**

## 8. Update the Supabase Site URL and redirect URLs

Magic links need to know where to send people back. In Supabase:

1. **Authentication** → **URL Configuration**.
2. **Site URL**: `https://vatika.live`
3. **Redirect URLs**: add both:
   - `https://vatika.live/auth/callback`
   - `https://*.vercel.app/auth/callback` (so preview deploys also work)
4. Save.

## 9. First sign-in

1. Open `https://vatika.live`.
2. You will be redirected to `/auth`.
3. Type your @ky21c.org email and click **Send magic link**.
4. Open your inbox, click the link, and you should land on the empty Live
   Board.
5. Click **Add link** and add a test entry. Then click the archive icon to
   move it to the archive. Then click **Archive** tab to confirm it's there.
6. If everything works, delete the test entry and you are live.

## 10. (Optional) Import the chat-preview JSON dump

If you have a JSON dump from the chat preview that you want to load in:

1. Save the JSON to a file, e.g. `dump.json`. The shape is:

   ```json
   {
     "categories": ["Rangamati", "Docs", "..."],
     "links": [
       {
         "title": "Rangamati Final Playbook",
         "url": "https://...",
         "category": "Rangamati",
         "subType": "playbook",
         "note": "v3, signed-off",
         "status": "live",
         "createdAt": "2025-12-01T10:00:00Z",
         "updatedAt": "2026-01-15T10:00:00Z"
       }
     ]
   }
   ```

   `categories` is optional (any unknown category names in `links` are
   created on the fly). `status`, `createdAt`, `updatedAt` are also
   optional.

2. Run this from a terminal (Claude can run it for you in chat):

   ```bash
   curl -X POST https://vatika.live/api/import \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     --data-binary @dump.json
   ```

   On success you will get back `{ "ok": true, "imported": { "categories": N, "links": M } }`.

3. The endpoint is **not idempotent**. If you run it twice you will get
   duplicates. Run it once, verify, move on.

---

## Troubleshooting

- **Magic link email never arrives.** Supabase has a daily free-tier email
  limit (3/hour, 30/day). For more, you can plug in Resend / SendGrid via
  Authentication → Email Templates → SMTP Settings. Not needed for v1
  unless you hit the limit.
- **"Sign-in is restricted to @ky21c.org addresses."** That is the app-level
  check. Use a @ky21c.org email.
- **`/api/import` returns 401.** Either the `Authorization` header is
  missing, or the bearer token does not match `SUPABASE_SERVICE_ROLE_KEY`
  on Vercel.
- **Build fails on Vercel with "Supabase env vars missing".** You forgot
  one of the three env vars in step 6, or the names have a typo. Names are
  case-sensitive.
- **DNS verification stuck for hours.** Double-check the records match
  exactly what Vercel asked for. Sometimes a stray trailing dot or a
  CNAME on the apex (which most registrars do not allow) is the cause.

## When something goes wrong

1. Take a screenshot.
2. Paste it into the Claude chat.
3. Describe in one line what you were trying to do.

That is enough to get unstuck.
