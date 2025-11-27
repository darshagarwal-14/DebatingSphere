/**
 * STT module: Transcribes audio buffers using Whisper when available and
 * gracefully falls back to a mock/local response when not.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const OpenAI = require('openai');

async function transcribe(audioBuffer, filename = 'recording.webm') {
  if (!audioBuffer || !audioBuffer.length) {
    throw new Error('Empty audio buffer received for transcription');
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('Using mock STT response (no API key configured)');
    return 'Mock transcription: Speech-to-text fallback is active. Provide an OPENAI_API_KEY for real transcriptions.';
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const tempDir = path.join(os.tmpdir(), 'debate-ai-stt');
  await fs.promises.mkdir(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, `${Date.now()}-${Math.random().toString(16).slice(2)}-${filename}`);

  await fs.promises.writeFile(tempPath, audioBuffer);

  try {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1'
    });
    return response.text || 'No transcript generated.';
  } catch (error) {
    if (error.status === 429 || error.code === 'insufficient_quota') {
      console.log('OpenAI quota exceeded for STT, providing fallback message');
      return 'Mock transcription: Whisper quota exceeded. Please wait or configure an alternate STT provider.';
    }
    console.error('STT error:', error);
    throw new Error('Transcription service failed.');
  } finally {
    fs.promises.unlink(tempPath).catch(() => {});
  }
}

module.exports = { transcribe };
