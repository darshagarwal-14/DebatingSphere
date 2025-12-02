import { speak } from '../../backend/modules/tts';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { text } = req.body;
    const audioPath = await speak(text);
    res.status(200).json({ audioPath });
  } else {
    res.status(405).end();
  }
}
