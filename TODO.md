# TODO for AI Debate Partner App

## Information Gathered
- Task requires a full-stack desktop app with Electron, React frontend, Node.js backend.
- Features: Debate flow, TTS, STT, LLM, session persistence, judge mode, tests.
- Directory is empty, so create all files from scratch.
- Architecture: Electron + React + Node.js, justified in README.

## Plan
1. Create root-level files: README.md, LICENSE, package.json, main.js, preload.js, .env.example
2. Create frontend directory and files: package.json, public/index.html, src/index.js, src/App.js, src/App.css
3. Create backend directory and files: package.json, server.js, modules/llm.js, modules/stt.js, modules/tts.js, session.js
4. Create tests directory: test_llm.js
5. Create scripts directory: build.sh, Makefile
6. Update TODO after each step.

## Dependent Files
- All new files are interdependent; backend relies on modules, frontend on backend API.

## Followup Steps
- After creation, run npm install in each dir.
- Test locally with fallbacks.
- Inform user about API keys needed.

## Completed
- [x] Created all files as per plan.
- [x] Root files: README.md, LICENSE, package.json, main.js, preload.js, .env.example
- [x] Frontend: package.json, public/index.html, src/index.js, src/App.js, src/App.css
- [x] Backend: package.json, server.js, modules/llm.js, modules/stt.js, modules/tts.js, session.js
- [x] Tests: test_llm.js
- [x] Scripts: build.sh, Makefile
