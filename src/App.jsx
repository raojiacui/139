import { useEffect, useMemo, useState } from 'react';
import { fetchNpcFollowUp } from './services/aiService';
import './App.css';

const SAVE_KEY = 'infinite-loop-game-progress-v1';
const defaultScores = { dog: 0, cat: 0, whale: 0, tree: 0, bird: 0 };

const NODES = [
  { id: 'ruins', icon: '1', title: '废墟', risk: '坍塌风险', x: 16, y: 67, npc: 'lia' },
  { id: 'riverbank', icon: '2', title: '河边', risk: '洪水风险', x: 32, y: 43, npc: 'gaia' },
  { id: 'woods', icon: '3', title: '枯树林', risk: '火灾风险', x: 50, y: 63, npc: 'gaia' },
  { id: 'cabin', icon: '4', title: '小屋', risk: '暴风风险', x: 67, y: 38, npc: 'lia' },
  { id: 'puddle', icon: '5', title: '水坑', risk: '反转关键地点', x: 84, y: 58, npc: 'gaia' },
];

const NPCS = {
  lia: { name: '莉娅', image: '/lia.png', fallback: '莉' },
  gaia: { name: '盖亚', image: '/gaia.png', fallback: '盖' },
};

const introLines = [
  '尘梦翻覆，往昔尽数尘封',
  '一朝重生归来，记忆化作朦胧云烟',
  '你遗失了过往悲欢，辨不清前路归途',
  '唯有一道执念刻骨长存',
  '冥冥之中宿命低语',
  '你身负救世主之名',
];

const scripts = {
  ruins: [
    q('lia', '废墟里有两个人，你只能先救一个。你怎么选？', [['先救离得近的', 'dog'], ['先判断谁更有生还机会', 'cat'], ['先听废墟里的回声', 'whale']]),
    q('lia', '另一个人可能会恨你，你还会做选择吗？', [['会，但我还是要救', 'dog'], ['我不该替他们决定', 'cat'], ['恨意也会成为回声', 'whale']]),
    q('gaia', '房子塌了，先修哪里才能让人活过今晚？', [['先修承重梁', 'tree'], ['先堵住进风口', 'cat'], ['先找还亮着的灯', 'bird']]),
    q('lia', '如果下一轮还会塌，你还回来吗？', [['回来，直到救到为止', 'dog'], ['如果回来有意义', 'cat'], ['我不知道怎么离开', 'tree']]),
  ],
  riverbank: [
    q('gaia', '洪水来之前，你要先做什么？', [['带人去高处', 'bird'], ['确认谁还没撤离', 'dog'], ['听水下有没有断裂声', 'whale']]),
    q('lia', '只能带走一个人时，你会带谁？', [['最害怕的人', 'dog'], ['最能活下来的人', 'cat'], ['还在呼救的人', 'whale']]),
    q('gaia', '水源被污染了，你怎么净化？', [['过滤煮沸再分给大家', 'tree'], ['先自己试一口', 'dog'], ['等沉淀后看清杂质', 'cat']]),
    q('gaia', '如果这条河其实是你心里的水呢？', [['它已经淹过我很多次', 'whale'], ['我会筑一道堤', 'tree'], ['我会游过去', 'bird']]),
  ],
  woods: [
    q('gaia', '火从东边来了，你带着三个人往哪里跑？', [['往上风处跑', 'bird'], ['先找水源', 'whale'], ['让大家靠近我', 'dog']]),
    q('lia', '有人不肯离开火场，你怎么办？', [['拉着他走', 'dog'], ['告诉后果让他自己选', 'cat'], ['站在原地陪他一会儿', 'tree']]),
    q('gaia', '火烧来之前，你能先做什么？', [['清出隔离带', 'tree'], ['爬到高处观察风向', 'cat'], ['呼喊所有人离开', 'bird']]),
    q('lia', '火灭了，你还在发抖。你怕什么？', [['怕再也救不回来', 'dog'], ['怕自己其实不难过', 'cat'], ['怕这里根本不是树林', 'tree']]),
  ],
  cabin: [
    q('lia', '暴风来了，小屋只能容下几个人，你让谁先进来？', [['最弱的人', 'dog'], ['按人数和位置安排', 'cat'], ['围着炉火坐下', 'tree']]),
    q('gaia', '屋顶裂开了，先补哪里？', [['上方最大的洞', 'bird'], ['雨会流进床铺的位置', 'dog'], ['支撑屋顶的梁', 'tree']]),
    q('lia', '如果有一天不再回来，你会去哪？', [['没有灾难的地方', 'bird'], ['哪里都不去，就在这里', 'tree'], ['回到那个人身边', 'dog']]),
    q('gaia', '你心里的裂缝，打算什么时候补？', [['等世界安全以后', 'dog'], ['等我不再需要别人', 'cat'], ['现在', 'tree']]),
  ],
  puddle: [
    q('gaia', '你救了很多人，可世界还在崩坏。为什么？', [['因为世界还在求救', 'whale'], ['因为我还不够努力', 'dog'], ['也许世界本来就救不了', 'cat']]),
    q('gaia', '你从来没有救过自己。低头看看吧。', [['低头看水坑', 'whale'], ['转身离开', 'cat'], ['问：我到底是谁？', 'tree']]),
    q('lia', '如果世界只是你的内心呢？', [['我一直在修补伤口', 'tree'], ['我一直在找回他', 'dog'], ['我一直在听自己的回声', 'whale']]),
    q('gaia', '这一次可以离开循环，你愿意先救谁？', [['我自己', 'tree'], ['还是先救他们', 'dog'], ['我不知道', 'cat']]),
  ],
};

