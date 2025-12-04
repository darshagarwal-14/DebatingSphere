/**
 * SessionManager: Handles turns, simple persistence, and session metadata.
 */
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS turns (id INTEGER PRIMARY KEY, speaker TEXT, text TEXT, timestamp DATETIME)');
});

class SessionManager {
  constructor(motion, side, timeLimit, skillLevel) {
    this.reset({
      motion,
      side,
      timeLimit,
      skillLevel
    });
  }

  reset(meta = {}) {
    this.turns = [];
    this.meta = {
      motion: null,
      aiSide: null,
      userSide: null,
      timeLimit: 5,
      tone: 'formal',
      skillLevel: 'professional',
      ...meta
    };
    db.run('DELETE FROM turns');
    //only take values from user input, not constant ones.
  }

  setMeta(partialMeta) {
    this.meta = { ...this.meta, ...partialMeta };
  }

  getMeta() {
    return this.meta;
  }

  addTurn(speaker, payload, extras = {}) {
    const timestamp = extras.timestamp || new Date().toISOString();
    const normalizedText = typeof payload === 'string' ? payload : (payload?.text || '');
    const turn = {
      speaker,
      text: normalizedText,
      data: typeof payload === 'object' ? payload : null,
      audioPath: extras.audioPath || null,
      transcript: extras.transcript || null,
      timestamp
    };

    this.turns.push(turn);
    db.run('INSERT INTO turns (speaker, text, timestamp) VALUES (?, ?, ?)', [speaker, normalizedText, timestamp]);
    return turn;
  }

  getTurns() {
    return [...this.turns];
  }

  getRound() {
    return Math.floor(this.turns.length / 2) + 1;
  }
}

module.exports = { SessionManager };
