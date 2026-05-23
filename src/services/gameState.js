// 游戏状态管理

export const FACILITIES = [
  { id: 'core', name: '核心枢纽', description: '控制整个循环世界的能量核心', cost: 5 },
  { id: 'bridge', name: '时空桥梁', description: '连接不同时空碎片的桥梁', cost: 5 },
  { id: 'altar', name: '修复祭坛', description: '用记忆碎片修复世界的祭坛', cost: 5 },
];

export const ENEMIES = [
  { id: 'warden', name: '循环守卫', hp: 30, damage: 8, description: '维护循环秩序的机械士兵' },
  { id: 'shadow', name: '阴影猎手', hp: 20, damage: 12, description: '在时空中潜伏的猎杀者' },
  { id: 'echo', name: '回声幽魂', hp: 15, damage: 6, description: '死在这个循环中的亡魂' },
  { id: 'fractal', name: '碎片怪', hp: 40, damage: 5, description: '循环崩溃时产生的碎片生物' },
];

export const ITEMS = [
  { id: 'medkit', name: '修复剂', effect: 'heal', value: 20, description: '恢复20点生命值' },
  { id: 'shard', name: '记忆碎片', effect: 'shard', value: 2, description: '增加2个记忆碎片' },
  { id: 'key', name: '钥匙', effect: 'key', value: 1, description: '开启锁住的门' },
];

export function createInitialState(playerName) {
  return {
    playerName,
    loopCount: 1,
    day: 1,
    phase: 'awakening', // awakening | day | battle | event | night | ending
    hp: 100,
    maxHp: 100,
    memoryShards: 0,
    facilitiesRepaired: [],
    currentEnemy: null,
    currentEvent: null,
    eventHistory: [],
    battleLog: [],
    gameOver: false,
    trueEnding: false,
    lastDeathReason: null,
    seed: Math.floor(Math.random() * 10000),
    aiEventText: '',
    aiEndingText: '',
  };
}

export function createEnemy(enemyDef, level = 1) {
  return {
    ...enemyDef,
    hp: enemyDef.hp + level * 5,
    maxHp: enemyDef.hp + level * 5,
    level,
  };
}

export function processDayEnd(state) {
  // 结算今天的事件，奖励记忆碎片
  const shardsEarned = Math.floor(Math.random() * 3) + 1;
  return {
    ...state,
    memoryShards: state.memoryShards + shardsEarned,
    day: state.day + 1,
    phase: state.day >= 7 ? 'ending' : 'awakening',
    aiEventText: '',
  };
}

export function processLoopEnd(state) {
  // 循环结束，判断是否通关
  if (state.facilitiesRepaired.length >= 3) {
    return {
      ...state,
      gameOver: true,
      trueEnding: true,
      phase: 'ending',
    };
  }
  // 未完成，循环重来
  return {
    ...state,
    loopCount: state.loopCount + 1,
    day: 1,
    phase: 'awakening',
    hp: 100,
    lastDeathReason: state.aiEventText || '未能在7天内修复所有设施',
    seed: Math.floor(Math.random() * 10000),
    facilitiesRepaired: state.facilitiesRepaired, // 保留已修复设施
    eventHistory: [],
    aiEventText: '',
    aiEndingText: '',
  };
}

export function repairFacility(state, facilityId) {
  const facility = FACILITIES.find(f => f.id === facilityId);
  if (!facility || state.facilitiesRepaired.includes(facilityId)) {
    return { success: false, reason: '设施已修复或不存在' };
  }
  if (state.memoryShards < facility.cost) {
    return { success: false, reason: `需要${facility.cost}个记忆碎片，当前有${state.memoryShards}个` };
  }
  return {
    success: true,
    state: {
      ...state,
      memoryShards: state.memoryShards - facility.cost,
      facilitiesRepaired: [...state.facilitiesRepaired, facilityId],
    },
    facility,
  };
}

export function takeDamage(state, damage) {
  const newHp = Math.max(0, state.hp - damage);
  return {
    ...state,
    hp: newHp,
    gameOver: newHp <= 0,
    lastDeathReason: `被击败：生命值归零`,
  };
}