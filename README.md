# AI Debate Partner

## Architecture Decision
I chose a cross-platform desktop app using Electron with a React frontend and Node.js backend. This leverages web technologies for a modern UI and browser APIs for TTS/STT fallbacks, while Electron provides native desktop packaging and offline capabilities. Pros: Cross-platform, easy audio integration, local runnability. Cons: Larger than pure web, but suitable for desktop features like audio recording.

## Local Setup
1. Clone the repo.
2. Install dependencies: `npm install` in root, then `cd frontend && npm install`, `cd backend && npm install`.
3. Set up env: Copy `.env.example` to `.env`, add API keys if desired.
4. Run dev: `npm run dev` (starts backend and frontend, then Electron).
5. For testing without keys: App uses fallbacks (mock LLM, browser TTS/STT).

## Running
- Dev: `npm run dev`
- Prod: `npm run build && npm run dist` (creates executable).

## Packaging
Use `npm run dist` to build for your platform (Windows/macOS/Linux).

## API Keys
Optional: OPENAI_API_KEY, ELEVENLABS_API_KEY, etc. See .env.example.

## Testing Fallbacks
Without keys, LLM returns mock responses, TTS uses browser SpeechSynthesis, STT uses Web Speech API.

## License
MIT
