/**
 * Content Interpreter — standalone static demo (GitHub Pages).
 *
 * 独立于 Next.js 的纯静态 demo：复用 @omnidocs/interpreter 引擎 + 规则意图路由。
 * 本地 0.5B 模型经 importmap 从 CDN 加载，页面挂载后自动冷启动（无需点击）——
 * 规则兜底不是退路，是默认路径；模型在后台预热，只对规则不确定的意图被咨询。
 * 左侧为 benchmark/log 侧栏，右侧为实际渲染内容。
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  fromAdr,
  fromBlueprint,
  Interpret,
  getPreset,
  FORM_PRESETS,
  type FormSpec,
  type DocumentContent,
  type FormKey,
} from '../../../packages/interpreter/dist/index.js';
import { ADR_025 } from '../../../src/client-edge/src/components/interpreter/content.js';
import { BP_04 } from '../../../src/client-edge/src/components/interpreter/blueprint-content.js';
import { ruleFallback, ruleHasConfidence, describeSpecEn } from '../../../src/client-edge/src/components/interpreter/intent-llm.js';
import {
  bootLocalEngine,
  localPresetDecision,
  benchLog,
  type EngineHandle,
} from './local-gpu-bench';

type DocKey = 'adr025' | 'bp04';

// 侧栏日志：type 决定配色（倒序渲染，最新在上）
type LogType = 'info' | 'progress' | 'switch' | 'rule' | 'model' | 'warn' | 'ok' | 'error';
interface LogEntry { id: number; type: LogType; ts: string; text: string; }

const LOG_COLORS: Record<LogType, string> = {
  info: 'text-slate-400',
  progress: 'text-cyan-400',
  switch: 'text-emerald-400',
  rule: 'text-amber-300',
  model: 'text-violet-400',
  warn: 'text-orange-400',
  ok: 'text-emerald-300',
  error: 'text-red-400',
};

function LogPanel({ entries, empty }: { entries: LogEntry[]; empty: string }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-slate-900/80 p-2 font-mono text-[9px] leading-relaxed">
      {entries.length === 0 ? (
        <span className="text-slate-600">{empty}</span>
      ) : entries.map((l) => (
        <div key={l.id} className="whitespace-pre-wrap break-all">
          <span className="text-slate-600">{l.ts}</span>{' '}
          <span className={LOG_COLORS[l.type]}>{l.text}</span>
        </div>
      ))}
    </div>
  );
}

const DOC_LABELS: Record<DocKey, string> = {
  adr025: 'ADR-025 · Kinematic Token',
  bp04: 'BP-04 · Observability Platform',
};

const FORM_LABELS: Record<FormKey, string> = {
  academic: 'Academic',
  playbook: 'Playbook',
  narrative: 'Narrative',
};

const INTENT_EXAMPLES = [
  'An ops runbook for the team, English, steps only',
  'A narrative summary for the executive, Chinese',
  'A formal bilingual paper for review',
];

function lexDoc(key: DocKey): DocumentContent {
  return key === 'adr025' ? fromAdr(ADR_025) : fromBlueprint(BP_04);
}

function nearestPreset(spec: FormSpec): FormKey {
  let best: FormKey = 'academic';
  let bestScore = -1;
  for (const key of Object.keys(FORM_PRESETS) as FormKey[]) {
    const p = FORM_PRESETS[key];
    let score = 0;
    if (p.surface.tone === spec.surface.tone) score++;
    if (p.typography.family === spec.typography.family) score++;
    if (p.typography.scale === spec.typography.scale) score++;
    if (p.structure.header === spec.structure.header) score++;
    if (p.structure.formula === spec.structure.formula) score++;
    if (p.structure.divider === spec.structure.divider) score++;
    if (p.density.lang === spec.density.lang) score++;
    if (p.density.collapseSections === spec.density.collapseSections) score++;
    if (p.density.showAbstract === spec.density.showAbstract) score++;
    if (p.rhythm.listMarker === spec.rhythm.listMarker) score++;
    if (p.rhythm.calloutBorder === spec.rhythm.calloutBorder) score++;
    if (p.motion.reveal === spec.motion.reveal) score++;
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return best;
}

function Switcher<T extends string>({ current, options, onSwitch }: {
  current: T; options: Record<T, string>; onSwitch: (k: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 gap-1 shadow-2xl">
      {(Object.keys(options) as T[]).map((k) => {
        const active = k === current;
        return (
          <button
            key={k} type="button" onClick={() => onSwitch(k)} tabIndex={0} aria-pressed={active}
            className={`rounded-lg px-4 py-2 text-left transition-all duration-200 ${
              active ? 'bg-zinc-900 text-white shadow-lg scale-[1.02]' : 'text-zinc-600 hover:bg-slate-100'
            }`}
          >
            <span className="block text-sm font-bold">{options[k]}</span>
          </button>
        );
      })}
    </div>
  );
}

function Demo() {
  const [docKey, setDocKey] = useState<DocKey>('adr025');
  const [spec, setSpec] = useState<FormSpec>(() => getPreset('academic'));
  const [intent, setIntent] = useState('');
  const [pending, setPending] = useState(false);
  const [intentMeta, setIntentMeta] = useState<{ matched: string; description: string } | null>(null);
  // 本地 GPU 基准测试状态
  const [bootState, setBootState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [bootPct, setBootPct] = useState(0);
  const [bootLog, setBootLog] = useState<LogEntry[]>([]);
  const [engineHandle, setEngineHandle] = useState<EngineHandle | null>(null);
  const [modelParams, setModelParams] = useState<Record<string, string> | null>(null);
  const [switchMs, setSwitchMs] = useState<{ tag: string; ms: number }[]>([]);
  const bootT0 = useRef<number>(0);
  const logSeq = useRef(0);

  const revealKey = useMemo(() => Date.now(), [docKey, spec]);
  const doc = useMemo(() => lexDoc(docKey), [docKey]);
  const form = nearestPreset(spec);

  // 时间戳，如 10:23:45.678
  function ts() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  }

  // 倒序：新日志插到最前。type 决定配色。
  function pushLog(type: LogType, text: string) {
    const entry: LogEntry = { id: logSeq.current++, type, ts: ts(), text };
    setBootLog((prev) => [entry, ...prev].slice(0, 150));
  }

  // 默认自动冷启动：页面挂载即预热本地 0.5B 模型，无需用户点击。
  useEffect(() => {
    coldStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function coldStart() {
    if (bootState === 'loading' || (engineHandle && bootState === 'ready')) return;
    setBootState('loading');
    setBootPct(0);
    bootT0.current = performance.now();
    pushLog('info', 'Booting local 0.5B model (WebGPU)...');
    const h = await bootLocalEngine((p, text) => {
      setBootPct(p);
      pushLog('progress', text);
    });
    if (h) {
      setBootPct(100);
      setEngineHandle(h);
      setModelParams(h.params);
      pushLog('ok', benchLog('cold-start · total', performance.now() - bootT0.current,
        `bytes=${h.loadedBytes} params=${JSON.stringify(h.params)}`));
      pushLog('ok', `Model ready · ${h.initMs.toFixed(0)}ms init`);
      setBootState('ready');
    } else {
      setBootState('failed');
      pushLog('error', 'WebGPU unavailable or load failed — falling back to rules engine');
    }
  }

  function measureSwitch(label: string, fn: () => void) {
    const t0 = performance.now();
    fn();
    // 渲染计时：等一帧让 React 提交 DOM
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const ms = performance.now() - t0;
      const line = benchLog(`switch-form · ${label}`, ms);
      setSwitchMs((prev) => [{ tag: label, ms }, ...prev].slice(0, 8));
      pushLog('switch', line);
    }));
  }

  async function submitIntent() {
    const text = intent.trim();
    if (!text || pending) return;
    setPending(true);
    const t0 = performance.now();
    try {
      // 规则先行：有把握 → 权威（0.5B 无权覆盖确定性规则）
      const rules = ruleFallback(text);
      if (ruleHasConfidence(text)) {
        const ms = performance.now() - t0;
        pushLog('rule', benchLog('intent · rule hit', ms, `preset=${rules.matched}`));
        setSpec(rules.spec);
        setIntentMeta({ matched: rules.matched, description: describeSpecEn(rules.spec) });
        return;
      }
      // 规则不确定 → 本地模型（若已冷启动）；失败降级规则
      if (engineHandle) {
        const preset = await localPresetDecision(text, engineHandle);
        if (preset) {
          const spec2 = getPreset(preset as FormKey);
          const ms = performance.now() - t0;
          pushLog('model', benchLog('intent · local model', ms, `preset=${preset}`));
          setSpec(spec2);
          setIntentMeta({ matched: `local model · ${preset}`, description: describeSpecEn(spec2) });
          return;
        }
        pushLog('warn', '[Bench] local model produced nothing — fallback to rules');
      }
      const ms = performance.now() - t0;
      pushLog('rule', benchLog('intent · rule fallback', ms, `preset=${rules.matched}`));
      setSpec(rules.spec);
      setIntentMeta({ matched: rules.matched, description: describeSpecEn(rules.spec) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-900 flex gap-6 p-6">
      {/* 左侧：benchmark / log 侧栏 */}
      <aside className="w-72 shrink-0 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 shadow-xl flex flex-col gap-3 h-fit sticky top-6">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-slate-400">
            Local GPU · 0.5B bench
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            bootState === 'ready' ? 'bg-emerald-500/20 text-emerald-300'
              : bootState === 'loading' ? 'bg-amber-500/20 text-amber-300'
              : bootState === 'failed' ? 'bg-red-500/20 text-red-300'
              : 'bg-slate-700 text-slate-300'
          }`}>
            {bootState === 'ready' ? `READY ${engineHandle?.initMs?.toFixed(0)}ms`
              : bootState === 'loading' ? `${bootPct}%`
              : bootState === 'failed' ? 'FAILED'
              : 'IDLE'}
          </span>
        </div>

        {bootState === 'loading' && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-amber-500 transition-all duration-200" style={{ width: `${bootPct}%` }} />
          </div>
        )}

        {modelParams && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(modelParams).map(([k, v]) => (
              <span key={k} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">{k}={v}</span>
            ))}
          </div>
        )}

        {switchMs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {switchMs.map((s, i) => (
              <span key={i} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                switch {s.tag} · {s.ms.toFixed(1)}ms
              </span>
            ))}
          </div>
        )}

        <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-2">Log</div>
        <LogPanel entries={bootLog} empty="// benchmarks also logged to console with [Bench] prefix" />
      </aside>

      {/* 右侧：主内容 */}
      <div className="max-w-3xl w-full mx-auto flex flex-col items-stretch gap-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1">Content Interpreter · AI + App</p>
            <h1 className="text-2xl font-bold text-white">Say intent. Model decides. Code renders.</h1>
          </div>
          <Switcher current={form} options={FORM_LABELS}
            onSwitch={(k) => measureSwitch(k, () => { setSpec(getPreset(k)); setIntentMeta(null); })} />
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4 shadow-xl">
          <label htmlFor="intent" className="mb-2 block text-xs uppercase tracking-widest text-slate-400">
            Say what you want — the interpreter decides the form
          </label>
          <div className="flex gap-2">
            <input
              id="intent" type="text" value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitIntent()}
              placeholder='e.g. "An ops runbook in English, steps only"'
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none ring-1 ring-slate-700 focus:ring-amber-400"
            />
            <button
              type="button" onClick={submitIntent} disabled={pending || !intent.trim()}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-40"
            >
              {pending ? 'Deciding…' : 'Decide'}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTENT_EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setIntent(ex)}
                className="rounded-full border border-slate-500 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:border-amber-400 hover:text-amber-200 hover:bg-slate-700">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {intentMeta && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
            <span className="mr-2 font-bold text-amber-300">{intentMeta.matched}</span>
            <span className="text-amber-200/80">{intentMeta.description}</span>
          </div>
        )}

        <Switcher current={docKey} options={DOC_LABELS} onSwitch={setDocKey} />
        <Interpret key={revealKey} doc={doc} spec={spec} />
      </div>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<Demo />);
}