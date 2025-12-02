import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LEVEL_OPTIONS = [
  { id: 'beginner', label: 'Beginner (Learning)' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'professional', label: 'Professional' }
];

const LEVEL_DESCRIPTIONS = {
  beginner: 'Friendly, explanatory tone with speech cues.',
  intermediate: 'Balanced detail with targeted rebuttals.',
  advanced: 'Sophisticated nuance and deeper weighing.',
  professional: 'Tournament-ready precision and impact.'
};

function App() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

  const [motion, setMotion] = useState('');
  const [side, setSide] = useState('auto');
  const [timeLimit, setTimeLimit] = useState(5); // in minutes
  const [skillLevel, setSkillLevel] = useState('professional');
  const [turns, setTurns] = useState([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [assignedSide, setAssignedSide] = useState(null);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [debateStarted, setDebateStarted] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [debateState, setDebateState] = useState('opening'); // opening, rebuttal, counterargument, closing
  const [currentRound, setCurrentRound] = useState(1);
  const [ttsWarning, setTtsWarning] = useState('');

  const recorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioUrlsRef = useRef([]);
  const activeAudioRef = useRef(null);
  const utteranceRef = useRef(null);
  const animationRef = useRef(null);
  const speechIdRef = useRef(0);

  const HIGHLIGHT_STRETCH = 0.9;

  const stripPauseTokens = (text = '') =>
    text
      .replace(/\[\[PAUSE_LONG\]\]/g, ' ')
      .replace(/\[\[PAUSE_SHORT\]\]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const expandPauseTokensForSpeech = (text = '') =>
    text
      .replace(/\[\[PAUSE_LONG\]\]/g, '. . . ')
      .replace(/\[\[PAUSE_SHORT\]\]/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const resetLocalSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    audioUrlsRef.current = [];
    setTurns([]);
    setRecording(false);
    setRecordingTime(0);
    setAiSpeaking(false);
    setCurrentSpeaker(null);
    setCurrentRound(1);
    setDebateState('opening');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
      }
      window.speechSynthesis.cancel();
      audioUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      audioUrlsRef.current = [];
    };
  }, []);

  const advanceDebatePhase = () => {
    setDebateState(prev => {
      switch (prev) {
        case 'opening':
          return 'rebuttal';
        case 'rebuttal':
          return 'counterargument';
        case 'counterargument':
          return 'closing';
        default:
          return 'closing';
      }
    });
    setCurrentRound(prev => prev + 1);
  };

  const clearWordAnimation = () => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
    setIsAnimating(false);
    setCurrentWordIndex(0);
  };

  const startWordAnimation = (text, durationMs = 4000) => {
    clearWordAnimation();
    const sanitized = stripPauseTokens(text);
    const words = sanitized.split(' ').filter(Boolean);
    if (!words.length) {
      return;
    }
    setIsAnimating(true);
    setCurrentWordIndex(0);
    const interval = Math.max((durationMs / words.length) * HIGHLIGHT_STRETCH, 60);
    let index = 0;
    animationRef.current = setInterval(() => {
      index += 1;
      setCurrentWordIndex(current => (index < words.length ? index : current));
      if (index >= words.length) {
        clearWordAnimation();
      }
    }, interval);
  };

  const startDebate = async () => {
    if (!motion.trim()) {
      alert('Please enter a debate motion before starting.');
      return;
    }

    try {
      resetLocalSession();
      const response = await axios.post(`${API_BASE}/start`, {
        motion: motion.trim(),
        side,
        timeLimit,
        skillLevel
      });
      setAssignedSide(response.data.assignedSide);
      setDebateStarted(true);
      setDebateState('opening');
      setCurrentRound(1);

      if (response.data.aiText) {
        const aiData = JSON.parse(response.data.aiText);
        setTurns([{ speaker: 'ai', text: aiData.text, data: aiData, round: 1, state: 'opening' }]);
        setCurrentSpeaker('ai');
        await speak(aiData.text);
      } else {
        setCurrentSpeaker('user');
      }
    } catch (error) {
      console.error('Start debate error:', error);
      alert('Failed to start debate: ' + (error.response?.data?.error || error.message));
    }
  };

  const record = async () => {
    if (recording || aiSpeaking || currentSpeaker !== 'user') {
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    clearWordAnimation();
    setAiSpeaking(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      recorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecording(false);
        setRecordingTime(0);
        recorderRef.current = null;
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(blob);
        }
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const nextTime = prev + 1;
          if (nextTime >= timeLimit * 60) {
            stopRecord();
            alert('Time limit reached! Recording stopped.');
            return prev;
          }
          return nextTime;
        });
      }, 1000);
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Could not access microphone. Please allow microphone permissions and try again.');
    }
  };

  const stopRecord = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }
    recorder.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!audioBlob) {
      return;
    }
    processRecording(audioBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const processRecording = async blob => {
    const userBlob = blob;
    setAudioBlob(null);
    setCurrentSpeaker('ai');

    try {
      const fileName = `user-turn-${Date.now()}.webm`;
      const formData = new FormData();
      formData.append('file', userBlob, fileName);
      const { data } = await axios.post(`${API_BASE}/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const userText = (data.transcript || '').trim() || '[No speech detected]';
      const objectUrl = URL.createObjectURL(userBlob);
      audioUrlsRef.current.push(objectUrl);

      const timestamp = new Date().toISOString();
      const userTurn = {
        speaker: 'user',
        text: userText,
        audioUrl: objectUrl,
        round: currentRound,
        state: debateState,
        timestamp
      };

      setTurns(prev => [...prev, userTurn]);

      const aiResponse = await axios.post(`${API_BASE}/reply`, {
        userText,
        round: currentRound,
        state: debateState,
        transcript: userText,
        skillLevel
      });

      const aiData = JSON.parse(aiResponse.data.text);
      const aiTurn = {
        speaker: 'ai',
        text: aiData.text,
        data: aiData,
        round: currentRound,
        state: debateState,
        timestamp: new Date().toISOString()
      };
      setTurns(prev => [...prev, aiTurn]);
      await speak(aiData.text);
      advanceDebatePhase();
    } catch (error) {
      console.error('Recording or transcription failed:', error);
      alert('Recording or transcription failed. Please try again.');
      setCurrentSpeaker('user');
    }
  };

  const playRemoteAudio = (url, text) =>
    new Promise(resolve => {
      clearWordAnimation();
      const audio = new Audio(`${url}?v=${Date.now()}`);
      activeAudioRef.current = audio;

      audio.onloadedmetadata = () => {
        const duration = (audio.duration || 5) * 1000 * HIGHLIGHT_STRETCH;
        startWordAnimation(stripPauseTokens(text), duration);
      };

      audio.onerror = () => {
        activeAudioRef.current = null;
        resolve();
      };

      audio.onended = () => {
        activeAudioRef.current = null;
        resolve();
      };

      audio.play().catch(() => {
        activeAudioRef.current = null;
        resolve();
      });
    });

  const speakWithBrowserTts = text =>
    new Promise(resolve => {
      const cleanTimingText = stripPauseTokens(text);
      if (!text || !cleanTimingText) {
        resolve();
        return;
      }
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      clearWordAnimation();
      const vocalText = expandPauseTokensForSpeech(text);
      const utterance = new SpeechSynthesisUtterance(vocalText);
      utterance.rate = 1.5;
      utterance.pitch = 1.08;
      utterance.volume = 0.9;
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => voice.lang.startsWith('en'));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.onend = () => {
        utteranceRef.current = null;
        resolve();
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        resolve();
      };
      utteranceRef.current = utterance;
      const estimatedDuration = Math.max(cleanTimingText.split(' ').length * 420, 1400) * HIGHLIGHT_STRETCH;
      startWordAnimation(cleanTimingText, estimatedDuration);
      window.speechSynthesis.speak(utterance);
    });

  const speak = async payload => {
    if (aiSpeaking) {
      return;
    }
    const speechText = typeof payload === 'string' ? payload : payload?.text || '';
    if (!speechText) {
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    clearWordAnimation();

    setAiSpeaking(true);
    setCurrentSpeaker('ai');
    setCurrentWordIndex(0);
    setTtsWarning('');
    const speechToken = ++speechIdRef.current;

    try {
      const { data } = await axios.post(`${API_BASE}/speak`, { text: speechText });
      const playbackText = (data.textForSpeech || data.text || speechText).trim();
      setTtsWarning(data.warning || '');
      if (data.type === 'file' && data.audioUrl) {
        await playRemoteAudio(`${API_BASE}${data.audioUrl}`, playbackText);
      } else {
        await speakWithBrowserTts(playbackText);
      }
    } catch (error) {
      console.error('TTS failed:', error);
      setTtsWarning('');
      await speakWithBrowserTts(speechText);
    } finally {
      if (speechIdRef.current === speechToken) {
        clearWordAnimation();
        setAiSpeaking(false);
        setCurrentSpeaker('user');
      }
    }
  };

  const renderAnimatedText = (text, isActive) => {
    const clean = stripPauseTokens(text);
    if (!isActive || !isAnimating) {
      return clean || text || '';
    }
    if (!clean) return '';
    const words = clean.split(' ');
    return words.map((word, index) => (
      <span
        key={`${word}-${index}`}
        className={index === currentWordIndex ? 'highlight' : 'word'}
      >
        {word}{' '}
      </span>
    ));
  };

  return (
    <div className="App">
      <div className="header">
        <h1>AI Debate Partner</h1>
        {ttsWarning && (
          <div className="tts-warning" role="status" aria-live="polite">
            {ttsWarning}
          </div>
        )}
        <div className="setup-panel">
          <div className="form-group">
            <label>Debate Motion</label>
            <input
              value={motion}
              onChange={e => setMotion(e.target.value)}
              placeholder="Enter your debate topic..."
            />
          </div>
          <div className="form-group">
            <label>Your Side</label>
            <select value={side} onChange={e => setSide(e.target.value)}>
              <option value="auto">Auto Assign Side</option>
              <option value="pro">Proposition</option>
              <option value="opp">Opposition</option>
            </select>
          </div>
          <div className="form-group">
            <label>Speech Time Limit (minutes)</label>
            <select value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value))}>
              <option value={3}>3 minutes</option>
              <option value={5}>5 minutes</option>
              <option value={7}>7 minutes</option>
              <option value={10}>10 minutes</option>
            </select>
          </div>
          <div className="form-group">
            <label>AI Skill Level</label>
            <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
              {LEVEL_OPTIONS.map(level => (
                <option key={level.id} value={level.id}>
                  {level.label}
                </option>
              ))}
            </select>
            <p className="level-description">{LEVEL_DESCRIPTIONS[skillLevel]}</p>
          </div>
          <button className="start-button" onClick={startDebate}>Start Debate</button>
        </div>
      </div>

      {debateStarted && (
        <div className="debate-info">
          <div className="info-item">
            <h3>Motion</h3>
            <p>{motion}</p>
          </div>
          <div className="info-item">
            <h3>Your Side</h3>
            <p>{side === 'auto' ? (assignedSide === 'pro' ? 'Proposition' : 'Opposition') : side === 'pro' ? 'Proposition' : 'Opposition'}</p>
          </div>
          <div className="info-item">
            <h3>Speech Time Limit</h3>
            <p>{timeLimit} minutes</p>
          </div>
        </div>
      )}

      <div className="chat-container">
        <div className="chat">
          {turns.map((turn, i) => {
            const isLatestAI = turn.speaker === 'ai' && i === turns.length - 1;
            return (
              <div key={`${turn.speaker}-${i}`} className={`turn ${turn.speaker}`}>
                <div className="speaker-indicator">
                  {turn.speaker === 'ai' ? 'AI' : 'You'}
                </div>
                <p className={isLatestAI && isAnimating ? 'animated-text' : ''}>
                  {renderAnimatedText(turn.text, isLatestAI)}
                </p>
                {turn.speaker === 'user' && turn.audioUrl && (
                  <audio controls src={turn.audioUrl} aria-label="Your recorded reply" />
                )}
              </div>
            );
          })}
          {aiSpeaking && <div className="ai-speaking">AI is speaking...</div>}
        </div>
      </div>

      <div className="controls">
        {currentSpeaker === 'user' && !aiSpeaking && !debateStarted && (
          <div className="instruction-message">
            Press the "Record Response" button to start recording your speech.
          </div>
        )}
        {currentSpeaker === 'user' && !aiSpeaking && debateStarted && (
          <>
            <div className="turn-indicator">
              <h3>Your Turn - {debateState.charAt(0).toUpperCase() + debateState.slice(1)} Speech</h3>
              <p>Round {currentRound} | Time Limit: {timeLimit} minutes</p>
            </div>
            <button
              className={`record-button ${recording ? 'recording' : ''}`}
              onClick={record}
              disabled={recording}
            >
              {recording ? (
                <>
                  Recording ({Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')})
                  <div className="audio-visualizer" aria-hidden="true">
                    <div className="audio-bar"></div>
                    <div className="audio-bar"></div>
                    <div className="audio-bar"></div>
                    <div className="audio-bar"></div>
                    <div className="audio-bar"></div>
                  </div>
                </>
              ) : (
                'Record Response'
              )}
            </button>
            <button className="stop-button" onClick={stopRecord} disabled={!recording}>
              Stop &amp; Submit
            </button>
          </>
        )}
        {currentSpeaker === 'ai' && <div className="waiting-message">AI is preparing its response...</div>}
        {aiSpeaking && <div className="waiting-message">AI is speaking...</div>}
      </div>
    </div>
  );
}

export default App;
