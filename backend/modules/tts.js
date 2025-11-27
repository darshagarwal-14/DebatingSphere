/**
 * TTS module: Provides a consistent interface that favors ElevenLabs when an API
 * key is available and falls back to browser-based SpeechSynthesis on the client.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'sessions', 'ai');
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
if (ELEVENLABS_KEY) {
  console.log('ElevenLabs key loaded in TTS module.');
} else {
  console.warn('ElevenLabs key missing in TTS module; re-check backend/.env');
}
const HAS_ELEVEN_KEY = Boolean(ELEVENLABS_KEY);

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ELEVEN_SETTINGS = {
  stability: toNumber(process.env.ELEVENLABS_STABILITY, 0.38),
  similarity_boost: toNumber(process.env.ELEVENLABS_SIMILARITY, 0.9),
  style: toNumber(process.env.ELEVENLABS_STYLE, 0.65),
  use_speaker_boost: true
};

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

const normalizeForSpeech = (text = '') =>
  text
    .replace(/\r?\n\s*\r?\n/g, ' [[PAUSE_LONG]] ')
    .replace(/\r?\n/g, ' ')
    .replace(/\[\[PAUSE_LONG\]\]/gi, '. ')
    .replace(/\[\[PAUSE_SHORT\]\]/gi, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();

async function synthesizeWithElevenLabs(text, voiceId = DEFAULT_VOICE_ID) {
  if (!HAS_ELEVEN_KEY) {
    throw new Error('ElevenLabs API key missing.');
  }
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: ELEVEN_SETTINGS
    },
    {
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_KEY
      },
      responseType: 'arraybuffer',
      timeout: 20000
    }
  );

  ensureOutputDir();
  const filename = `ai-speech-${Date.now()}.mp3`;
  const audioPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(audioPath, response.data);
  return path.join('/sessions/ai', filename);
}

async function speak(text, options = {}) {
  const prepared = normalizeForSpeech(text);
  if (!prepared) {
    throw new Error('No text provided for speech synthesis.');
  }

  const MAX_LENGTH = 4800;
  const payloadText = prepared.length > MAX_LENGTH
    ? `${prepared.slice(0, MAX_LENGTH)}...`
    : prepared;

  const warning = !HAS_ELEVEN_KEY
    ? 'ElevenLabs key missing. Please configure ELEVENLABS_API_KEY.'
    : null;

  if (HAS_ELEVEN_KEY) {
    try {
      const audioUrl = await synthesizeWithElevenLabs(payloadText, options.voiceId);
      return { type: 'file', audioUrl, textForSpeech: prepared, warning };
    } catch (error) {
      const status = error.response?.status;
      let data = error.response?.data;
      if (Buffer.isBuffer(data)) {
        const json = data.toString('utf8');
        try {
          data = JSON.parse(json);
        } catch (err) {
          console.warn('Unable to parse ElevenLabs response buffer', json);
        }
      }
      const message = data?.detail || data?.message || error.message;
      console.error('ElevenLabs TTS request failed', { status, message, data });
      return {
        type: 'text',
        text: prepared,
        textForSpeech: prepared,
        warning: status === 401
          ? 'ElevenLabs key rejected (401). Check your key and permissions.'
          : 'Failed to synthesize via ElevenLabs; using browser TTS.'
      };
    }
  }

  // Fall back to browser SpeechSynthesis handled on the client.
  return { type: 'text', text: prepared, textForSpeech: prepared, warning };
}

module.exports = { speak };
