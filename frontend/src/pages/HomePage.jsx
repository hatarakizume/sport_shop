import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACCENT,
  CALLOUT_LABELS,
  CATEGORY_ROWS,
  CHAPTER_COUNT,
  chapterAt,
  clamp01,
  timerText,
} from '../components/home/story';

const SneakerScene = lazy(() => import('../components/home/SneakerScene'));

class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HomePage() {
  const trackRef = useRef(null);
  const timerRef = useRef(null);
  const hintRef = useRef(null);

  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0, inside: false });
  const hoverRef = useRef({ asset: 'sneaker', color: ACCENT });
  const callouts = useRef(CALLOUT_LABELS.map(() => ({})));

  const [chapter, setChapter] = useState(0);
  const [sceneState, setSceneState] = useState('loading');

  useEffect(() => {
    function onScroll() {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? clamp01(-rect.top / total) : 0;
      progressRef.current = p;
      setChapter((prev) => {
        const next = chapterAt(p);
        return next === prev ? prev : next;
      });
      if (timerRef.current) timerRef.current.textContent = timerText(p);
      if (hintRef.current) hintRef.current.style.opacity = p > 0.03 ? '0' : '1';
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  function handlePointerMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
      inside: true,
    };
  }

  function handlePointerLeave() {
    pointerRef.current = { x: 0, y: 0, inside: false };
  }

  function setHover(row) {
    hoverRef.current = row ? { asset: row.asset, color: row.color } : { asset: 'sneaker', color: ACCENT };
  }

  const handleReady = useCallback(() => setSceneState('ready'), []);
  const handleError = useCallback(() => setSceneState('failed'), []);

  const tab = (i) => (chapter === i ? 0 : -1);

  return (
    <section ref={trackRef} className="relative h-[600vh]" aria-label="Знакомство с магазином">
      <div
        className="sticky top-0 h-svh overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="absolute inset-0">
          <SceneBoundary onError={handleError}>
            <Suspense fallback={null}>
              <SneakerScene
                progressRef={progressRef}
                pointerRef={pointerRef}
                hoverRef={hoverRef}
                callouts={callouts}
                onReady={handleReady}
              />
            </Suspense>
          </SceneBoundary>
        </div>

        {sceneState === 'loading' && (
          <div className="pointer-events-none absolute right-[18%] top-1/2 -translate-y-1/2 text-sm text-neutral-500">
            Загружаем 3D…
          </div>
        )}

        <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full" aria-hidden="true">
          {CALLOUT_LABELS.map((label, i) => (
            <g key={label}>
              <line
                ref={(el) => {
                  callouts.current[i].line = el;
                }}
                stroke="#FF6A3D"
                strokeWidth="1"
                opacity="0"
              />
              <circle
                ref={(el) => {
                  callouts.current[i].dot = el;
                }}
                r="3"
                fill="#FF6A3D"
                opacity="0"
              />
            </g>
          ))}
        </svg>
        {CALLOUT_LABELS.map((label, i) => (
          <div
            key={label}
            ref={(el) => {
              callouts.current[i].label = el;
            }}
            className="pointer-events-none absolute z-[2] -translate-y-1/2 whitespace-nowrap text-[13px] text-neutral-200 opacity-0"
          >
            {label}
          </div>
        ))}

        <div className="pointer-events-none absolute inset-0 z-[3]">
          <div className="relative mx-auto h-full max-w-7xl">
            <Chapter active={chapter === 0} wide>
              <div className="mb-4 text-xs text-orange-500">( Новая коллекция )</div>
              <h1 className="text-5xl font-medium leading-[1.03] tracking-[-0.035em] md:text-7xl lg:text-[5rem]">
                Экипировка для движения
              </h1>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-neutral-400">
                Кроссовки, одежда и инвентарь.
                <span className="hidden md:inline"> Наведите курсор на кроссовок, чтобы повернуть его.</span>
              </p>
            </Chapter>

            <Chapter active={chapter === 1}>
              <div className="mb-4 text-xs text-orange-500">( Детали )</div>
              <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-6xl">
                Каждая деталь на виду
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-neutral-400">
                Смотрите на товар вблизи, прежде чем положить его в корзину.
              </p>
            </Chapter>

            <Chapter active={chapter === 2}>
              <div className="mb-4 text-xs text-orange-500">( Категории )</div>
              <h2 className="mb-6 text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-6xl">
                Выберите своё
              </h2>
              <ul className="w-full max-w-sm border-b border-neutral-800">
                {CATEGORY_ROWS.map((row, i) => (
                  <li key={row.title} className="border-t border-neutral-800">
                    <Link
                      to="/catalog"
                      tabIndex={tab(2)}
                      onMouseEnter={() => setHover(row)}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(row)}
                      onBlur={() => setHover(null)}
                      className="group flex items-baseline gap-4 py-4 transition-[padding] duration-200 hover:pl-2.5 focus-visible:pl-2.5 focus-visible:outline-none"
                    >
                      <span className="w-6 text-xs text-neutral-600 group-hover:text-orange-500 group-focus-visible:text-orange-500">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="text-xl font-medium">{row.title}</span>
                      <span className="ml-auto hidden text-sm text-neutral-500 sm:inline">{row.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Chapter>

            <Chapter active={chapter === 3}>
              <div className="mb-4 text-xs text-orange-500">( Резерв )</div>
              <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-6xl">
                15 минут на оплату
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-neutral-400">
                Пока вы оформляете заказ, товар ждёт в резерве. Не успели — он вернётся на склад.
              </p>
              <div ref={timerRef} className="mt-5 text-5xl font-medium tabular-nums text-orange-500">
                15:00
              </div>
            </Chapter>

            <Chapter active={chapter === 4}>
              <div className="mb-4 text-xs text-orange-500">( Каталог )</div>
              <h2 className="text-4xl font-medium leading-[1.05] tracking-[-0.035em] md:text-6xl">
                Готовы выбрать?
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-neutral-400">
                Весь ассортимент с фильтрами по бренду, категории и цене.
              </p>
              <Link
                to="/catalog"
                tabIndex={tab(4)}
                className="mt-7 inline-block rounded-lg bg-orange-500 px-6 py-3 font-medium text-black transition-colors hover:bg-orange-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                Открыть каталог
              </Link>
            </Chapter>

            <div className="absolute bottom-6 right-5 text-xs tabular-nums text-neutral-500 md:right-16">
              {String(chapter + 1).padStart(2, '0')} / {String(CHAPTER_COUNT).padStart(2, '0')}
            </div>
          </div>
        </div>

        <div
          ref={hintRef}
          className="pointer-events-none absolute bottom-6 left-1/2 z-[2] -translate-x-1/2 text-xs text-neutral-500 transition-opacity duration-300"
        >
          Листайте вниз
        </div>
      </div>
    </section>
  );
}

function Chapter({ active, wide = false, children }) {
  return (
    <div
      aria-hidden={!active}
      className={`absolute left-5 right-5 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none
        max-md:bottom-16 md:left-16 md:right-auto md:top-1/2 ${wide ? 'md:max-w-2xl' : 'md:max-w-xl'}
        ${active ? 'pointer-events-auto opacity-100 md:-translate-y-1/2' : 'opacity-0 translate-y-3 md:-translate-y-[45%]'}`}
    >
      {children}
    </div>
  );
}
