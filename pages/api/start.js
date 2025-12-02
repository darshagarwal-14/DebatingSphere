import { llmReply } from '../../backend/modules/llm';
import { SessionManager } from '../../backend/session';

const sessionManager = new SessionManager();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { motion, side, tone } = req.body;
    const aiText = await llmReply({ motion, side, tone, round: 1, context: [] });
    sessionManager.addTurn('ai', aiText);
    res.status(200).json({ turns: sessionManager.getTurns(), aiText });
  } else {
    res.status(405).end();
  }
}