function q(speaker, line, choices) {
  return {
    speaker,
    line,
    choices: choices.map(([text, identity]) => ({
      text,
      identity,
      reply: `${NPCS[speaker]?.name || 'NPC'}记住了你的选择。`,
    })),
  };
}

const identityCreatures = {
  dog: { label: '狗', image: '/identity-dog.png', action: '狗汪汪地跳了起来。' },
  cat: { label: '猫', image: '/identity-cat.png', action: '猫喵喵地摇了摇尾巴，在你身边走来走去。' },
  tree: { label: '树', image: '/identity-tree.jpg', action: '树的枝叶轻轻舒展，像终于扎下了根。' },
  bird: { label: '鸟', image: '/identity-bird.png', action: '鸟振翅飞翔，掠过河面。' },
  whale: { label: '鲸鱼', image: '/identity-whale.png', action: '鲸鱼在水光里缓慢游动，发出深处的回响。' },
};

const finaleDisplayLines = [
  '乱世倾颓，苍生待挽',
  '此番踏遍山河，破开迷雾',
  '只为寻回故人，倾覆危难，护这世间安稳',
];

const MINI_GAMES = ['snake', 'poemLine', 'maze'];
const DIFFICULTY_LABELS = ['易', '中', '难'];

function resolveIdentity(scores, miniStats) {
  const adjusted = { ...defaultScores, ...scores };
  miniStats.forEach((stat) => {
    if (stat.time <= 5) adjusted.dog += 1;
    else if (stat.time <= 8) adjusted.cat += 1;
    else adjusted.tree += 1;
    if (stat.misses === 0) adjusted.bird += 1;
    if (stat.misses >= 2) adjusted.whale += 1;
  });
  return Object.entries(adjusted).sort((a, b) => b[1] - a[1])[0][0];
}

function randomFood(snake, boardSize) {
  const occupied = new Set(snake.map((part) => `${part.x},${part.y}`));
  const cells = [];
  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) cells.push({ x, y });
    }
  }
  return cells[Math.floor(Math.random() * cells.length)] || { x: 0, y: 0 };
}

