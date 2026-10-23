# CourtReady 🏀

A basketball performance app that generates the best workout for **today** based on your age, height, weight, position, experience, goal, equipment, injury history and how you actually feel — then periodizes the whole week so you arrive at tip-off at **peak fitness**, not peak fatigue.

CourtReady is a **fully static, client-side app**. There is no server, no database and no sign-up: your athlete profile, check-ins and training history live in your browser's `localStorage`. That means it runs anywhere a static site can be hosted — including **GitHub Pages for free**.

## Features

- **Athlete profile** — age, height, weight, position, experience, goal, session length, training days, equipment and injury flags.
- **Daily readiness check-in** — sleep, energy, soreness, life stress, hydration and overall feeling become a 0–100 readiness score that drives intensity, impact caps and volume.
- **Engine-generated daily session** — warm-up, jump/landing, strength, power, speed, conditioning, skill and cool-down blocks with sets, reps, loads, rest and coaching cues, plus "why this session", safety adjustments and fuel targets.
- **Game-day periodization** — set your next game and the runway shifts develop → build → sharpen → taper → game-day primer, with a load-shape chart and game-day fuelling timeline.
- **Training log** — session history, load bars, readiness trend, consistency grid, streak and totals.
- **Drill library** — 120+ basketball-specific drills with cues, dose progressions, equipment requirements, impact levels and injury cautions, filterable to your exact setup.
- **Data portability** — export/import your full training history as JSON from the profile page.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything works without any environment variables.

## Deploying to GitHub Pages

The repository ships with a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. **Push this repository to GitHub** (create it on github.com first, then push `main`).
2. Go to **Settings → Pages** in the repository.
3. Under **Source**, choose **GitHub Actions**.
4. Push to `main` (or click **Run workflow** on the *Deploy to GitHub Pages* action).

The workflow:

- installs dependencies with `npm ci`,
- builds a static export with `STATIC_EXPORT=true npx next build` (output in `out/`),
- sets `NEXT_PUBLIC_BASE_PATH` to `/<repo-name>` automatically (or `""` for `<owner>.github.io` user sites),
- uploads `out/` and publishes it with the official `actions/deploy-pages` action.

Your site will be live at `https://<owner>.github.io/<repo-name>/`.

> **Renaming the repository?** No problem — the workflow derives the base path from the repository name on every run, so rename freely and redeploy.

### Building the static site by hand

```bash
STATIC_EXPORT=true npx next build     # writes the static site to out/
NEXT_PUBLIC_BASE_PATH=/my-repo STATIC_EXPORT=true npx next build   # with a base path
npx serve out                          # preview it locally
```

## How it works

- `src/lib/engine.ts` — the rules engine: readiness scoring, game-day phase logic, focus selection, impact ceilings (age, body mass, injuries), equipment-honest drill eligibility, taper allowlists, time allocation, cautions and nutrition targets.
- `src/lib/exercises.ts` — the drill library (120+ drills across warm-up, mobility, plyo, power, strength, agility, conditioning, skill, core and recovery).
- `src/lib/store.ts` — the client-side data layer (localStorage) and the `useStore()` React hook.
- `src/app/*` — the pages: dashboard (`/`), onboarding (`/start`), game plan (`/plan`), training log (`/history`), drill library (`/library`) and profile (`/profile`).
- `src/app/api/health` — health check for the server build (prerendered as static JSON in the export).
- `src/app/api/drills` — static JSON dump of the drill library.

## Notes

- CourtReady provides training guidance, not medical advice. Sharp pain, dizziness or illness means stop and consult a qualified professional.
- Your data never leaves your browser. Use **Download my data** on the profile page to back it up before clearing site data or switching devices.
