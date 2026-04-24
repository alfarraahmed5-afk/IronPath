# IronPath — Complete Deployment Guide
### For people who have never shipped an app before

This guide takes you from zero to a live app on the App Store and Google Play.  
Read each section fully before doing anything in it. Steps must be done **in order**.

---

## What You're Deploying

IronPath has three separate pieces that all need to be running:

| Piece | What It Is | Where It Lives |
|-------|-----------|----------------|
| **Backend** | The server your app talks to | Railway (cloud hosting) |
| **Database** | Where all data is stored | Supabase |
| **Admin Panel** | Web dashboard for gym owners | Vercel |
| **Mobile App** | The iOS + Android app | App Store + Google Play |

---

## Accounts You Need to Create First

Do all of these before touching any code. All are free to start.

1. **Supabase** — https://supabase.com — click "Start for free", sign up with GitHub or email
2. **Railway** — https://railway.app — sign up with GitHub (must use Hobby plan — $5/month — free tier kills background jobs)
3. **Vercel** — https://vercel.com — sign up with GitHub (free)
4. **GitHub** — https://github.com — you need this to connect Railway and Vercel
5. **Resend** — https://resend.com — for sending emails (forgot password, etc.) — free tier is fine
6. **Expo** — https://expo.dev — for building the mobile app — sign up free
7. **Apple Developer** — https://developer.apple.com/programs — $99/year, required for iOS
8. **Google Play Console** — https://play.google.com/console — $25 one-time, required for Android

> **Don't have $99 yet?** You can test everything except App Store submission for free. Come back to Apple/Google when you're ready to publish.

---

## Software to Install on Your Computer

Open a terminal (on Windows: search "PowerShell" or "Windows Terminal").  
Copy and paste these commands one at a time.

### 1. Node.js (version 18 or higher)
Download from https://nodejs.org — click "LTS" version, run the installer.  
Verify it worked:
```
node --version
```
Should print something like `v18.20.0` or higher.

### 2. Git
Download from https://git-scm.com — run the installer with all default options.  
Verify:
```
git --version
```

### 3. Supabase CLI
```
npm install -g supabase
```
Verify:
```
supabase --version
```

### 4. EAS CLI (for building the mobile app)
```
npm install -g eas-cli
```
Verify:
```
eas --version
```

### 5. Railway CLI
```
npm install -g @railway/cli
```
Verify:
```
railway --version
```

### 6. Vercel CLI
```
npm install -g vercel
```

---

## Step 1 — Push Your Code to GitHub

Railway and Vercel deploy directly from GitHub. You need your code there first.

### 1a. Create a new GitHub repository
1. Go to https://github.com/new
2. Name it `ironpath` (or anything you want)
3. Set it to **Private**
4. Do NOT check "Add README" or any other options
5. Click "Create repository"

### 1b. Push your code
Open a terminal and navigate to your project folder:
```
cd "C:\Users\fault\OneDrive\Desktop\IronPath"
```

Run these commands in order:
```
git init
git add .
git commit -m "Initial commit — all phases complete"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ironpath.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

When prompted, enter your GitHub username and password. If it asks for a token instead of a password, go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate new token. Check "repo" scope, copy the token, use it as your password.

---

## Step 2 — Set Up Supabase (Database)

This is the most involved step. Take it slowly.

### 2a. Create a Supabase project
1. Log in to https://supabase.com
2. Click "New project"
3. Pick your organization (or create one)
4. **Project name:** IronPath
5. **Database password:** Create a strong password — **write it down somewhere safe**
6. **Region:** Pick the one closest to where your users will be
7. Click "Create new project" — takes about 2 minutes

### 2b. Get your Supabase credentials
Once the project is created, go to:
**Project Settings → API** (left sidebar)

Copy these three values — you'll need them for the `.env` file:
- **Project URL** — looks like `https://abcdefghijkl.supabase.co`
- **anon public** key — long string starting with `eyJ...`
- **service_role** key — another long string starting with `eyJ...` (keep this secret)

Also get the JWT secret:
**Project Settings → API → JWT Settings → JWT Secret**

And your database password — the one you set in step 2a.

