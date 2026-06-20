import { useEffect, useRef, useState, useCallback } from 'react';

const DURATION_MS = 3800;

const TEXT = {
  zh: {
    title: '第139次循环',
    subtitle: '第139次崩塌',
    skipHint: '点击屏幕或按空格键跳过',
  },
  en: {
    title: 'Loop 139',
    subtitle: 'The 139th Collapse',
    skipHint: 'Click or press Space to skip',
  },
};

/**
 * IntroAnimation — 3D 俯冲入场动画
 * 从高空俯瞰沿河流路径俯冲到地图中心，配合星空粒子、镜头畸变和标题文字浮现。
 *
 * Props:
 *  - language: 'zh' | 'en'
 *  - onComplete: 动画结束或跳过时调用
 *  - onProgress?: (progress: 0~1) => void  动画进度回调，可用于外部音量渐强等
 */
export default function IntroAnimation({ language = 'zh', onComplete, onProgress }) {
  const [progress, setProgress] = useState(0); // 0~1
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const completedRef = useRef(false);

  const t = TEXT[language] || TEXT.zh;

  // 完成回调（去重）
  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onProgress?.(1);
    onComplete?.();
  }, [onComplete, onProgress]);

  // 主动画循环
  useEffect(() => {
    startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTimeRef.current;
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);
      onProgress?.(p);
      if (p >= 1) {
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [finish, onProgress]);

  // 键盘跳过（空格 / Enter）
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  // 计算动画阶段的派生值
  const eased = 1 - Math.pow(1 - progress, 2.2);
  // Z 轴俯冲：从高空 1200 单位降到 0
  const cameraZ = 1200 - eased * 1200;
  // Y 轴轻微下移
  const cameraY = -80 + eased * 80;
  // 沿河流路径的水平偏移：S 形
  const pathX = Math.sin(eased * Math.PI * 1.4) * 60 * (1 - eased);
  const pathZ = Math.cos(eased * Math.PI * 0.8) * 30 * (1 - eased);
  // 镜头畸变（中段最强）
  const distortion = Math.sin(progress * Math.PI) * 6;
  // 运动模糊/速度感
  const motionBlur = Math.min(1, progress * 2) * (1 - progress * 0.3);

  // 星空粒子
  const stars = useRef(
    Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 1200,
      z: Math.random() * 2000,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      hue: 30 + Math.random() * 40,
    }))
  ).current;

  // 河流路径粒子
  const riverParticles = useRef(
    Array.from({ length: 40 }, (_, i) => ({
      offset: i / 40,
      side: (i % 2 === 0 ? 1 : -1) * (Math.random() * 8 + 2),
      speed: 0.8 + Math.random() * 0.4,
    }))
  ).current;

  // 文字逐字显现
  const titleChars = [...t.title];
  const charProgress = (i) => {
    const start = 0.45 + (i / titleChars.length) * 0.35;
    return Math.max(0, Math.min(1, (progress - start) / 0.12));
  };

  return (
    <div
      ref={containerRef}
      className="intro-animation"
      onClick={finish}
      role="presentation"
      aria-label={t.title}
    >
      {/* 深空背景 */}
      <div className="intro-sky" />

      {/* 星空层 */}
      <div
        className="intro-starfield"
        style={{
          transform: `translateZ(${-cameraZ * 0.3}px)`,
        }}
      >
        {stars.map((star, i) => {
          const depth = star.z / 2000;
          const parallax = eased * (1 - depth) * 300;
          const sx = star.x + pathX * (1 - depth) * 2 - parallax * Math.sign(star.x) * 0.3;
          const sy = star.y + cameraY * (1 - depth) - parallax * 0.5;
          const sz = star.z - eased * 1800;
          const scale = Math.max(0, 1 + (1 - depth) * 1.5);
          const visible = sz > -100;
          return (
            <span
              key={i}
              className="intro-star"
              style={{
                left: '50%',
                top: '50%',
                width: `${star.size * scale}px`,
                height: `${star.size * scale}px`,
                transform: `translate(${sx}px, ${sy}px)`,
                opacity: visible ? star.opacity * (1 - depth * 0.6) : 0,
                background: `hsl(${star.hue}, 80%, 85%)`,
                boxShadow: `0 0 ${star.size * 3}px hsl(${star.hue}, 90%, 75%)`,
              }}
            />
          );
        })}
      </div>

      {/* 3D 世界 */}
      <div className="intro-world" style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}>
        <div
          className="intro-scene"
          style={{
            transform: `translate3d(${-pathX}px, ${cameraY}px, ${-cameraZ}px) rotateX(${88 - eased * 60}deg) rotateZ(${pathZ * 0.3}deg)`,
            filter: `blur(${Math.sin(progress * Math.PI) * 1.8}px)`,
          }}
        >
          {/* 地面 */}
          <div className="intro-ground" />

          {/* 河流路径 */}
          <svg className="intro-river" viewBox="0 0 400 400" preserveAspectRatio="none">
            <defs>
              <linearGradient id="riverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(140,200,220,0.1)" />
                <stop offset="60%" stopColor="rgba(180,220,240,0.5)" />
                <stop offset="100%" stopColor="rgba(200,230,255,0.9)" />
              </linearGradient>
              <filter id="riverGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M200,-20 C 160,80 260,160 180,240 S 140,340 200,420"
              stroke="url(#riverGrad)"
              strokeWidth="12"
              fill="none"
              filter="url(#riverGlow)"
              style={{
                strokeDasharray: '1200',
                strokeDashoffset: 1200 - eased * 1200,
              }}
            />
            {riverParticles.map((p, i) => {
              const pos = (p.offset + eased * p.speed * 1.5) % 1;
              const t = pos;
              const x = 200 + Math.sin(t * Math.PI * 1.2) * 50 * (1 - t) + p.side;
              const y = -20 + t * 440;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2 + Math.random() * 1.5}
                  fill={`rgba(220,240,255,${0.3 + pos * 0.7})`}
                  style={{ filter: `blur(${0.5 + pos}px)` }}
                />
              );
            })}
          </svg>

          {/* 废墟轮廓 */}
          {[...Array(12)].map((_, i) => {
            const ring = Math.floor(i / 4);
            const angle = (i % 4) * 90 + ring * 30;
            const dist = 80 + ring * 90 - eased * (80 + ring * 90);
            const rx = Math.cos((angle * Math.PI) / 180) * dist;
            const ry = Math.sin((angle * Math.PI) / 180) * dist;
            const size = 15 + ring * 12;
            return (
              <div
                key={i}
                className="intro-ruin"
                style={{
                  left: `calc(50% + ${rx}px)`,
                  top: `calc(50% + ${ry}px)`,
                  width: `${size}px`,
                  height: `${size * (0.6 + ((i * 7) % 10) / 12)}px`,
                  opacity: Math.max(0, 1 - eased * 0.8 - ring * 0.1),
                  transform: `translate(-50%, -50%) scale(${Math.max(0.2, 1 - eased * 0.5)})`,
                }}
              />
            );
          })}

          {/* 中心目标光 */}
          <div
            className="intro-center-glow"
            style={{
              opacity: eased * 0.9,
              transform: `translate(-50%, -50%) scale(${0.3 + eased * 1.2})`,
            }}
          />
        </div>
      </div>

      {/* 镜头色差畸变 */}
      <div
        className="intro-chromatic"
        style={{
          '--distort': `${distortion}px`,
          opacity: distortion / 8,
        }}
      />

      {/* 速度线 */}
      <div className="intro-speed-lines" style={{ opacity: motionBlur * 0.5 }}>
        {[...Array(24)].map((_, i) => (
          <span
            key={i}
            style={{
              transform: `rotate(${i * 15}deg)`,
              animationDelay: `${i * 0.03}s`,
            }}
          />
        ))}
      </div>

      {/* 烟雾层 */}
      <div
        className="intro-smoke"
        style={{
          transform: `translateY(${-progress * 30}px)`,
          opacity: 1 - eased * 0.4,
        }}
      >
        {[...Array(6)].map((_, i) => (
          <span
            key={i}
            style={{
              left: `${8 + i * 16}%`,
              animationDelay: `${i * 0.4}s`,
              opacity: 0.25 + ((i * 3) % 10) / 30,
            }}
          />
        ))}
      </div>

      {/* 标题文字 */}
      <div className="intro-title-wrap">
        <h1 className="intro-title">
          {titleChars.map((ch, i) => {
            const cp = charProgress(i);
            return (
              <span
                key={i}
                style={{
                  opacity: cp,
                  transform: `translateY(${(1 - cp) * 24}px) scale(${0.7 + cp * 0.3})`,
                  textShadow: `0 0 ${20 + cp * 30}px rgba(244,209,138,${cp * 0.8}), 0 0 ${60 + cp * 40}px rgba(200,160,90,${cp * 0.4})`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </h1>
        <p
          className="intro-subtitle"
          style={{
            opacity: progress > 0.78 ? 1 : 0,
            transform: `translateY(${progress > 0.78 ? 0 : 12}px)`,
          }}
        >
          {t.subtitle}
        </p>
      </div>

      {/* 跳过提示 */}
      <div
        className="intro-skip-hint"
        style={{ opacity: progress > 0.1 && progress < 0.85 ? 0.7 : 0 }}
      >
        {t.skipHint}
      </div>

      {/* 暗角 */}
      <div className="intro-vignette" />
    </div>
  );
}