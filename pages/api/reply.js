import { llmReply } from '../../backend/modules/llm';
import { SessionManager } from '../../backend/session';

const sessionManager = new SessionManager();

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { userText, turns } = req.body;
    sessionManager.addTurn('user', userText);
    const aiText = await llmReply({ ...req.body, round: sessionManager.getRound() });
    sessionManager.addTurn('ai', aiText);
    res.status(200).json({ text: aiText });
  } else {
    res.status(405).end();
  }
}
