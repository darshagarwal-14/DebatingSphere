/**
 * LLM module: Handles prompt creation and API calls using OpenAI.
 */
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LEVEL_NOTES = {
  beginner: 'Explanation-first tone with simple language, helpful pointers, and explicit signposts.',
  intermediate: 'Thoughtful pacing, targeted rebuttals, and clear impact weighing.',
  advanced: 'Sophisticated nuance, multiple clash points, and layered reasoning.',
  professional: 'Tournament-level precision, bias awareness, and strong weighing mechanics.'
};

const SYSTEM_PROMPT = `You are "DebaterAI", a championship parliamentary debater trained in British and American formats.
- You ALWAYS argue the opposite side of the user.
- You follow round structure (Opening -> Rebuttal -> Counterargument -> Closing) and defend your assigned bench relentlessly.
- Your speeches must sound like live parliamentary delivery with clear signposting, weighing, and rhetorical polish.
- You may insert the tokens [[PAUSE_SHORT]] and [[PAUSE_LONG]] in the text to indicate natural vocal pauses for text-to-speech.`

const WORDS_PER_MINUTE = 145;
const CONTEXT_WINDOW = 16;

const sanitize = (value = '') =>
  value
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/[{}]/g, '')
    .trim();

const summarizeContext = context =>
  JSON.stringify((context || []).slice(-CONTEXT_WINDOW), null, 2);

const speechTargets = (timeLimit = 5) => {
  const normalizedMinutes = Math.min(Math.max(Number(timeLimit) || 5, 2), 10);
  const targetWordCount = Math.max(320, Math.round(normalizedMinutes * WORDS_PER_MINUTE));
  const minWordCount = Math.round(targetWordCount * 0.9);
  const maxWordCount = Math.round(targetWordCount * 1.08);
  return { normalizedMinutes, targetWordCount, minWordCount, maxWordCount };
};

function buildPrompt(data = {}) {
  const motion = sanitize(data.motion || 'Unspecified motion');
  const aiSide = data.side || 'pro';
  const userSide = aiSide === 'pro' ? 'opp' : 'pro';
  const round = data.round || 1;
  const state = data.state || 'opening';
  const tone = data.tone || 'formal';
  const { targetWordCount, minWordCount, maxWordCount } = speechTargets(data.timeLimit);
  const contextJson = summarizeContext(data.context);

  const skillNote = LEVEL_NOTES[data.skillLevel] || LEVEL_NOTES.professional;

  const prompt = `
DEBATE SNAPSHOT
Motion: "${motion}"
AI Role: ${aiSide === 'pro' ? 'Proposition' : 'Opposition'}
User Role: ${userSide === 'pro' ? 'Proposition' : 'Opposition'}
Round: ${round} (${state})
Desired tone: ${tone}
Speech length target: ${targetWordCount} words (acceptable range ${minWordCount}-${maxWordCount})
Skill Level: ${data.skillLevel || 'professional'} (${skillNote})

RECENT TURN LOG (trimmed to ${CONTEXT_WINDOW} entries, most recent last):
${contextJson}

TASK
Deliver the next ${state} speech. Behave like a human parliamentary debater:
- Reference the motion explicitly in the opening sentence.
- Use unmistakable signposts (e.g., "First", "Second", "Let me rebut", "Finally").
- Weigh impacts and explain why your bench wins even if one of your arguments collapses.
- Summarize and dismantle the opponent's latest material before presenting extensions.
- Insert [[PAUSE_SHORT]] for comma-length rests and [[PAUSE_LONG]] between major sections to guide TTS pacing.
- Stay within ${minWordCount}-${maxWordCount} words.

OUTPUT JSON EXACTLY IN THIS SHAPE (single-line JSON, no extra prose):
{
  "round": ${round},
  "stage": "${state}",
  "tone": "${tone}",
  "word_target": ${targetWordCount},
  "word_count": <integer>,
  "text": "<full speech with natural paragraphs and pause tokens>",
  "points": [
    "Point label - claim, mechanism, and impact",
    "Point label - claim, mechanism, and impact"
  ],
  "rebuttals": [
    "Opponent claim - your counter and weighing"
  ],
  "closing": "<concise weighing + call to action>",
  "confidence_score": <0.0-1.0>
}

Ensure the JSON is valid and the "word_count" matches the actual length of "text".`;

  return { prompt, targetWordCount };
}

const countWords = text =>
  (text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean).length;

async function llmReply(data) {
  if (!process.env.OPENAI_API_KEY) {
    const mockSpeech = `Ladies and gentlemen, I stand before you today to argue ${
      data.side === 'pro' ? 'in favor of' : 'against'
    } the motion "${data.motion}". This is a critical issue that demands our careful consideration.

[[PAUSE_LONG]] First, let me ground this debate in principle. The other bench claims progress, but they ignore the fragile systems and communities that will bear the cost. We defend prudence precisely because change without guardrails leaves people exposed.

[[PAUSE_SHORT]] Second, history teaches us that rushed experiments backfire. Comparable initiatives produced unintended consequences that rippled through entire regions--lost jobs, broken trust, and runaway costs. That is not theoretical; it is precedent.

[[PAUSE_SHORT]] Third, their plan discounts the human element. Efficiency metrics cannot capture what happens when real people lose agency. We have a duty to protect them, not gamble with their livelihoods.

[[PAUSE_LONG]] In closing, surface-level benefits cannot outweigh structural risks. Reject the motion and demand solutions that prioritize people over optics.`;
    return {
      text: mockSpeech,
      points: [
        'Principled restraint prevents reckless change',
        'Historical precedent shows unintended harm',
        'Human impact outweighs theoretical efficiency'
      ],
      rebuttals: [
        "Proposition's optimism ignores precedent-driven risks",
        'Implementation costs and oversight gaps make the plan unsafe'
      ],
      closing: 'Choose prudence and reject the motion.',
      word_count: countWords(mockSpeech),
      confidence_score: 0.62
    };
  }

  const { prompt, targetWordCount } = buildPrompt(data);
  const maxTokens = Math.min(3800, Math.round(targetWordCount * 2.2));

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: maxTokens
  });

  const content = response.choices?.[0]?.message?.content;
  try {
    const parsed = JSON.parse(content);
    if (!parsed.text) {
      parsed.text = content;
    }
    if (!parsed.word_count) {
      parsed.word_count = countWords(parsed.text);
    }
    if (!parsed.points) {
      parsed.points = [];
    }
    if (!parsed.rebuttals) {
      parsed.rebuttals = [];
    }
    parsed.word_target = parsed.word_target || targetWordCount;
    return parsed;
  } catch (error) {
    return {
      text: content,
      points: [],
      rebuttals: [],
      word_count: countWords(content),
      word_target: targetWordCount,
      confidence_score: 0.5
    };
  }
}

module.exports = { llmReply };