### 2c. Create your `.env` file
In your project folder, go into the `backend` folder and create a file called `.env` (not `.env.example` — a new file called exactly `.env`).

You can do this in Notepad, VS Code, or any text editor.

Copy this template and fill in your values:

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
SUPABASE_DB_PASSWORD=your-database-password-here
PORT=3000
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@ironpath.app
SUPER_ADMIN_EMAIL=your-email@example.com
SUPER_ADMIN_PASSWORD=choose-a-strong-password
ADMIN_PANEL_URL=http://localhost:5173
APP_DOWNLOAD_URL=https://ironpath.app/download
```

For `RESEND_API_KEY`: log in to https://resend.com, go to API Keys, create one, paste it in.

### 2d. Link the Supabase CLI to your project
In your terminal, from the root `IronPath` folder:
```
supabase login
```
This opens a browser — click "Authorize".

Then link your project (find your project ref in Supabase → Project Settings → General — it's the short ID after `supabase.co/project/`):
```
supabase link --project-ref YOUR_PROJECT_REF --password YOUR_DB_PASSWORD
```

### 2e. Push the database schema
This creates all 29 tables, indexes, triggers, RLS policies, and storage buckets:
```
supabase db push
```

Wait for it to complete. You should see "Applying migration..." for each of the 34 files.  
If you see errors, check that your `--password` was correct and try again.

**Verify it worked:** Go to Supabase → Table Editor. You should see tables like `users`, `workouts`, `exercises`, etc.

### 2f. Register the Auth Hook
This is critical — without it, JWTs won't contain `gym_id` and the app will break.

1. Go to your Supabase project dashboard
2. Click **Authentication** in the left sidebar
3. Click **Hooks**
4. Under "Custom Access Token Hook", click "Add new hook"
5. Select: **Postgres function**
6. Select the function: **`public.custom_access_token_hook`**
7. Click "Save"

### 2g. Seed the exercise library
This imports over 100 exercises from the wger fitness database:
```
cd backend
npm install
node scripts/import-wger.js
```

This takes 1-2 minutes. You should see exercises being imported.

### 2h. Seed pre-built programs
```
node scripts/seed-prebuilt-routines.js
```

### 2i. Create the super admin account
This creates your admin login for the admin panel:
```
node scripts/seed-super-admin.js
```

You'll use the email and password from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in your `.env` file to log into the admin panel.

**Verify all seeding worked:** Go to Supabase → Table Editor → exercises. You should see 100+ rows.

---

## Step 3 — Deploy the Backend to Railway

### 3a. Set up Railway
1. Log in to https://railway.app
2. Click "New Project"
3. Click "Deploy from GitHub repo"
4. Connect your GitHub account if prompted
5. Select your `ironpath` repository
6. Railway will detect it as a Node.js project

### 3b. Configure the build
Railway needs to know which folder is the backend (since your repo has multiple packages).

In Railway:
1. Click on your service
2. Go to **Settings**
3. Under **Build**, set **Root Directory** to `backend`
4. Under **Build Command**: `npm run build`
5. Under **Start Command**: `npm start`

### 3c. Add environment variables
In Railway, click on your service → **Variables** tab → click "Add Variable".

Add every single variable from your `backend/.env` file. For the production values, change:
- `NODE_ENV` → `production`
- `CORS_ALLOWED_ORIGINS` → `https://your-admin-panel.vercel.app` (you'll update this after Vercel deploy)
- `ADMIN_PANEL_URL` → `https://your-admin-panel.vercel.app`

### 3d. Upgrade to Hobby plan
This is **required** — the free tier pauses your server after 5 minutes of inactivity, killing all background jobs (leaderboard updates, streak resets, etc.).

In Railway: click your account name → Billing → Upgrade to Hobby ($5/month).

### 3e. Deploy
Click "Deploy" in Railway. Watch the build logs — it should take 1-2 minutes.

Once deployed, Railway gives you a URL like `https://ironpath-production-xxxx.up.railway.app`.

**Copy this URL** — you need it for the mobile app and admin panel.

**Test it:** Open your browser and go to `https://your-railway-url.up.railway.app/health`. You should see:
```json
{"status": "ok", "timestamp": "..."}
```

