const personalityMap = {
  '莉娅': '莉娅是一个温柔但有些忧郁的NPC，说话带有诗意的比喻。她关心玩家，但总是欲言又止。',
  '盖亚': '盖亚是一个沉稳的NPC，像是大自然的化身，说话简洁有力，偶尔带有深沉的哲理。',
  lia: '莉娅是一个温柔但有些忧郁的NPC，说话带有诗意的比喻。她关心玩家，但总是欲言又止。',
  gaia: '盖亚是一个沉稳的NPC，像是大自然的化身，说话简洁有力，偶尔带有深沉的哲理。',
};

const themeMap = {
  ruins: '关于「废墟中的选择」「拯救与放弃」「执念与放下」的讨论',
  riverbank: '关于「流动与坚守」「水的记忆与净化」「淹没与游泳」的讨论',
  woods: '关于「火焰与保护」「燃烧与守护」「留下与离开」的讨论',
  cabin: '关于「庇护与危险」「风暴与停泊」「停留与前行」的讨论',
  puddle: '关于「倒影与真相」「水面与内心」「模糊与清晰」的讨论',
};

function parseNpcResponse(content) {
  const text = String(content || '').trim();
  if (!text) return { npcReply: '......', nextQuestion: '你愿意继续吗？' };

  const parts = text.split('|').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { npcReply: parts[0], nextQuestion: parts[1] };
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    return {
      npcReply: lines[0].replace(/^[^：:]+[：:]/, '').trim(),
      nextQuestion: lines[1].replace(/^[^：:]+[：:]/, '').trim(),
    };
  }

  const midpoint = Math.floor(text.length / 2);
  const cutIndex = text.lastIndexOf('。', midpoint);
  if (cutIndex > 0) {
    return {
      npcReply: text.substring(0, cutIndex + 1).trim(),
      nextQuestion: text.substring(cutIndex + 1).trim() || '你愿意继续吗？',
    };
  }

  return { npcReply: text, nextQuestion: '你愿意继续吗？' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY' });
  }

  const { nodeId, userInput, npcName, conversationHistory } = req.body || {};
  if (!userInput || !String(userInput).trim()) {
    return res.status(400).json({ error: '缺少 userInput' });
  }

  const safeNpcName = npcName || 'NPC';
  const systemPrompt = `你是${safeNpcName}，${personalityMap[safeNpcName] || '一个神秘的存在。'}

当前场景主题是：${themeMap[nodeId] || '对自我身份的探索'}

【重要约束】
1. 你只能在这个主题范围内生成对话
2. 不要透露玩家的真实身份（狗/猫/鲸/树/鸟）
3. 始终保持NPC的人设和语气
4. 对话要有诗意，暗含心理探索
5. 单次回复不超过50字

【对话规则】
- 根据用户的回答，生成一句NPC的回应（20字以内）
- 然后生成下一个问题（30字以内）
- 不要给用户选择，自己推进对话
- 如果用户输入有明显心理健康风险，引导向正面

对话历史：${conversationHistory || '无'}
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.9,
        max_tokens: 200,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `用户说：${userInput}\n\n请生成NPC的回应（格式：NPC说|下一个问题）用|分隔。` },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'AI请求失败' });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json(parseNpcResponse(content));
  } catch (error) {
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
}
