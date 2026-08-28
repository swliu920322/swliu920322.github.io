/**
 * standalone 本地 GPU 基准测试模块（Content Interpreter 0.5B）。
 *
 * 与 Next 版 local-gpu.ts 同源，但为 standalone 静态托管单独实现：
 *  - web-llm 通过 importmap 从 CDN 加载（bundle 保持 external，worker/wasm 路径不受打包影响）
 *  - 记录冷启动参数 / 意图识别耗时 / 形态切换耗时，全部打 console.log
 *  - 永不挂起：超时兜底，失败降级规则
 */
const LOCAL_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';

const PRESET_GRAMMAR = String.raw`
root ::= "{" ws "\"preset\"" ws ":" ws "\"" preset "\"" ws "}"
preset ::= "academic" | "playbook" | "narrative"
ws ::= [ \n\t]*
`;

const SYSTEM_PROMPT = `You are the display parameter router for a document interpreter.
Given the user's intent about their audience, pick the single most fitting document form.
Respond with exactly the requested JSON: {"preset":"academic"} or {"preset":"playbook"} or {"preset":"narrative"}.
Operations staff / runbook / procedures -> playbook.
Executive / narrative / story / presentation -> narrative.
Review / academic / bilingual formal doc -> academic.
Output ONLY the JSON, nothing else.`;

export interface EngineHandle {
  engine: any;
  initMs: number;
  loadedBytes: number;
  params: Record<string, string>;
  progressLog: string[];
}

let cached: EngineHandle | null = null;
let initPromise: Promise<EngineHandle | null> | null = null;

/** 计时工具：所有测量统一打 console，面板用返回值展示。 */
export function benchLog(tag: string, ms: number, extra = '') {
  const line = `[Bench] ${tag}: ${ms.toFixed(1)}ms${extra ? '  ·  ' + extra : ''}`;
  console.log(line);
  return line;
}

function formatBytes(n: number): string {
  if (n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 冷启动：加载 0.5B 模型（首次从 CDN 下载 wasm + 权重）。
 * 记录 initProgressCallback 的每个阶段，返回初始化耗时/下载量/模型参数。
 * 幂等：重复调用复用缓存引擎。
 */
export async function bootLocalEngine(onProgress?: (p: number, text: string) => void): Promise<EngineHandle | null> {
  if (typeof window === 'undefined' || !('gpu' in navigator)) {
    console.warn('[Bench] WebGPU not available in this browser.');
    return null;
  }
  if (cached) return cached;
  if (!initPromise) {
    initPromise = (async () => {
      const t0 = performance.now();
      const progressLog: string[] = [];
      let loadedBytes = 0;

      // 通过 importmap 动态加载 web-llm（build 里 --external，运行时走 CDN）
      const webLLM = await import('@mlc-ai/web-llm');
      const initT0 = performance.now();
      const engine = await webLLM.CreateMLCEngine(LOCAL_MODEL, {
        initProgressCallback: (report: any) => {
          loadedBytes = report.loadedBytes ?? loadedBytes;
          const text = report.text ?? '';
          const pct = Math.round((report.progress ?? 0) * 100);
          const el = (report.timeElapsed ?? 0).toFixed(1);
          const line = `${text} [${pct}%] ${formatBytes(loadedBytes)} elapsed ${el}s`;
          progressLog.push(line);
          console.log(`[Bench][cold-start] ${line}`);
          onProgress?.(pct, line);
        },
      });
      const initMs = performance.now() - initT0;

      const handle: EngineHandle = {
        engine,
        initMs,
        loadedBytes,
        progressLog,
        params: await collectModelParams(engine),
      };
      benchLog('cold-start · model init',
        initMs,
        `model=${LOCAL_MODEL} bytes=${formatBytes(loadedBytes)}`);
      console.log(`[Bench] cold-start total (download+compile): ${((performance.now() - t0) / 1000).toFixed(1)}s`);
      cached = handle;
      return handle;
    })();
  }
  return initPromise;
}

async function collectModelParams(engine: any): Promise<Record<string, string>> {
  const params: Record<string, string> = { model: LOCAL_MODEL };
  try {
    const cfg = engine?.getConfig?.() ?? engine?.config;
    if (cfg?.model?.model_id) params['model_id'] = cfg.model.model_id;
    if (cfg?.model?.quantization) params['quant'] = cfg.model.quantization;
    if (cfg?.model?.params) params['params'] = String(cfg.model.params);
    if (cfg?.model?.local_id) params['local_id'] = cfg.model.local_id;
    if (cfg?.model?.model_lib) params['lib'] = String(cfg.model.model_lib);
  } catch {
    /* 拿不到就算了，不阻塞 */
  }
  try {
    const info = await engine?.getModelInfo?.();
    if (info?.model_name) params['model_name'] = info.model_name;
  } catch {
    /* ignore */
  }
  return params;
}

/**
 * 受限决策：本地模型三选一（grammar 锁死合法输出空间）。
 * 返回 preset 或 null（失败/超时）。调用方降级到规则。
 */
export async function localPresetDecision(intent: string, handle: EngineHandle | null): Promise<string | null> {
  if (!handle) return null;
  const t0 = performance.now();
  try {
    const reply = await handle.engine.chatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: intent },
      ],
      temperature: 0,
      max_tokens: 48,
      response_format: { type: 'grammar', grammar: PRESET_GRAMMAR },
    });
    const text: string = reply?.choices?.[0]?.message?.content ?? '';
    const m = text.match(/"preset"\s*:\s*"(academic|playbook|narrative)"/);
    const ms = performance.now() - t0;
    benchLog('intent · local model', ms, `preset=${m?.[1] ?? 'none'}`);
    return m ? m[1] : null;
  } catch (err) {
    const ms = performance.now() - t0;
    benchLog('intent · local model FAILED', ms, String((err as Error)?.message ?? err).slice(0, 80));
    return null;
  }
}