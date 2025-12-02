# TODO for Adapting AI Debate Partner to Vercel

## Information Gathered
- Current project is Electron desktop app with React frontend and Node.js backend.
- Need to convert to web app deployable on Vercel.
- Vercel supports Next.js for full-stack apps with API routes.
- TTS/STT can use browser APIs directly.
- LLM calls via serverless functions.

## Plan
1. Update root package.json: Remove Electron, add Next.js.
2. Migrate frontend to Next.js structure.
3. Move backend logic to Next.js API routes (/api/).
4. Update TTS/STT to use browser APIs.
5. Remove Electron files (main.js, preload.js).
6. Update README for Vercel setup.
7. Add vercel.json if needed.

## Dependent Files
- Root package.json
- Frontend -> Next.js pages
- Backend -> API routes

## Followup Steps
- Install Next.js, run locally.
- Deploy to Vercel.
- Test web version.
