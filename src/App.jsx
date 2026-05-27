import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchNpcFollowUp } from './services/aiService';
import './App.css';

const SAVE_KEY = 'infinite-loop-game-progress-v1';
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`;
[
  ['--scene-default', 'scene1.jpg'],
  ['--scene-riverbank', 'scene-riverbank.jpg'],
  ['--scene-woods', 'scene-woods.jpg'],
  ['--scene-cabin', 'scene-cabin.jpg'],
  ['--scene-puddle', 'scene-puddle.jpg'],
  ['--map-bg', 'map-bg.jpg'],
  ['--cover-bg', 'cover.jpg'],
].forEach(([name, path]) => {
  document.documentElement.style.setProperty(name, `url("${assetUrl(path)}")`);
});
const defaultScores = { dog: 0, cat: 0, whale: 0, tree: 0, bird: 0 };

const NODES = [
  { id: 'ruins', icon: '1', title: '废墟', risk: '坍塌风险', x: 16, y: 67, npc: 'lia' },
  { id: 'riverbank', icon: '2', title: '河边', risk: '洪水风险', x: 32, y: 43, npc: 'gaia' },
  { id: 'woods', icon: '3', title: '枯树林', risk: '火灾风险', x: 50, y: 63, npc: 'gaia' },
  { id: 'cabin', icon: '4', title: '小屋', risk: '暴风风险', x: 67, y: 38, npc: 'lia' },
  { id: 'puddle', icon: '5', title: '水坑', risk: '反转关键地点', x: 84, y: 58, npc: 'gaia' },
];

const NPCS = {
  lia: { name: '莉娅', image: assetUrl('lia.png'), fallback: '莉' },
  gaia: { name: '盖亚', image: assetUrl('gaia.png'), fallback: '盖' },
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

function LandscapeNotice({ show }) {
  return (
    <aside className={`landscape-notice ${show ? 'show' : ''}`} aria-hidden={!show}>
      <div>
        <p>请横屏体验</p>
        <span>将手机旋转为横屏后继续游戏。如果没有旋转，请关闭手机的竖排方向锁定。</span>
      </div>
    </aside>
  );
}

const awakeningScript = [
  q('gaia', '这一次，你忽然停下。为什么每一轮都从同一个问题开始？', [['因为有人在逼我回答', 'cat'], ['因为我还没有醒来', 'whale'], ['因为答案一直在我身上', 'tree']]),
  q('lia', '你反问系统：那我是谁？空气安静了。你先看见了什么？', [['一双等我回去的眼睛', 'dog'], ['一片没有出口的水面', 'whale'], ['一条被我反复走过的路', 'bird']]),
  q('gaia', '如果救世主只是一个名字，你真正想救回什么？', [['那个被我弄丢的人', 'dog'], ['不再逃开的自己', 'cat'], ['心里没有修好的地方', 'tree']]),
  q('lia', '最后一次回答：你愿意承认自己并不只是来救世界的吗？', [['愿意，我也需要被救', 'tree'], ['我还想先确认真相', 'cat'], ['我听见自己的回声了', 'whale']]),
];

const identityCreatures = {
  dog: { label: '狗', image: assetUrl('identity-dog.png'), action: '狗汪汪地跳了起来。' },
  cat: { label: '猫', image: assetUrl('identity-cat.png'), action: '猫喵喵地摇了摇尾巴，在你身边走来走去。' },
  tree: { label: '树', image: assetUrl('identity-tree.jpg'), action: '树的枝叶轻轻舒展，像终于扎下了根。' },
  bird: { label: '鸟', image: assetUrl('identity-bird.png'), action: '鸟振翅飞翔，掠过河面。' },
  whale: { label: '鲸鱼', image: assetUrl('identity-whale.png'), action: '鲸鱼在水光里缓慢游动，发出深处的回响。' },
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

  useEffect(() => {
    function handleKeyDown(event) {
      const controls = {
        ArrowUp: { x: 0, y: -1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowDown: { x: 0, y: 1 },
      };
      const nextDirection = controls[event.key];
      if (!nextDirection) return;
      event.preventDefault();
      turn(nextDirection);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

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

  useEffect(() => {
    function handleKeyDown(event) {
      const controls = {
        ArrowUp: [0, -1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowDown: [0, 1],
      };
      const direction = controls[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction[0], direction[1]);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, misses]);

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

function App() {
  const [screen, setScreen] = useState('intro');
  const [introIndex, setIntroIndex] = useState(-1);
  const [activeNode, setActiveNode] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState(defaultScores);
  const [miniStats, setMiniStats] = useState([]);
  const [pendingReply, setPendingReply] = useState(null);
  const [pendingScores, setPendingScores] = useState(null);
  const [showMini, setShowMini] = useState(false);
  const [miniType, setMiniType] = useState('snake');
  const [miniPlayedThisNode, setMiniPlayedThisNode] = useState(false);
  const [nodePrelude, setNodePrelude] = useState(null);
  const [playerLevel, setPlayerLevel] = useState(0);
  const [completedNodes, setCompletedNodes] = useState([]);
  const [ending, setEnding] = useState(null);
  const [identityMapUnlocked, setIdentityMapUnlocked] = useState(false);
  const [creatureAction, setCreatureAction] = useState(null);
  const [finale, setFinale] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const [customInput, setCustomInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [mapView, setMapView] = useState({ rotateX: 58, rotateZ: -10 });
  const [mapDrag, setMapDrag] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const [musicOn, setMusicOn] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showLandscapeNotice, setShowLandscapeNotice] = useState(false);
  const audioRef = useRef(null);

  const isAwakeningRound = activeNode && completedNodes.length >= 2 && !completedNodes.includes(activeNode.id);
  const script = activeNode ? (isAwakeningRound ? awakeningScript : scripts[activeNode.id]) : [];
  const step = script[stepIndex];
  const npc = step ? NPCS[step.speaker] : NPCS.lia;
  const nodeIndex = activeNode ? NODES.findIndex((node) => node.id === activeNode.id) : 0;
  const showIdentityMap = identityMapUnlocked || Boolean(ending);
  const endingReport = ending ? (ending.report || getEndingReport(ending.identity)) : null;

  function snapshot() {
    return { screen, introIndex, activeNodeId: activeNode?.id || null, stepIndex, scores, miniStats, miniType, playerLevel, completedNodes, ending, identityMapUnlocked, finale, mapView, miniPlayedThisNode, nodePrelude, musicOn };
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
    setMiniPlayedThisNode(s.miniPlayedThisNode || false);
    setNodePrelude(s.nodePrelude || null);
    setPlayerLevel(s.playerLevel || 0);
    setCompletedNodes(s.completedNodes || []);
    setEnding(s.ending || null);
    setIdentityMapUnlocked(s.identityMapUnlocked || false);
    setFinale(s.finale || false);
    setMapView(s.mapView || { rotateX: 58, rotateZ: -10 });
    setMusicOn(s.musicOn ?? true);
    setPendingReply(null);
    setPendingScores(null);
    setShowMini(false);
    setMiniPlayedThisNode(false);
    setNodePrelude(null);
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
    function updateOrientationNotice() {
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      const likelyPhone = Math.min(width, height) <= 820;
      setShowLandscapeNotice(likelyPhone && height > width);
    }

    updateOrientationNotice();
    window.addEventListener('resize', updateOrientationNotice);
    window.addEventListener('orientationchange', updateOrientationNotice);
    window.visualViewport?.addEventListener('resize', updateOrientationNotice);
    return () => {
      window.removeEventListener('resize', updateOrientationNotice);
      window.removeEventListener('orientationchange', updateOrientationNotice);
      window.visualViewport?.removeEventListener('resize', updateOrientationNotice);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot()));
  }, [screen, introIndex, activeNode, stepIndex, scores, miniStats, miniType, playerLevel, completedNodes, ending, identityMapUnlocked, finale, mapView, miniPlayedThisNode, nodePrelude, musicOn]);

  useEffect(() => {
    const audio = new Audio(assetUrl('music-night-note.m4a'));
    audio.loop = true;
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.42;
    if (musicOn) {
      const play = (event) => {
        if (event?.target?.closest?.('.music-btn')) return;
        audio.play().catch(() => {});
      };
      play();
      window.addEventListener('pointerdown', play, { once: true });
      window.addEventListener('keydown', play, { once: true });
      return () => {
        window.removeEventListener('pointerdown', play);
        window.removeEventListener('keydown', play);
      };
    } else {
      audio.pause();
    }
  }, [musicOn]);

  function MusicToggle() {
    return (
      <>
        <button className={`music-btn ${musicOn ? 'on' : ''}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => {
          setMusicOn((value) => {
            const next = !value;
            if (!next) audioRef.current?.pause();
            return next;
          });
        }}>
          {musicOn ? '音乐开' : '音乐关'}
        </button>
      </>
    );
  }

  function advanceIntro() {
    remember();
    setScreen('map');
  }

  function enterNode(node) {
    if (showIdentityMap) return;
    remember();
    setActiveNode(node);
    setStepIndex(0);
    setMiniPlayedThisNode(false);
    setNodePrelude(completedNodes.length >= 2 ? 'awakening' : 'question');
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
    if (!miniPlayedThisNode) {
      setMiniType(MINI_GAMES[completedNodes.length % MINI_GAMES.length]);
      setMiniPlayedThisNode(true);
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
        setEnding({ identity, title: `水坑倒影：${identityCreatures[identity].label}`, report: getEndingReport(identity) });
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
    setMiniPlayedThisNode(false);
    setNodePrelude(null);
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
    setMusicOn(true);
  }

  async function handleCustomAnswer(text) {
    remember();
    setAiLoading(true);
    try {
      const result = await fetchNpcFollowUp({ nodeId: activeNode.id, stepIndex, userInput: text, npcName: npc.name, conversationHistory: '' });
      setPendingReply(result.npcReply || result.nextQuestion || '你的话让空气安静了一瞬。');
      setPendingScores(scores);
    } catch {
      setPendingReply('风声短暂压过了回音。请再试一次，或换一种说法。');
      setPendingScores(scores);
    }
    setAiLoading(false);
  }

  if (screen === 'intro') {
    if (introIndex === -1) {
      return (
        <main className="novel-screen start-screen">
          <LandscapeNotice show={showLandscapeNotice} />
          <button className="back-btn" onClick={goBack}>返回</button>
          <MusicToggle />
          <div className="cover-bg" />
          <section className="start-copy">
            <p>第139次循环</p>
            <h1>第139次崩塌</h1>
            <span>修复灾难地点，在一次次循环里找回真正需要被拯救的人。</span>
            <div className="start-actions">
              <button onClick={() => { remember(); setIntroIndex(0); }}>开始游戏</button>
              <button className="guide-btn" onClick={() => setShowGuide(true)}>游戏说明</button>
            </div>
          </section>
          {showGuide && (
            <section className="guide-modal" role="dialog" aria-modal="true" aria-label="游戏说明">
              <div className="guide-card">
                <button className="guide-close" onClick={() => setShowGuide(false)} aria-label="关闭游戏说明">×</button>
                <p>游戏说明</p>
                <h2>轮回修复师行动指引</h2>
                <ol>
                  <li>经过首页上的楔子之后会来到循环地图，地图上有5个场景，我们完成三个场景内的闯关即可推理出最终身份，从而结束游戏。</li>
                  <li>每个场景内有四个问题，每个问题下面会有四个选项，其中三个是固定选项，一个是玩家可自由回复的选项。点击三个固定选项的时候会随机触发小游戏（贪吃蛇、迷宫和古诗填空），玩家若选择了自主回复，向NPC发送消息，NPC也会回答你。</li>
                  <li>在完成一个场景后会跳转到循环地图，接着你就可以选择下一个场景，直到第三个场景的最后将会推理出你的最终身份。</li>
                  <li>这个时候又会跳转到循环地图，但是这次不一样的是循环地图的5个场景上都多了相对应的物种标识，点击与你真实身份相同的标识，便会出现收束诗，游戏结束。</li>
                  <li>游戏音乐可自动开关，AI将结合你的游戏正确率和你选择的回复共同分析推理出你的最终身份。</li>
                  <li>祝玩家在这趟心灵疗愈里程中找寻到真实自我，一路顺风。</li>
                </ol>
              </div>
            </section>
          )}
        </main>
      );
    }
    return (
      <main className="novel-screen intro-screen">
        <LandscapeNotice show={showLandscapeNotice} />
        <button className="back-btn" onClick={goBack}>返回</button>
        <MusicToggle />
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
        <LandscapeNotice show={showLandscapeNotice} />
        <button className="back-btn" onClick={goBack}>返回</button>
        <MusicToggle />
        <div className="cover-bg" />
        <section className="finale-copy">
          {finaleDisplayLines.map((line) => <p key={line}>{line}</p>)}
          <video className="finale-video" src={assetUrl('finale-video.mp4')} autoPlay muted loop playsInline controls />
          <h1>游戏结束</h1>
          <button className="restart-btn" onClick={restartGame}>回到第139次崩塌</button>
        </section>
      </main>
    );
  }

  if (screen === 'map') {
    return (
      <main className={`map-screen ${mapDrag ? 'dragging' : ''}`} onPointerMove={dragMap} onPointerUp={() => setMapDrag(null)} onPointerLeave={() => setMapDrag(null)}>
        <LandscapeNotice show={showLandscapeNotice} />
        <button className="back-btn" onClick={goBack}>返回</button>
        <MusicToggle />
        <div className="map-sky" />
        <header className="map-title"><p>第139次循环 · 灾难地点</p><h1>循环地图</h1></header>
        <section className="map-viewport" onPointerDown={startMapDrag}>
          <div className="map-world map-world-intro" style={{ '--map-rotate-x': `${mapView.rotateX}deg`, '--map-rotate-z': `${mapView.rotateZ}deg`, transform: `rotateX(${mapView.rotateX}deg) rotateZ(${mapView.rotateZ}deg)` }}>
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
      <LandscapeNotice show={showLandscapeNotice} />
      <button className="back-btn" onClick={goBack}>返回</button>
      <MusicToggle />
      <div key={transitionKey} className={`scene-bg scene-bg-${activeNode.id}`} />
      <div key={`flash-${transitionKey}`} className="scene-flash" />
      {nodePrelude && (
        <section className="node-prelude" onClick={() => setNodePrelude(null)}>
          <p>你是谁</p>
          {nodePrelude === 'awakening' && <span>第三次踏入灾难时，你突然意识到：为什么每次都问我这个问题，我不是救世主吗</span>}
        </section>
      )}
      <header className="top-pill"><span>{activeNode.title}</span><strong>{Math.min(stepIndex + 1, 4)}/4</strong><span>{activeNode.risk}</span></header>
      <section className="scene-labels"><span>进入地图 → 探索 → 解谜 → 应对灾难</span><strong>{pendingReply ? '记忆正在改写' : 'NPC 对话'}</strong></section>
      <section className={`npc npc-${step.speaker}`}>
        <figure className="npc-cutout">
          <img src={npc.image} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        </figure>
        <div>{npc.fallback}</div>
      </section>
      <section className="dialogue"><p>{pendingReply || step.line}</p><small>{pendingReply ? '点击继续' : `${npc.name} 正在等待你的回答。`}</small></section>
      {!nodePrelude && !pendingReply && !ending && (
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
      {!nodePrelude && pendingReply && !showMini && !ending && <button className="continue-btn" onClick={() => continueAfterReply()}>继续</button>}
      {!nodePrelude && showMini && <MiniGame level={playerLevel} gameType={miniType} onComplete={finishMini} onBack={goBack} />}
      {ending && (
        <section className="ending-card">
          <p>第 3 轮 · 身份真相</p>
          <h2>水坑倒影：{identityCreatures[ending.identity].label}</h2>
          <span className="ending-summary">{endingReport.summary}</span>
          <div className="analysis-grid">
            <article>
              <b>当下心理状态</b>
              <span>{endingReport.state}</span>
            </article>
            <article>
              <b>行为模式</b>
              <span>{endingReport.pattern}</span>
            </article>
            <article>
              <b>突破方向</b>
              <span>{endingReport.breakthrough}</span>
            </article>
            <article>
              <b>7 日行动建议</b>
              <span>{endingReport.practice}</span>
            </article>
          </div>
          <span className="ending-note">这不是临床诊断，而是一份基于你在循环中的选择生成的心理画像。你修复的不是外部真实世界，而是自己的内心世界。</span>
          <button className="identity-return-btn" onClick={returnToIdentityMap}>回到最初地图</button>
        </section>
      )}
    </main>
  );
}

function getEndingReport(identity) {
  const reports = {
    dog: {
      summary: '你更像一只不肯接受告别的狗。你反复救人，是因为内心仍在努力证明：只要自己再快一点、再忠诚一点、再多承担一点，失去就可以被改写。',
      state: '你现在可能处在高责任感与分离焦虑交织的状态。你对关系很敏感，容易把别人的痛苦自动归入自己的责任范围，也会在安静下来时反复复盘“我是不是还能做得更多”。',
      pattern: '你的优势是可靠、共情和行动力强；压力点是过度补偿。你习惯先保护别人，再处理自己的悲伤，因此外表像是在解决问题，内在却一直停在告别现场。',
      breakthrough: '真正的突破不是继续证明自己值得被留下，而是允许关系有边界、允许失去发生、允许自己在没有拯救任务的时候仍然有价值。',
      practice: '每天写下一个“今天我不必负责的事”，并把一次主动照顾别人改成清楚表达自己的需要。练习说：我愿意陪你，但这件事不全由我承担。',
    },
    cat: {
      summary: '你更像一只保持距离的猫。你能看见局势，也能做出理性选择，但你常把真正的脆弱藏在独立、冷静和“不麻烦别人”的姿态后面。',
      state: '你当下可能处在防御性独立的状态。你不是没有情绪，而是习惯先观察、先判断安全，再决定要不要靠近。亲密关系越重要，你越可能表现得像“不需要”。',
      pattern: '你的优势是边界清晰、判断敏锐、能在混乱中保持清醒；压力点是回避求助。你会把依赖理解成失控，把被看见理解成暴露，于是把自己隔在支持系统之外。',
      breakthrough: '突破点在于把“保持边界”和“接受连接”分开。成熟的独立不是永远不需要别人，而是知道什么时候可以安全地让别人靠近一点。',
      practice: '选一个可信任的人，分享一件不需要立刻解决的小困扰，只请求倾听，不请求建议。目标不是变得外向，而是让真实感慢慢进入关系。',
    },
    whale: {
      summary: '你更像一头把悲伤沉入深处的鲸。你能听见很多细微的情绪，也愿意承载别人的回声，但你自己的声音常常被放到最后。',
      state: '你当下可能处在情绪过载后的内收状态。你感受力很强，容易捕捉环境里的痛苦、未说出口的失望和关系中的暗流，却不一定知道该如何把这些感受说出来。',
      pattern: '你的优势是深度共情、直觉细腻、能理解复杂情绪；压力点是沉默承受。你可能用“我没事”维持平静，却让情绪在心里越积越深。',
      breakthrough: '突破不是让自己不敏感，而是给感受一个出口。你需要从“替所有人听见”转向“也让自己被听见”。',
      practice: '每天用三句话记录情绪：我感觉到什么、它从哪里来、我现在需要什么。遇到压力时先命名情绪，再决定行动，不要直接把所有感受吞回去。',
    },
    tree: {
      summary: '你更像一棵把痛苦长成年轮的树。你看起来稳定、能撑住场面，但也可能把“忍住”和“坚强”混在了一起。',
      state: '你当下可能处在长期压抑后的僵持状态。你很能扛事，也习惯成为别人眼中的稳定支点，但内在某些部分已经站在原地太久，既想改变，又害怕改变会让一切失控。',
      pattern: '你的优势是耐心、承诺感和恢复力；压力点是过度忍耐。你会把伤口合理化成经验，把疲惫包装成责任，直到自己几乎忘记原本想去哪里。',
      breakthrough: '突破点不是拔掉过去，而是重新生长。你需要把“我必须撑住”改成“我可以移动一点点”，用小范围变化重新找回选择感。',
      practice: '连续 7 天做一个微小改变：换一条路线、整理一个角落、拒绝一个不必要的请求。每次改变后记录身体感受，让自己重新适应“我可以动”。',
    },
    bird: {
      summary: '你更像一只找不到降落处的鸟。你一直飞向更安全、更自由的地方，却可能在不停迁徙中忘了给自己建立一个稳定的落点。',
      state: '你当下可能处在逃离压力与渴望自由并存的状态。你对束缚很敏感，讨厌被固定评价，也害怕被困在某种身份、关系或生活节奏里。',
      pattern: '你的优势是适应力强、视野开阔、能快速寻找出口；压力点是难以停留。每当事情变得沉重，你可能先寻找下一个方向，而不是确认自己真正想留下什么。',
      breakthrough: '突破不是停止飞翔，而是学会选择降落。自由不只是离开不舒服的地方，也包括主动建造一个你愿意负责的生活坐标。',
      practice: '为自己设定一个小型“栖息地”：固定一个时间、空间或习惯，连续 7 天不更换。用稳定承接自由，让行动不再只是逃离。',
    },
  };
  return reports[identity];
}

export default App;