function MiniGame({ level, gameType, onComplete, onBack }) {
  if (gameType === 'poemLine') return <PoemLineGame level={level} onComplete={onComplete} onBack={onBack} />;
  if (gameType === 'maze') return <MazeGame level={level} onComplete={onComplete} onBack={onBack} />;
  return <SnakeGame level={level} onComplete={onComplete} onBack={onBack} />;
}

function SnakeGame({ level, onComplete, onBack }) {
  const boardSize = 10;
  const targetFood = [2, 3, 4][level];
  const [snake, setSnake] = useState([{ x: 4, y: 5 }, { x: 3, y: 5 }]);
  const [food, setFood] = useState({ x: 7, y: 5 });
  const [direction, setDirection] = useState({ x: 1, y: 0 });
  const [eaten, setEaten] = useState(0);
  const [misses, setMisses] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startedAt] = useState(() => performance.now());

  useEffect(() => {
    if (finished) return undefined;
    const timer = window.setInterval(() => {
      setSnake((current) => {
        const next = { x: current[0].x + direction.x, y: current[0].y + direction.y };
        const crashed = next.x < 0 || next.y < 0 || next.x >= boardSize || next.y >= boardSize || current.some((part) => part.x === next.x && part.y === next.y);
        if (crashed) {
          setMisses((value) => value + 1);
          return [{ x: 4, y: 5 }, { x: 3, y: 5 }];
        }
        const nextSnake = [next, ...current];
        if (next.x === food.x && next.y === food.y) {
          const nextEaten = eaten + 1;
          setEaten(nextEaten);
          setFood(randomFood(nextSnake, boardSize));
          if (nextEaten >= targetFood) {
            setFinished(true);
            const time = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
            window.setTimeout(() => onComplete({ gameType: 'snake', level, success: true, time, misses }), 180);
          }
          return nextSnake;
        }
        nextSnake.pop();
        return nextSnake;
      });
    }, [520, 420, 330][level]);
    return () => window.clearInterval(timer);
  }, [direction, eaten, finished, food, level, misses, onComplete, startedAt]);

  function turn(nextDirection) {
    if (direction.x + nextDirection.x === 0 && direction.y + nextDirection.y === 0) return;
    setDirection(nextDirection);
  }

  return (
    <section className="mini-overlay">
      <button className="back-btn mini-back-btn" onClick={onBack}>返回</button>
      <div className="mini-card">
        <p>突发修复小游戏</p>
        <h2>贪吃蛇：吞下记忆光点</h2>
        <span>难度：{DIFFICULTY_LABELS[level]}。吃到 {targetFood} 个光点即可继续，撞墙只会重置并计入失误。</span>
        <div className="snake-board" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
          {Array.from({ length: boardSize * boardSize }, (_, index) => {
            const x = index % boardSize;
            const y = Math.floor(index / boardSize);
            const isSnake = snake.some((part) => part.x === x && part.y === y);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;
            return <span key={index} className={`${isSnake ? 'snake-cell' : ''} ${isHead ? 'snake-head' : ''} ${isFood ? 'snake-food' : ''}`} />;
          })}
        </div>
        <div className="snake-controls">
          <button onClick={() => turn({ x: 0, y: -1 })}>上</button>
          <button onClick={() => turn({ x: -1, y: 0 })}>左</button>
          <button onClick={() => turn({ x: 1, y: 0 })}>右</button>
          <button onClick={() => turn({ x: 0, y: 1 })}>下</button>
        </div>
        <small>已吞下 {eaten}/{targetFood} · 失误 {misses}</small>
      </div>
    </section>
  );
}

const POEM_QUESTIONS = [
  { prompt: '山重水复疑无路', answer: '柳暗花明又一村', options: ['柳暗花明又一村', '春风不度玉门关', '孤帆远影碧空尽', '一片冰心在玉壶'] },
  { prompt: '海内存知己', answer: '天涯若比邻', options: ['天涯若比邻', '江清月近人', '千里共婵娟', '故人西辞黄鹤楼'] },
  { prompt: '沉舟侧畔千帆过', answer: '病树前头万木春', options: ['病树前头万木春', '长风破浪会有时', '直挂云帆济沧海', '映日荷花别样红'] },
];