---

## Step 4 — Deploy the Admin Panel to Vercel

### 4a. Create the admin `.env` file
In the `admin` folder, create a file called `.env.local`:
```
VITE_API_URL=https://your-railway-url.up.railway.app/api/v1
VITE_APP_NAME=IronPath
```

Replace `your-railway-url` with the actual Railway URL from Step 3.

### 4b. Deploy to Vercel
From inside the `admin` folder:
```
cd admin
vercel
```

Follow the prompts:
- "Set up and deploy?" → **Y**
- "Which scope?" → select your account
- "Link to existing project?" → **N**
- "Project name?" → `ironpath-admin`
- "Directory?" → press Enter (it detects the current directory)

When it asks about build settings, Vercel should auto-detect Vite. If it asks:
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install`

### 4c. Add environment variables to Vercel
1. Go to https://vercel.com/dashboard
2. Click your `ironpath-admin` project
3. Click **Settings → Environment Variables**
4. Add `VITE_API_URL` = `https://your-railway-url.up.railway.app/api/v1`
5. Add `VITE_APP_NAME` = `IronPath`
6. Click **Save**, then go to **Deployments** and click "Redeploy"

### 4d. Update Railway CORS
Now that you have your Vercel URL (looks like `https://ironpath-admin.vercel.app`), go back to Railway and update:
- `CORS_ALLOWED_ORIGINS` → `https://ironpath-admin.vercel.app`
- `ADMIN_PANEL_URL` → `https://ironpath-admin.vercel.app`

Then trigger a redeploy in Railway (click "Deploy" again).

### 4e. Test the admin panel
Go to your Vercel URL and log in with the email/password you set in `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`.

You should see a dashboard. If login fails, double-check that the Railway URL in `VITE_API_URL` is correct and doesn't have a trailing slash.

---

## Step 5 — First Gym Setup (Creating a Gym)

Before members can sign up, a gym needs to exist in the system.

### Option A: Use the API directly (easiest)
Open a new tab and go to a tool called **Hoppscotch** at https://hoppscotch.io or use **Postman** (download from https://postman.com).

Send this request:
- **Method:** POST  
- **URL:** `https://your-railway-url.up.railway.app/api/v1/gyms`
- **Body (JSON):**
```json
{
  "name": "My Gym Name",
  "owner_email": "gymowner@example.com",
  "owner_password": "SecurePassword123!",
  "owner_full_name": "Gym Owner Name",
  "owner_username": "gymowner"
}
```

The response will include an `invite_code`. **Save this** — members use it to join.

### Option B: Use the admin panel
Log in to the admin panel and use the Members section to manage your gym.

---

## Step 6 — Build and Submit the Mobile App

This is the most complex step. The mobile app gets compiled into an `.ipa` file (iOS) and `.aab` file (Android) and submitted to the App Stores.

