import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

app.use(express.json());

// 每日事件生成
app.post('/api/daily-event', async (req, res) => {
  const { day, loopCount, facilitiesRepaired, memoryShards, lastDeathReason, seed } = req.body;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY' });
  }

  const systemPrompt = `你是「无限流·修复者」游戏的叙事引擎。
游戏背景：玩家是"修复者"，被困在一个无限循环的世界里。每次循环会随机生成不同的事件。
当前循环：第 ${day} 天 / 共7天 / 第 ${loopCount} 次循环 / 已修复 ${facilitiesRepaired} 个设施 / 记忆碎片: ${memoryShards}
上次死亡原因：${lastDeathReason || '这是第一次循环'}
随机种子：${seed}

风格：哥特暗黑，带有一丝希望感。叙事要有张力，每个选择都有代价。
每次回复必须包含：事件标题、事件描述、3个可选行动（用 | 分隔），以及预期的结果暗示。
`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.9,
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `生成第 ${day} 天的随机事件。要求：今天的事件应该推进剧情，揭示更多关于这个循环世界的真相，并提供有意义的3个行动选项。` },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || 'DeepSeek 请求失败' });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return res.json({ event: content });
  } catch (error) {
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// 战斗结果生成
app.post('/api/battle-result', async (req, res) => {
  const { enemyName, playerAction, playerHp, enemyHp, actionResult } = req.body;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY' });
  }

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.8,
        max_tokens: 400,
        messages: [
          { role: 'system', content: '你是战斗叙事引擎。用哥特暗黑风格描述回合制战斗结果，包括：攻击效果、伤害数值、战斗局势变化。回复要紧凑，100字以内。' },
          { role: 'user', content: `玩家对「${enemyName}」使用「${playerAction}」。\n玩家HP: ${playerHp}\n敌人HP: ${enemyHp}\n行动结果: ${actionResult}\n\n请用哥特暗黑风格描述这次战斗的结果（100字以内）。` },
        ],
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'DeepSeek 请求失败' });
    }

    const data = await response.json();
    return res.json({ narrative: data?.choices?.[0]?.message?.content || '' });
  } catch (error) {
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// 结局叙事生成
app.post('/api/ending', async (req, res) => {
  const { loopCount, daysSurvived, facilitiesRepaired, memoryShards, events } = req.body;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY' });
  }

  const isTrueEnding = facilitiesRepaired >= 3 && daysSurvived >= 7;
  const systemPrompt = isTrueEnding
    ? '你是叙事引擎。玩家完成了真结局：修复了所有3个设施，打破了循环。让修复者活下去并跳出循环。生成一个温暖但有深度的结局叙事（200字以内）。风格：哥特暗黑+一丝希望。'
    : '你是叙事引擎。玩家在循环中死亡（或未能完成修复）。生成一个悲剧但留有希望的结局叙事（200字以内）。风格：哥特暗黑，留有希望的种子。';

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.8,
        max_tokens: 500,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `循环次数: ${loopCount} / 存活天数: ${daysSurvived} / 修复设施: ${facilitiesRepaired}/3 / 记忆碎片: ${memoryShards}\n关键事件: ${events?.slice(-3).join(' → ') || '无'}\n\n生成结局叙事。` },
        ],
      }),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'DeepSeek 请求失败' });
    }

    const data = await response.json();
    return res.json({ ending: data?.choices?.[0]?.message?.content || '', isTrueEnding });
  } catch (error) {
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
});

// NPC自由对话生成
app.post('/api/npc-followup', async (req, res) => {
  const { nodeId, stepIndex, userInput, npcName, npcPersonality, questionTheme, conversationHistory } = req.body;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: '缺少 DEEPSEEK_API_KEY' });
  }

  const personalityMap = {
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

  const systemPrompt = `你是${npcName}，${personalityMap[npcName] || '一个神秘的存在。'}

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
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
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
      return res.status(response.status).json({ error: 'AI请求失败' });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';

    // 解析返回内容 - 处理各种格式
    let npcReply = '';
    let nextQuestion = '';

    // 尝试用|分割
    const parts = content.split('|').map(s => s.trim()).filter(s => s);

    if (parts.length >= 2) {
      npcReply = parts[0];
      nextQuestion = parts[1];
    } else if (parts.length === 1) {
      // 只有一个部分，检查是否有换行
      const lines = content.split('\n').filter(s => s.trim());
      if (lines.length >= 2) {
        npcReply = lines[0].replace(/^[^：：]+：/, '').trim(); // 去掉"莉娅说："这样的前缀
        nextQuestion = lines[1].trim();
      } else {
        // 尝试从句子中点分割
        const midPoint = content.length / 2;
        const cutIndex = content.lastIndexOf('。', midPoint);
        npcReply = content.substring(0, cutIndex + 1) || content;
        nextQuestion = content.substring(cutIndex + 1) || '你愿意继续吗？';
      }
    }

    return res.json({
      npcReply: npcReply || '......',
      nextQuestion: nextQuestion || '你愿意继续吗？',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Infinite Loop Game API listening on http://localhost:${PORT}`);
});