# Setup guide — GoatPlanner mobile

This walks through everything needed to run the app from a fresh clone: Supabase project, domain configuration for the auth trick, environment variables, and the first sign-up. Allow ~30 minutes the first time; ~5 minutes if you already have a Supabase project and domain.

---

## 1. Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ (24 tested) |
| npm | 10+ |
| A web browser | for testing locally |
| Expo Go app | iPhone / Android, for testing on a real device |
| A Supabase account | free tier is plenty |
| A registered domain with DNS access | only needed if Supabase's email validation rejects fake domains (see § 3) |

Install Expo's CLI tools globally once:
```bash
npm install -g eas-cli
```
(Not required to run locally, but needed for any builds.)

---

## 2. Supabase project

### 2a. Create the project
1. Go to https://supabase.com and sign in.
2. **New Project** → pick a name (e.g. `goatplanner`), set a strong DB password (save it somewhere safe — you won't see it again), choose a region close to your users, plan: **Free**.
3. Wait ~2 minutes for provisioning.

### 2b. Disable email confirmation (critical)
The app uses Supabase Auth with **synthetic emails** (a username appears as `<username>@<your-domain>` internally). With email confirmation **ON**, Supabase would try to send a real email to that synthetic address — which bounces and hits the free-tier limit (~4 emails/hour). Turn it off:

1. **Authentication → Sign In / Providers → Email**
2. Toggle **Confirm email** to **OFF**
3. **Save**

If you've already burned through the rate limit while testing, also bump the limit so you don't have to wait an hour:
- **Authentication → Rate Limits → "Rate limit for sending emails"** → raise to 30 or higher
- No real emails go out once confirmation is off; this just clears any current cooldown

### 2c. Run the schema
1. **SQL Editor → New Query**
2. Open [supabase/schema.sql](supabase/schema.sql), copy the entire file
3. Paste into the editor → **Run**

This creates:
- `teams`, `bookings`, `exceptions` tables, all with `owner_id uuid references auth.users(id)`
- Row-level security policies that filter by `owner_id = auth.uid()` (every user only sees their own data)
- Realtime publication so the app receives push events for live updates

The script is idempotent — safe to re-run, but **destructive** (drops existing data) by design when migrating.

### 2d. Copy your project credentials
**Settings → API**:
- **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
- **anon / public key** (modern key format: `sb_publishable_...`; legacy: starts with `eyJ...`). Both work.

Save these for § 4.

---

## 3. Domain configuration (MX record)

### Why this is needed
Recent versions of Supabase Auth validate signup emails against DNS — they require at least one MX record on the domain. We never actually send mail; the MX record just needs to **exist** so Supabase's validator passes.

The app converts the username you type (e.g. `duongmui`) into a synthetic email (`duongmui@<your-domain>`) at the data layer. You never see it; it's purely an internal identifier.

### What domain to use
Any domain you control (or could borrow). For GoatPlanner the convention is `khoaivn.com` — to use a different domain, change the constant in [src/data/username.js](src/data/username.js):

```js
export const USERNAME_DOMAIN = 'your-domain.com';
```

### Adding an MX record in GoDaddy
1. **My Products → DNS** for your domain
2. **Add New Record**:
   - **Type**: MX
   - **Name**: `@`
   - **Value**: `your-domain.com` (point at the domain itself — its A record makes the MX target resolve)
   - **Priority**: `10`
   - **TTL**: 1 hour (default)
3. **Save** → wait 5–15 minutes for DNS propagation

### Verifying
On any machine:
```bash
nslookup -type=mx your-domain.com
```
Expected output (the priority number doesn't matter, content doesn't matter):
```
your-domain.com  MX preference = 10, mail exchanger = your-domain.com
```

If the lookup returns just SOA info (no `MX preference` line), DNS hasn't propagated yet — wait a few more minutes and retry.

---

## 4. Environment variables

In the `mobile/` directory, create a file called **`.env`** (it's already gitignored):

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxx
```

The values are the ones you copied in § 2d. The `EXPO_PUBLIC_` prefix is required — Expo only exposes prefixed env vars to the client bundle.

⚠️ `.env` is loaded by Expo at **dev server startup**. After you create or change it, **stop and restart `expo start`** — hot reload doesn't pick up new env vars.

---

## 5. Install + run

```bash
cd mobile
npm install
npx expo start
```

Then either:
- Press **w** to open the web preview (http://localhost:8081 by default)
- Scan the QR code with **Expo Go** on your phone (same Wi-Fi)
- Or use **tunnel mode** if same-Wi-Fi isn't possible: `npx expo start --tunnel`

---

## 6. First sign-up

1. Open the app → you'll see the auth screen
2. Toggle to **Sign up**
3. Enter a username (3–32 chars, lowercase letters / numbers / `._-`) and a password (≥6 chars)
4. Tap **Create account**

If everything is wired up correctly:
- You're signed in immediately, no email sent
- The calendar shows your username in the header (e.g. `@duongmui`) and is otherwise empty
- Create a team or two → realtime updates work
- Sign out, sign in as a different username → completely isolated data

### What's happening under the hood
- The username is converted to `<username>@<domain>` and sent to `supabase.auth.signUp({ email, password })`
- Supabase validates the email format (passes because the domain has MX records)
- Email confirmation is off, so Supabase doesn't try to send anything
- A row is added to `auth.users` and a JWT session is returned immediately
- The client persists the JWT (AsyncStorage on native, localStorage on web) so refreshing the page doesn't sign you out

---

## 7. Authentication architecture

### Username-only UX, email-based storage
| User-facing | Internal storage |
|---|---|
| Username field | `auth.users.email = <username>@<your-domain>` |
| `@username` shown in header | `emailToUsername()` strips the domain part for display |
| Error messages mention "username" | `sanitizeMessage()` rewrites Supabase's "email" wording |

### Data ownership
Every row in `teams`, `bookings`, and `exceptions` carries `owner_id uuid not null default auth.uid()`. Postgres auto-fills `owner_id` from the JWT on every insert; RLS hides rows where `owner_id != auth.uid()` on every read. The anon key alone cannot bypass this.

### Realtime
The Supabase realtime channels in the store subscribe to `*` events on each table. RLS pre-filters the events at the database level — you only receive push updates for your own rows, never for other users'.

---

## 8. Common errors

### `Email address "..." is invalid`
The synthetic domain doesn't have MX records. Check § 3, verify with `nslookup -type=mx`. The app sanitizes "Email" → "Username" in messages, so you'll actually see `Username address "..." is invalid`.

### `Email rate limit exceeded` (shown as `Username rate limit exceeded`)
Email confirmation is still **ON** in the Supabase dashboard. Go to § 2b and turn it off. You may also need to wait an hour for the existing cooldown to clear, or raise the rate limit.

### `Wrong username or password.`
Supabase returned `Invalid login credentials`. Sanity check the username (lowercase only, no leading/trailing spaces) and that you actually created this account.

### `That username is already taken.`
Self-explanatory; pick a different username. Supabase returns `User already registered` when the synthetic email collides with an existing row in `auth.users`.

### Bundling error: `Unable to resolve "@supabase/realtime-js"`
Metro's package resolver needs newer config. [metro.config.js](metro.config.js) enables `unstable_enablePackageExports` and prefers the `require` condition — make sure that file exists. If you see this error after a dependency upgrade, run `npx expo start --clear` once.

### Calendar shows nothing after sign-in
Realtime channels failing silently. Open the browser console (web) or shake-menu logs (Expo Go); look for `[Supabase Realtime]` connection errors. Often a Wi-Fi / corporate firewall issue — try `npx expo start --tunnel`.

---

## 9. Cleaning up between tests

If you want a fresh database without reseeding the schema:
1. Supabase Dashboard → **Authentication → Users** → delete the users you've created
2. With `on delete cascade` on every foreign key, deleting users automatically removes their teams, bookings, and exceptions

If you want to drop everything and reseed schema:
1. SQL Editor → re-run [supabase/schema.sql](supabase/schema.sql) (it drops + recreates the data tables)

---

## 10. Going further

When you're ready to ship, see the publishing section in the project notes — you'll need to:
- Set a real `bundleIdentifier` / `package` in [app.json](app.json)
- Provide a privacy policy URL
- Replace the placeholder `assets/icon.png` with a real 1024×1024 icon
- Sign up Apple Developer ($99/year) and Google Play Console ($25 one-time)
- Configure EAS Build with the same env vars as `.env` baked into `eas.json`

Most of those are one-time setup tasks. The day-to-day dev flow is just `npm install` + `npx expo start`.
