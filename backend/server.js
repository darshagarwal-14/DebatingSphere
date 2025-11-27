const dotenv = require('dotenv');
dotenv.config();

const ELEVENLABS_KEY_PRESENT = Boolean((process.env.ELEVENLABS_API_KEY || '').trim());
if (!ELEVENLABS_KEY_PRESENT) {
  console.warn('ELEVENLABS_API_KEY missing; the app will fall back to browser speech synthesis.');
} else {
  console.log('ELEVENLABS_API_KEY detected; ElevenLabs TTS enabled.');
}
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { llmReply } = require('./modules/llm');
const { transcribe } = require('./modules/stt');
const { speak } = require('./modules/tts');
const { SessionManager } = require('./session');
const { DebateTrainer } = require('./modules/training');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/sessions', express.static(path.join(__dirname, '..', 'sessions')));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const sessionManager = new SessionManager();
const debateTrainer = new DebateTrainer();

app.post('/start', async (req, res) => {
  try {
    const { motion, side = 'auto', timeLimit = 5, tone = 'formal', skillLevel = 'professional' } = req.body;
    if (!motion || !motion.trim()) {
      return res.status(400).json({ error: 'Motion is required to start a debate.' });
    }

    const assignedSide = side === 'auto' ? (Math.random() > 0.5 ? 'pro' : 'opp') : side;
    const aiSide = assignedSide === 'pro' ? 'opp' : 'pro';

    sessionManager.reset({
      motion,
      aiSide,
      userSide: assignedSide,
      timeLimit,
      tone,
      skillLevel
    });

    let aiData = null;
    if (aiSide === 'pro') {
        aiData = await llmReply({
        motion,
        side: aiSide,
        timeLimit,
        round: 1,
        state: 'opening',
        context: [],
        tone,
        skillLevel
      });
      sessionManager.addTurn('ai', aiData);
    }

    res.json({
      turns: sessionManager.getTurns(),
      aiText: aiData ? JSON.stringify(aiData) : null,
      assignedSide
    });
  } catch (error) {
    console.error('Start debate error:', error);
    res.status(500).json({ error: error.message || 'Failed to start debate' });
  }
});

app.post('/reply', async (req, res) => {
  try {
    const { userText, audioPath = null, transcript = null, round, state } = req.body;
    if (!userText || !userText.trim()) {
      return res.status(400).json({ error: 'User text is required.' });
    }

    const meta = sessionManager.getMeta();
    if (!meta.motion) {
      return res.status(400).json({ error: 'No active debate session. Please start a new debate.' });
    }

    sessionManager.addTurn('user', userText, { audioPath, transcript });

    const aiData = await llmReply({
      motion: meta.motion,
      side: meta.aiSide,
      timeLimit: meta.timeLimit,
      context: sessionManager.getTurns(),
      round: round || sessionManager.getRound(),
      state: state || 'rebuttal',
      tone: meta.tone,
      userText,
      skillLevel: meta.skillLevel
    });

    sessionManager.addTurn('ai', aiData);
    res.json({ text: JSON.stringify(aiData) });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI response' });
  }
});

app.post('/transcribe', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const transcript = await transcribe(req.file.buffer, req.file.originalname || 'recording.webm');
    res.json({ transcript });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
});

app.post('/speak', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided for speech synthesis.' });
    }
    const result = await speak(text);
    res.json(result);
  } catch (error) {
    console.error('Speak error:', error);
    res.status(500).json({ error: 'Speech synthesis failed' });
  }
});

// Training endpoints
app.post('/feedback', async (req, res) => {
  try {
    const { type, round, motion, rating, comment, suggestion } = req.body;
    await debateTrainer.collectFeedback({ type, round, motion, rating, comment, suggestion });
    res.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ error: 'Failed to collect feedback' });
  }
});

app.get('/training-analysis', async (req, res) => {
  try {
    const analysis = await debateTrainer.analyzeFeedback();
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze feedback' });
  }
});

app.get('/export-training-data', async (req, res) => {
  try {
    const exportPath = await debateTrainer.exportTrainingData();
    res.json({ exportPath });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export training data' });
  }
});

app.listen(3001, () => console.log('Backend running on 3001'));
