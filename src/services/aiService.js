// AI服务 - NPC自由对话
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchNpcFollowUp({ nodeId, stepIndex, userInput, npcName, conversationHistory }) {
  const response = await fetch(`${API_BASE_URL}/api/npc-followup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodeId, stepIndex, userInput, npcName, conversationHistory }),
  });

  if (!response.ok) {
    throw new Error('AI对话请求失败');
  }

  const data = await response.json();
  return data;
}