function PoemLineGame({ level, onComplete, onBack }) {
  const question = useMemo(() => POEM_QUESTIONS[Math.floor(Math.random() * POEM_QUESTIONS.length)], []);
  const options = useMemo(() => question.options.slice(0, [2, 3, 4][level]), [level, question]);
  const [misses, setMisses] = useState(0);
  const [startedAt] = useState(() => performance.now());

  function choose(line) {
    const correct = line === question.answer;
    const nextMisses = correct ? misses : misses + 1;
    if (correct || nextMisses >= [2, 2, 1][level]) {
      const time = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      window.setTimeout(() => onComplete({ gameType: 'poemLine', level, success: correct, time, misses: nextMisses }), 220);
    } else setMisses(nextMisses);
  }

  return (
    <section className="mini-overlay">
      <button className="back-btn mini-back-btn" onClick={onBack}>返回</button>
      <div className="mini-card">
        <p>突发修复小游戏</p>
        <h2>古诗接下一句</h2>
        <span>难度：{DIFFICULTY_LABELS[level]}。选出最合适的下一句。</span>
        <div className="poem-prompt"><small>上一句</small><strong>{question.prompt}</strong></div>
        <div className="poem-options">{options.map((line) => <button key={line} onClick={() => choose(line)}>{line}</button>)}</div>
        <small>失误 {misses}</small>
      </div>
    </section>
  );
}

const MAZE_LAYOUTS = [
  ['S....', '.###.', '...#.', '.#...', '...#E'],
  ['S..#..', '##.#.#', '...#.#', '.###.#', '.....E', '.####.'],
  ['S..#...', '##.#.#.', '...#.#.', '.###.#.', '.#...#.', '.#.###.', '...#..E'],
];

function MazeGame({ level, onComplete, onBack }) {
  const layout = MAZE_LAYOUTS[level];
  const size = layout.length;
  const [player, setPlayer] = useState({ x: 0, y: 0 });
  const [misses, setMisses] = useState(0);
  const [startedAt] = useState(() => performance.now());

  function move(dx, dy) {
    const next = { x: player.x + dx, y: player.y + dy };
    const cell = layout[next.y]?.[next.x];
    if (!cell || cell === '#') {
      setMisses((value) => value + 1);
      return;
    }
    setPlayer(next);
    if (cell === 'E') {
      const time = Math.max(1, Math.round((performance.now() - startedAt) / 1000));
      window.setTimeout(() => onComplete({ gameType: 'maze', level, success: true, time, misses }), 220);
    }
  }

  return (
    <section className="mini-overlay">
      <button className="back-btn mini-back-btn" onClick={onBack}>返回</button>
      <div className="mini-card">
        <p>突发修复小游戏</p>
        <h2>迷雾小迷宫</h2>
        <span>难度：{DIFFICULTY_LABELS[level]}。从起点走到出口，撞墙会计入失误。</span>
        <div className="maze-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {layout.flatMap((row, y) => row.split('').map((cell, x) => (
            <span key={`${x}-${y}`} className={`${cell === '#' ? 'maze-wall' : ''} ${cell === 'E' ? 'maze-exit' : ''} ${player.x === x && player.y === y ? 'maze-player' : ''}`} />
          )))}
        </div>
        <div className="maze-controls">
          <button onClick={() => move(0, -1)}>上</button>
          <button onClick={() => move(-1, 0)}>左</button>
          <button onClick={() => move(1, 0)}>右</button>
          <button onClick={() => move(0, 1)}>下</button>
        </div>
        <small>位置 {player.x + 1},{player.y + 1} · 撞墙 {misses}</small>
      </div>
    </section>
  );
}

function createTargets(count) {
  return Array.from({ length: count }, (_, index) => ({ id: index, x: 12 + Math.random() * 76, y: 16 + Math.random() * 68 }));
}