### 6a. Create your mobile `.env.local` file
In the `mobile` folder, create `.env.local`:
```
EXPO_PUBLIC_API_URL=https://your-railway-url.up.railway.app/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6b. Install mobile dependencies
```
cd mobile
npm install
```

### 6c. Log in to your Expo account
```
eas login
```
Enter your Expo email and password.

### 6d. Configure EAS for your project
```
eas build:configure
```
This creates the `eas.json` file (already exists in your project) and links to your Expo account.

### 6e. (iOS only) Set up your Apple Developer account
1. Go to https://developer.apple.com/account
2. Go to **Certificates, IDs & Profiles → Identifiers**
3. Click **+** and register a new App ID
4. **Bundle ID:** `com.ironpath.app`
5. Enable **Push Notifications** capability
6. Save

EAS will handle certificates and provisioning profiles automatically when you build.

### 6f. Build for internal testing first (no App Store yet)
This creates a build you can install directly on your own phone to test:

**iOS preview build:**
```
eas build --platform ios --profile preview
```

**Android preview build:**
```
eas build --platform android --profile preview
```

Each build takes 10-15 minutes. EAS builds in the cloud — you don't need Xcode or Android Studio.

When done, EAS gives you a QR code or link to install on your device.

**Test the app thoroughly** — log in, create a workout, check the leaderboard, etc. Fix any issues before submitting to the App Store.

### 6g. Build for production (App Store submission)
Once you're happy with testing:
```
eas build --platform all --profile production
```

This builds both iOS and Android simultaneously.

### 6h. Submit to the App Stores
**iOS:**
```
eas submit --platform ios
```
EAS will ask for your Apple credentials and upload to TestFlight automatically.

**Android:**
```
eas submit --platform android
```
EAS uploads to Google Play internal testing track.

### 6i. What happens next

**iOS path:**
1. Build goes to **TestFlight** — Apple reviews it (usually 1-3 days)
2. Once approved, you can share TestFlight links with beta testers
3. When ready for public release: App Store Connect → your app → Pricing → Submit for App Review
4. Apple reviews again (usually 1-7 days)
5. Once approved, you set a release date or release immediately

**Android path:**
1. Build goes to **Internal Testing** on Google Play Console immediately
2. Share with testers via email
3. When ready: promote to "Production" track
4. Google reviews (usually 1-7 days for new apps)

---

## Step 7 — App Store Required Information

You need this content filled out in App Store Connect (iOS) and Google Play Console (Android) before review.

### App Store Connect (iOS)
Go to https://appstoreconnect.apple.com → My Apps → IronPath

Fill out:
- **Name:** IronPath
- **Subtitle:** Gym Workout Tracker
- **Description:**

  ```
  IronPath is the workout tracker built for your gym community. Track every lift, compete on gym-wide leaderboards, and follow your training partners' progress.

  FEATURES:
  • Log workouts with full exercise library (barbell, dumbbell, bodyweight, cardio)
  • Compete on real-time leaderboards with your gym members
  • AI-powered trainer that adjusts your weights automatically
  • Achievement badges and streak tracking
  • Feed of your gym's workouts
  • Gym admin dashboard for owners
  ```

- **Keywords:** `gym,workout,tracker,strength,training,lifting,fitness,barbell`
- **Category:** Health & Fitness
- **Age Rating:** 4+
- **Privacy Policy URL:** https://ironpath.app/privacy *(you need to publish this — see below)*
- **Support URL:** https://ironpath.app/support

**Screenshots required:**
- iPhone 6.7" (1290×2796px) — minimum 3 screenshots
- iPhone 5.5" (1242×2208px) — minimum 3 screenshots

Take screenshots on a simulator or physical device with test data.

**Review notes** (put this in "Notes for App Review"):
```
Test account for App Review:
Invite code: [your gym's invite code from Step 5]
Email: reviewer@ironpath.app
Password: ReviewPassword123!

Please create this account using the invite code on the registration screen, then log in normally.
```

### Google Play Console (Android)
Go to https://play.google.com/console → Create app → IronPath

Fill out:
- **App name:** IronPath
- **Short description** (80 chars max): `Track workouts and compete with your gym`
- **Full description:** same as iOS description above
- **Category:** Health & Fitness
- **Content rating:** complete the questionnaire (answer "no" to everything — this is a fitness app)
- **Data safety:** fill out the questionnaire (yes to collecting name/email, no to selling data)
- **Privacy policy URL:** https://ironpath.app/privacy

---

## Step 8 — Set Up Your Domain and Privacy Policy

You need a domain and privacy policy before the App Store will approve your app.

### 8a. Buy a domain
Go to https://namecheap.com or https://porkbun.com and search for `ironpath.app`.  
If it's taken, try `getironpath.com` or `ironpathapp.com`.

Costs ~$10-15/year.

### 8b. Privacy Policy
You legally need one. Use a generator:  
https://www.privacypolicygenerator.info or https://app-privacy-policy-generator.firebaseapp.com

Key things to include:
- You collect: name, email, workout data
- You do NOT sell user data
- Users can delete their account and data by contacting you
- Contact email: your email

Publish the privacy policy at `https://yourdomain.com/privacy`.

The cheapest way to host it: create a free GitHub Pages site. Go to GitHub → New Repository → name it `yourusername.github.io` → upload an `index.html` with your privacy policy → enable Pages in Settings.

### 8c. Configure DNS for admin panel (optional but professional)
If you want your admin panel at `admin.ironpath.app` instead of `ironpath-admin.vercel.app`:

1. In Vercel, go to your admin project → Settings → Domains → Add `admin.ironpath.app`
2. Vercel gives you DNS records to add
3. In your domain registrar (Namecheap/Porkbun), add those DNS records
4. Wait 10-30 minutes for it to propagate

---

## Common Problems and Fixes

### "CORS error" in the admin panel
The backend is rejecting requests from your admin panel domain.  
Fix: Update `CORS_ALLOWED_ORIGINS` in Railway to exactly match your Vercel URL (no trailing slash).

### "Invalid invite code" when a member tries to register
The invite code doesn't exist or is expired.  
Fix: Log into the admin panel → Invites → create a new invite code.

### App builds but crashes on launch
Almost always an environment variable issue.  
Fix: Check that `EXPO_PUBLIC_API_URL` in `mobile/.env.local` is your actual Railway URL.  
Make sure there's no trailing slash at the end of the URL.

### Push notifications not working
Fix: Make sure the `expo-notifications` plugin is in `app.json` (it already is).  
On iOS, push notifications require a paid Apple Developer account and the `expo` push token service.

### Database migration failed partway through
Fix: Run `supabase db push` again — it's idempotent and will skip already-applied migrations.

### "service_role key" exposed
If you ever accidentally commit your `.env` file to GitHub, immediately go to Supabase → Project Settings → API → regenerate your service role key.

### EAS build fails with "credentials" error
Fix: Run `eas credentials` and follow the prompts to let EAS manage your credentials automatically.

### "expo-notifications" error on Android
Fix: Make sure the `expo-notifications` plugin is listed in `app.json` under `plugins` (already done in your project).

---

## Ongoing Maintenance

### Updating the app
1. Make your code changes
2. Run `npx tsc --noEmit` in `backend/` and `mobile/` to check for errors
3. `git add . && git commit -m "your change" && git push`
4. Railway auto-deploys when you push (you can enable this in Railway settings)
5. For mobile: `eas build --platform all --profile production` → `eas submit --platform all`
6. Increment version in `mobile/app.json` (`1.0.0` → `1.0.1`) before each submission

### Adding a new gym
Use the `POST /api/v1/gyms` endpoint (same as Step 5) or build a form in the admin panel.

### Monitoring
- **Backend logs:** Railway dashboard → your service → Logs tab
- **Database:** Supabase dashboard → Table Editor or Logs
- **Mobile crashes:** Expo dashboard → your project → Diagnostics

### Backups
Supabase automatically backs up your database daily on paid plans. On the free plan, export manually:  
Supabase → Settings → Database → Download a backup.

---

## Quick Reference — All Your URLs

Fill this in after completing the steps above:

| Service | URL |
|---------|-----|
| Supabase dashboard | https://supabase.com/dashboard/project/YOUR_PROJECT_REF |
| Backend (Railway) | https://YOUR_APP.up.railway.app |
| Backend health check | https://YOUR_APP.up.railway.app/health |
| Admin panel (Vercel) | https://ironpath-admin.vercel.app |
| iOS app (TestFlight) | *(fill in after submission)* |
| Android (Play Console) | https://play.google.com/console |

---

## Quick Reference — Key Commands

| What | Command | Run From |
|------|---------|----------|
| Push DB changes | `supabase db push` | Root folder |
| Run backend locally | `npm run dev` | `backend/` folder |
| Run admin panel locally | `npm run dev` | `admin/` folder |
| Run mobile app locally | `npx expo start` | `mobile/` folder |
| Check for TypeScript errors | `npx tsc --noEmit` | `backend/` or `mobile/` |
| Run tests | `npm test` | `backend/` folder |
| Build mobile (test) | `eas build --platform all --profile preview` | `mobile/` folder |
| Build mobile (store) | `eas build --platform all --profile production` | `mobile/` folder |
| Submit to stores | `eas submit --platform all` | `mobile/` folder |
| Deploy admin | `vercel --prod` | `admin/` folder |

---

*Last updated: 2026-04-24. All 10 build phases complete.*
