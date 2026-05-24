// AI service for NPC free-form replies.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchNpcFollowUp({ nodeId, stepIndex, userInput, npcName, conversationHistory }) {
  const payload = JSON.stringify({ nodeId, stepIndex, userInput, npcName, conversationHistory });
  let lastError;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/npc-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'AI reply request failed');
      }

      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 900));
    }
  }

  throw lastError || new Error('AI reply request failed');
}