function evaluateNextLevel(currentLevel, stat) {
  const strong = stat.success && stat.time <= [5, 7, 9][currentLevel] && stat.misses === 0;
  const weak = !stat.success || stat.misses >= 2 || stat.time >= [10, 12, 14][currentLevel];
  if (strong) return Math.min(2, currentLevel + 1);
  if (weak) return Math.max(0, currentLevel - 1);
  return currentLevel;
}

function loadSavedProgress() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function App() {
  const [savedProgress] = useState(() => loadSavedProgress());
  const [screen, setScreen] = useState(() => savedProgress?.screen || 'intro');
  const [introIndex, setIntroIndex] = useState(() => savedProgress?.introIndex ?? -1);
  const [activeNode, setActiveNode] = useState(() => NODES.find((node) => node.id === savedProgress?.activeNodeId) || null);
  const [stepIndex, setStepIndex] = useState(() => savedProgress?.stepIndex || 0);
  const [scores, setScores] = useState(() => savedProgress?.scores || defaultScores);
  const [miniStats, setMiniStats] = useState(() => savedProgress?.miniStats || []);
  const [pendingReply, setPendingReply] = useState(null);
  const [pendingScores, setPendingScores] = useState(null);
  const [showMini, setShowMini] = useState(false);
  const [miniType, setMiniType] = useState(() => (savedProgress?.miniType === 'avoidCracks' ? 'maze' : (MINI_GAMES.includes(savedProgress?.miniType) ? savedProgress.miniType : 'snake')));
  const [playerLevel, setPlayerLevel] = useState(() => savedProgress?.playerLevel || 0);
  const [completedNodes, setCompletedNodes] = useState(() => savedProgress?.completedNodes || []);
  const [ending, setEnding] = useState(() => savedProgress?.ending || null);
  const [identityMapUnlocked, setIdentityMapUnlocked] = useState(() => savedProgress?.identityMapUnlocked || false);
  const [creatureAction, setCreatureAction] = useState(null);
  const [finale, setFinale] = useState(() => savedProgress?.finale || false);
  const [transitionKey, setTransitionKey] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mapView, setMapView] = useState(() => savedProgress?.mapView || { rotateX: 58, rotateZ: -10 });
  const [mapDrag, setMapDrag] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);

  const script = activeNode ? scripts[activeNode.id] : [];
  const step = script[stepIndex];
  const npc = step ? NPCS[step.speaker] : NPCS.lia;
  const nodeIndex = activeNode ? NODES.findIndex((node) => node.id === activeNode.id) : 0;
  const showIdentityMap = identityMapUnlocked || Boolean(ending);

  function snapshot() {
    return { screen, introIndex, activeNodeId: activeNode?.id || null, stepIndex, scores, miniStats, miniType, playerLevel, completedNodes, ending, identityMapUnlocked, finale, mapView };
  }

  function remember() {
    setHistoryStack((stack) => [...stack.slice(-24), snapshot()]);
  }

  function restore(s) {
    setScreen(s.screen || 'intro');
    setIntroIndex(s.introIndex ?? -1);
    setActiveNode(NODES.find((node) => node.id === s.activeNodeId) || null);
    setStepIndex(s.stepIndex || 0);
    setScores(s.scores || defaultScores);
    setMiniStats(s.miniStats || []);
    setMiniType(s.miniType || 'snake');
    setPlayerLevel(s.playerLevel || 0);
    setCompletedNodes(s.completedNodes || []);
    setEnding(s.ending || null);
    setIdentityMapUnlocked(s.identityMapUnlocked || false);
    setFinale(s.finale || false);
    setMapView(s.mapView || { rotateX: 58, rotateZ: -10 });
    setPendingReply(null);
    setPendingScores(null);
    setShowMini(false);
    setCreatureAction(null);
    setCustomInput('');
    setTransitionKey((value) => value + 1);
  }

  function goBack() {
    setHistoryStack((stack) => {
      const previous = stack[stack.length - 1];
      if (previous) {
        restore(previous);
        return stack.slice(0, -1);
      }
      if (showMini) setShowMini(false);
      else if (pendingReply) { setPendingReply(null); setPendingScores(null); }
      else if (screen === 'node' && stepIndex > 0) setStepIndex((value) => value - 1);
      else if (screen === 'node') { setScreen('map'); setActiveNode(null); }
      else if (screen === 'map') { setScreen('intro'); setIntroIndex(0); }
      else if (screen === 'intro' && introIndex >= 0) setIntroIndex(-1);
      else if (finale) { setFinale(false); setScreen('map'); }
      return stack;
    });
  }

  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
  }, [screen, introIndex, activeNode, stepIndex, scores, miniStats, miniType, playerLevel, completedNodes, ending, identityMapUnlocked, finale, mapView]);

  function advanceIntro() {
    remember();
    setScreen('map');
  }

  function enterNode(node) {
    if (showIdentityMap) return;
    remember();
    setActiveNode(node);
    setStepIndex(0);
    setPendingReply(null);
    setPendingScores(null);
    setCustomInput('');
    setScreen('node');
    setTransitionKey((value) => value + 1);
  }

  function startMapDrag(event) {
    setMapDrag({ x: event.clientX, y: event.clientY, rotateX: mapView.rotateX, rotateZ: mapView.rotateZ });
  }

  function dragMap(event) {
    if (!mapDrag) return;
    setMapView({
      rotateX: Math.min(70, Math.max(38, mapDrag.rotateX - (event.clientY - mapDrag.y) * 0.12)),
      rotateZ: mapDrag.rotateZ + (event.clientX - mapDrag.x) * 0.12,
    });
  }

  function confirmCreature(identity) {
    remember();
    setCreatureAction(identity);
    if (ending && identity === ending.identity) window.setTimeout(() => setFinale(true), 1700);
    else window.setTimeout(() => setCreatureAction(null), 1200);
  }

  function chooseOption(choice) {
    remember();
    const nextScores = { ...scores, [choice.identity]: (scores[choice.identity] || 0) + 1 };
    setScores(nextScores);
    setPendingScores(nextScores);
    setPendingReply(choice.reply);
    if (Math.random() < 0.32) {
      setMiniType(MINI_GAMES[(stepIndex + nodeIndex + miniStats.length) % MINI_GAMES.length]);
      setShowMini(true);
    }
  }

  function continueAfterReply(stats = miniStats, scoreState = pendingScores || scores) {
    remember();
    setPendingReply(null);
    setPendingScores(null);
    setTransitionKey((value) => value + 1);
    if (stepIndex >= 3 || stepIndex >= script.length - 1) {
      const nodeIds = completedNodes.includes(activeNode.id) ? completedNodes : [...completedNodes, activeNode.id];
      setCompletedNodes(nodeIds);
      if (nodeIds.length >= 3) {
        const identity = resolveIdentity(scoreState, stats);
        setEnding({ identity, title: `水坑倒影：${identityCreatures[identity].label}`, text: getEndingText(identity) });
      } else {
        setScreen('map');
      }
      return;
    }
    setStepIndex((value) => value + 1);
  }

  function finishMini(stat) {
    remember();
    const nextStats = [...miniStats, stat];
    setMiniStats(nextStats);
    setPlayerLevel((level) => evaluateNextLevel(level, stat));
    setShowMini(false);
    window.setTimeout(() => continueAfterReply(nextStats, pendingScores || scores), 600);
  }

  function returnToIdentityMap() {
    remember();
    setIdentityMapUnlocked(true);
    setScreen('map');
    setActiveNode(null);
    setPendingReply(null);
    setPendingScores(null);
    setCreatureAction(null);
  }

  function restartGame() {
    window.localStorage.removeItem(SAVE_KEY);
    setHistoryStack([]);
    setScreen('intro');
    setIntroIndex(-1);
    setActiveNode(null);
    setStepIndex(0);
    setScores(defaultScores);
    setMiniStats([]);
    setPendingReply(null);
    setPendingScores(null);
    setShowMini(false);
    setMiniType('snake');
    setPlayerLevel(0);
    setCompletedNodes([]);
    setEnding(null);
    setIdentityMapUnlocked(false);
    setCreatureAction(null);
    setFinale(false);
    setCustomInput('');
    setMapView({ rotateX: 58, rotateZ: -10 });
  }

  async function handleCustomAnswer(text) {
    remember();
    setAiLoading(true);
    try {
      const result = await fetchNpcFollowUp({ nodeId: activeNode.id, stepIndex, userInput: text, npcName: npc.name, conversationHistory: '' });
      setPendingReply(result.npcReply || result.nextQuestion || '你的话让空气安静了一瞬。');
      setPendingScores(scores);
      window.setTimeout(() => continueAfterReply(miniStats, scores), 1400);
    } catch {
      setPendingReply('......（思绪飘远）');
      setPendingScores(scores);
      window.setTimeout(() => continueAfterReply(miniStats, scores), 1200);
    }
    setAiLoading(false);
  }

  if (screen === 'intro') {
    if (introIndex === -1) {
      return (
        <main className="novel-screen start-screen">
          <button className="back-btn" onClick={goBack}>返回</button>
          <div className="cover-bg" />
          <section className="start-copy">
            <p>第139次循环</p>
            <h1>第139次崩塌</h1>
            <span>修复灾难地点，在一次次循环里找回真正需要被拯救的人。</span>
            <button onClick={() => { remember(); setIntroIndex(0); }}>开始游戏</button>
          </section>
        </main>
      );
    }
    return (
      <main className="novel-screen intro-screen">
        <button className="back-btn" onClick={goBack}>返回</button>
        <div className="cover-bg" />
        <section className="intro-copy" onClick={advanceIntro}>
          <div className="poem-lines">{introLines.map((line) => <p key={line}>{line}</p>)}</div>
          <small>点击进入循环地图</small>
        </section>
      </main>
    );
  }

  if (finale) {
    return (
      <main className="novel-screen finale-screen">
        <button className="back-btn" onClick={goBack}>返回</button>
        <div className="cover-bg" />
        <section className="finale-copy">
          {finaleDisplayLines.map((line) => <p key={line}>{line}</p>)}
          <h1>游戏结束</h1>
          <button className="restart-btn" onClick={restartGame}>回到第139次崩塌</button>
        </section>
      </main>
    );
  }

  if (screen === 'map') {
    return (
      <main className={`map-screen ${mapDrag ? 'dragging' : ''}`} onPointerMove={dragMap} onPointerUp={() => setMapDrag(null)} onPointerLeave={() => setMapDrag(null)}>
        <button className="back-btn" onClick={goBack}>返回</button>
        <div className="map-sky" />
        <header className="map-title"><p>第139次循环 · 灾难地点</p><h1>循环地图</h1></header>
        <section className="map-viewport" onPointerDown={startMapDrag}>
          <div className="map-world" style={{ transform: `rotateX(${mapView.rotateX}deg) rotateZ(${mapView.rotateZ}deg)` }}>
            <div className="map-bg" />
            <div className="map-ridge ridge-back" />
            <div className="map-ridge ridge-left" />
            <div className="map-ridge ridge-right" />
            <div className="map-forest" />
            <div className="map-cabin" />
            <svg className="river" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M4 72 C 22 35, 36 82, 51 52 S 77 21, 96 57" /></svg>
            {showIdentityMap ? NODES.map((node, index) => {
              const identity = ['dog', 'cat', 'tree', 'bird', 'whale'][index];
              const creature = identityCreatures[identity];
              return (
                <button key={identity} className={`map-creature creature-${identity} ${creatureAction === identity ? 'active' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onPointerDown={(event) => event.stopPropagation()} onClick={() => confirmCreature(identity)}>
                  <img src={creature.image} alt={creature.label} />
                  <b>{creature.label}</b>
                </button>
              );
            }) : NODES.map((node, index) => (
              <button key={node.id} className={`map-node ${completedNodes.includes(node.id) ? 'done' : ''}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onPointerDown={(event) => event.stopPropagation()} onClick={() => enterNode(node)}>
                <i>{index + 1}</i><span>{node.icon}</span><b>{node.title}</b><small>{node.risk}</small>
              </button>
            ))}
          </div>
        </section>
        {showIdentityMap && <section className="identity-map-panel"><p>身份推理完成</p><h2>在地图上找到真正的自己</h2><span>{creatureAction ? identityCreatures[creatureAction].action : '点击与你刚才身份相符的物种。'}</span></section>}
      </main>
    );
  }

  return (
    <main className={`novel-screen node-screen node-${activeNode.id}`}>
      <button className="back-btn" onClick={goBack}>返回</button>
      <div key={transitionKey} className={`scene-bg scene-bg-${activeNode.id}`} />
      <div key={`flash-${transitionKey}`} className="scene-flash" />
      <header className="top-pill"><span>{activeNode.title}</span><strong>{Math.min(stepIndex + 1, 4)}/4</strong><span>{activeNode.risk}</span></header>
      <section className="scene-labels"><span>进入地图 → 探索 → 解谜 → 应对灾难</span><strong>{pendingReply ? '记忆正在改写' : 'NPC 对话'}</strong></section>
      <section className={`npc npc-${step.speaker}`}>
        <figure className="npc-cutout">
          <img src={npc.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        </figure>
        <div>{npc.fallback}</div>
      </section>
      <section className="dialogue"><p>{pendingReply || step.line}</p><small>{pendingReply ? '点击继续' : `${npc.name} 正在等待你的回答。`}</small></section>
      {!pendingReply && !ending && (
        <section className="question-card">
          <p>{npc.name}</p>
          <h2>{step.line}</h2>
          <div className="choice-list">
            {step.choices.map((choice) => <button key={choice.text} onClick={() => chooseOption(choice)}>{choice.text}</button>)}
            <form className="custom-choice" onSubmit={(event) => { event.preventDefault(); if (customInput.trim() && !aiLoading) { handleCustomAnswer(customInput.trim()); setCustomInput(''); } }}>
              <input type="text" placeholder={aiLoading ? 'NPC 正在回应...' : '输入你的回答'} value={customInput} onChange={(event) => setCustomInput(event.target.value)} disabled={aiLoading} />
              <button type="submit" disabled={!customInput.trim() || aiLoading}>发送</button>
            </form>
          </div>
        </section>
      )}
      {pendingReply && !showMini && !ending && <button className="continue-btn" onClick={() => continueAfterReply()}>继续</button>}
      {showMini && <MiniGame level={playerLevel} gameType={miniType} onComplete={finishMini} onBack={goBack} />}
      {ending && (
        <section className="ending-card">
          <p>第 3 轮 · 身份真相</p>
          <h2>水坑倒影：{identityCreatures[ending.identity].label}</h2>
          <span>{ending.text}</span>
          <span>你修复的不是外部真实世界，而是自己的内心世界。</span>
          <button className="identity-return-btn" onClick={returnToIdentityMap}>回到最初地图</button>
        </section>
      )}
    </main>
  );
}

function getEndingText(identity) {
  const lines = {
    dog: '你更像一只不肯接受告别的狗。你反复救人，是因为还没有学会承认那个人已经离开。',
    cat: '你更像一只保持距离的猫。你救下别人，却总把自己隔在被帮助之外。',
    whale: '你更像一头把悲伤沉入深处的鲸。你听见所有人的呼救，却很少相信自己的声音也能被听见。',
    tree: '你更像一棵把痛苦长成年轮的树。你说自己在守护世界，其实只是被困在原地太久。',
    bird: '你更像一只找不到降落处的鸟。你一直飞向安全的地方，却忘了给自己一个家。',
  };
  return lines[identity];
}

export default App;
