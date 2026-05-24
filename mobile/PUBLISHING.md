# Publishing guide — App Store + Play Store

How to take this Expo app from local dev to live in both stores. Assumes you've completed [SETUP.md](SETUP.md) and the app runs cleanly on web + Expo Go.

You do **not** need a Mac. All iOS builds happen in EAS's cloud.

---

## 0. The big picture

You'll use **EAS** (Expo Application Services) for both platforms. Three commands you'll run repeatedly:

| Command | What it does |
|---|---|
| `eas build` | Compiles your app into a `.ipa` (iOS) or `.aab` (Android) in the cloud |
| `eas submit` | Uploads that binary to App Store Connect / Google Play |
| `eas update` | Pushes JS-only updates to already-installed apps (no new binary, no store review) |

EAS has a free tier (~30 builds/month). For solo/hobby projects you'll never hit it; if you do, the next tier is ~$19/month.

---

## 1. Accounts you need (do these first — verification delays block everything else)

| Account | Cost | Used for |
|---|---|---|
| [Expo](https://expo.dev/signup) | Free | EAS Build, OTA updates |
| [Apple Developer Program](https://developer.apple.com/programs/) | **$99/year** | App Store distribution |
| [Google Play Console](https://play.google.com/console/signup) | **$25 one-time** | Play Store distribution |

Apple verification: **1–3 days**. Google: usually same-day. Sign up now even if you're a week from publishing.

---

## 2. Pre-flight: fix `app.json`

The defaults from `create-expo-app` won't pass store review. Edit [app.json](app.json):

```json
{
  "expo": {
    "name": "GoatPlanner",
    "slug": "goatplanner",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": {
      "bundleIdentifier": "com.yourdomain.goatplanner",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": {
      "package": "com.yourdomain.goatplanner",
      "versionCode": 1,
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      }
    },
    "plugins": [
      "@react-native-community/datetimepicker"
    ]
  }
}
```

**Critical things:**
- **`ios.bundleIdentifier`** and **`android.package`** are immutable once a build is on either store. Pick carefully. Convention: reverse-DNS, e.g. `com.yourdomain.appname`.
- **`version`** is the user-visible version. Bump it for every store submission.
- **`buildNumber`** (iOS) and **`versionCode`** (Android) must increment for every submission to the same `version`. Use integers (`1`, `2`, `3`…).

**Also do:**
- Replace `assets/icon.png` with a real **1024×1024 PNG**, no transparency, no rounded corners (Apple/Google add those for you).
- Remove unused plugins — if `expo-sqlite` is still in `plugins` from earlier experiments, drop it (`npm uninstall expo-sqlite` too).

---

## 3. One-time EAS setup

```bash
cd mobile
npm install -g eas-cli   # if not already
eas login                # uses your Expo account
eas init                 # creates the EAS project, writes projectId into app.json
```

`eas init` writes a `projectId` under `expo.extra.eas` in `app.json`. Commit that.

---

## 4. Build profiles (`eas.json`)

```bash
eas build:configure
```

This creates `eas.json` with three default profiles. Edit it to bake in the Supabase env vars (the local `.env` is **not** read in EAS cloud builds):

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_xxxxxxxxxxxxx"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://xxxxxxxx.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "sb_publishable_xxxxxxxxxxxxx"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

Both keys are public-by-design — safe to commit `eas.json`. If you ever rotate to private (`sb_secret_…`) keys, use `eas secret:create` instead of inline env.

The three profiles:
- **development** — for `eas build --profile development`, makes a dev client you can scan with QR code (rarely needed)
- **preview** — internal testing builds; not for store submission
- **production** — what you actually submit

---

## 5. iOS — App Store

### 5a. Build the binary
```bash
eas build --platform ios --profile production
```

First run is interactive:
- **Apple Developer login** opens in browser
- **"Generate a new Apple Distribution Certificate?"** → Yes (EAS stores it)
- **"Generate a Provisioning Profile?"** → Yes

Build takes **15–25 min** in EAS's queue. You'll get a URL to monitor it and a download link for the `.ipa` when done.

### 5b. App Store Connect setup
While the build runs, go to https://appstoreconnect.apple.com → **My Apps → +**:

1. Platform: **iOS**, name: "GoatPlanner"
2. Bundle ID: pick the one you registered under **Certificates, Identifiers & Profiles** (must match `app.json`)
3. **Listing fields** (all required):
   - **Description** (up to 4000 chars)
   - **Keywords** (comma-separated, 100 chars total)
   - **Support URL** — GitHub repo or a contact page
   - **Privacy Policy URL** — Apple verifies the URL works. Cheapest: a single GitHub Pages markdown
   - **Category** — "Productivity" fits
4. **Screenshots**:
   - **6.7" iPhone** (1290×2796) — minimum 3
   - **6.5" iPhone** (1284×2778) — minimum 3
   - You can take them in the iOS Simulator on a Mac, or use a service like screenshots.pro
5. **App Privacy questionnaire**:
   - "Other User Content" collected (the bookings, team names)
   - "Linked to user identifier" (via `auth.users`)
   - "App functionality" only — not used for tracking or advertising

### 5c. Upload to TestFlight
```bash
eas submit --platform ios --latest
```

Apple processes the binary (~15 min), then it appears in **TestFlight**. Add yourself + up to 100 internal testers via email. Install on a real iPhone and test:
- Sign up / sign in flow over cellular (not just Wi-Fi)
- Booking create/edit/delete
- Realtime updates (open the app on two phones, change something on one)

### 5d. Submit for App Review
In App Store Connect, attach the build to a **Version** → **Submit for Review**.

Apple review: **1–3 days**. Most common rejections on this kind of app:
- Missing privacy policy URL (or it 404s)
- Placeholder icons / no screenshots
- "App doesn't work" — Apple's reviewers actually run the app on cellular. If your Supabase region is far from them, requests can be slow. Provide a test account in the review notes so they don't have to sign up.
- Crash on launch — test the EAS-built `.ipa`, not just the dev server, before submitting

Once approved, you choose **Release** (manual or automatic). Live within minutes.

---

## 6. Android — Play Store

### 6a. Build the binary
```bash
eas build --platform android --profile production
```

EAS auto-generates and stores a keystore (Google Play App Signing). Output: `.aab` (Android App Bundle). **10–15 min**.

### 6b. Play Console setup
At https://play.google.com/console:

1. **Create app** → name, default language, free, app or game = App
2. **Set up your app** wizard (~12 checkboxes):
   - **Privacy Policy URL** (required)
   - **Data safety** — declare username + booking content as collected, stored on Supabase
   - **Ads** — No
   - **Content rating** — IARC questionnaire, ~5 min
   - **Target audience** — pick (13+ probably)
   - **App access** — provide a demo username/password so reviewers can use the app
   - **News / COVID / Government** — No
3. **Main store listing**:
   - **Short description** (80 chars)
   - **Full description** (4000 chars)
   - **App icon** (512×512)
   - **Feature graphic** (1024×500)
   - **Phone screenshots** — minimum 2, recommended 4–6

### 6c. Upload to internal testing
```bash
eas submit --platform android --latest --track internal
```

Internal testing skips review. Invite testers by email; they install within minutes via Play Store. Test:
- Sign up + sign in
- Booking flows (create, edit, delete, recurring)
- Realtime sync across devices

### 6d. Promote to production
Play Console → **Production → Create new release** → pick the `.aab` from internal testing → **Review release** → release notes → **Start rollout**.

First release: Google manually reviews — **3–7 days** lately. Subsequent updates are hours.

---

## 7. After launch — OTA updates

Most JS/UI changes ship instantly without rebuilding or store review:

```bash
eas update --branch production --message "Fix booking timezone bug"
```

Installed apps fetch the update on next launch.

**Cannot OTA-update:**
- New native modules
- Plugin changes in `app.json`
- Icon, splash screen
- The Hermes engine config

For those, build + submit a new binary (bump `version` and `buildNumber`/`versionCode`).

You'll also need `expo-updates` installed and configured. Add it:
```bash
npx expo install expo-updates
```
And set `runtimeVersion` in `app.json`:
```json
"runtimeVersion": { "policy": "sdkVersion" }
```

---

## 8. Stack-specific watch-outs

### Supabase realtime over cellular
WebSockets sometimes drop on flaky mobile networks. Test signup → create booking on cellular (not Wi-Fi) before submitting. If it hangs, file a Supabase support ticket; this is rarely a code issue.

### Calendar-kit + Reanimated 4 worklets
The worklets engine can crash on first render if Hermes wasn't initialized right. **Always test the EAS-built `.aab` / `.ipa` on a real device** — not just Expo Go, not just the dev server. The dev environment masks these issues.

### MX record on your auth domain
The synthetic-email auth trick (see [SETUP.md § 3](SETUP.md)) needs the MX record to exist in production too. Make sure it's still there on your domain registrar before submitting — Apple/Google reviewers will sign up and the MX check happens server-side.

### Privacy policy URL
Both stores require it, both verify it returns 200. Cheapest path: a one-page Markdown on GitHub Pages stating:
- What data you collect (username, bookings, team info)
- Where it's stored (Supabase, region X)
- How users can delete their data (sign in → delete account, or email you)
- Whether you use third-party analytics (no, in this app's case)

### Test account for reviewers
Apple and Google reviewers don't sign up themselves. Create one ahead of time (e.g. username `appreview`, password something secure) and put credentials in:
- **App Store Connect → Version → App Review Information → Sign-in required**
- **Play Console → App access**

Without this they'll often reject with "could not test the app."

---

## 9. Timeline if you start today

| Day | Action |
|---|---|
| 0 | Sign up Expo + Apple + Google. Fix `app.json`. Replace icon. Run EAS init. |
| 1 | Apple verification arrives. Run first iOS + Android production builds. Set up store listings. Write privacy policy. Take screenshots. |
| 2 | TestFlight + Play internal testing on real devices. Fix any bugs found. |
| 3 | Submit to both stores. |
| 4–6 | Google approves first release. |
| 4–7 | Apple approves. |
| 7 | Live on both stores. |

---

## 10. Pre-launch checklist

- [ ] `app.json` has real bundle IDs, version, real icon path
- [ ] `assets/icon.png` is a real 1024×1024 PNG (no transparency)
- [ ] `expo-sqlite` and any other unused plugins removed
- [ ] `eas.json` has production env vars baked in
- [ ] Privacy policy hosted at a publicly accessible URL
- [ ] Screenshots taken (6.7" + 6.5" iPhone, 2+ Android phone)
- [ ] Demo account created in Supabase for store reviewers
- [ ] Tested EAS-built binary on a real device over cellular
- [ ] MX record on your auth domain confirmed via `nslookup -type=mx`
- [ ] Supabase project is not paused (free projects pause after 7 days of inactivity — sign in to wake it up before publishing)

Once everything's ticked, you're ready to `eas submit` and start the review clock.
