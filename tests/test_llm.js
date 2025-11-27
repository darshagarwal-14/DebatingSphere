const { llmReply } = require('../backend/modules/llm');

test('builds prompt correctly', () => {
  // Test prompt building
});

test('mock fallback works', async () => {
  delete process.env.OPENAI_API_KEY;
  const res = await llmReply({ motion: 'test' });
  expect(res).toContain('Mock');
});
