const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

const personalityMap = {
  '莉娅': '莉娅温柔、忧郁，像守着火光的人。她会用诗意但克制的话回应玩家。',
  '盖亚': '盖亚沉稳、冷静，像灾难现场里的引路人。他说话简洁，有自然与命运的隐喻。',
};

const themeMap = {
  ruins: '废墟、拯救、选择与失去',
  riverbank: '河流、净化、沉没与渡过',
  woods: '枯树林、火焰、保护与离开',
  cabin: '小屋、庇护、风暴与停留',
  puddle: '水坑、倒影、真相与自我',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'Missing DEEPSEEK_API_KEY' });
  }

  const { nodeId, stepIndex, userInput, npcName, conversationHistory } = req.body || {};
  const npc = npcName || 'NPC';

  const systemPrompt = [
    `你是互动叙事游戏《第139次崩塌》中的 NPC：${npc}。`,
    `人物设定：${personalityMap[npc] || '你神秘、克制，会引导玩家继续面对内心真相。'}`,
    `当前场景主题：${themeMap[nodeId] || '灾难、记忆、自我身份'}`,
    '你只能回应玩家刚才的自由发言，不要提前揭示玩家最终身份。',
    '回复必须短，20到45个中文字符，像 NPC 在剧情中说的一句话。',
    '不要输出选项，不要解释规则，不要使用 Markdown。',
    `当前是该场景第 ${Number(stepIndex || 0) + 1} 个问题。`,
    conversationHistory ? `对话历史：${conversationHistory}` : '',
  ].filter(Boolean).join('\n');

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.82,
        max_tokens: 120,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: String(userInput || '').slice(0, 400) },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'DeepSeek request failed' });
    }

    const data = await response.json();
    const npcReply = data?.choices?.[0]?.message?.content?.trim() || '你的回答让空气安静了一瞬。';
    return res.status(200).json({ npcReply });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
