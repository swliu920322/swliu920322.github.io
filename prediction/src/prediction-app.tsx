/**
 * KOL Prediction — standalone 页面逻辑（无后端，纯静态文件）。
 * 数据源：同目录 kol/ 下的 report_translated_{user_id}_{range_days}d.json，
 * 由 src/cloud-orchestrator/run_analysis.py 离线生成后拷贝进来。
 */
import React, { useEffect, useState } from 'react';
import { RefreshCw, Terminal } from 'lucide-react';
import {
  Header,
  AnalysisCharts,
  Watchlist,
  ChainAnalysis,
  TweetTimeline,
  Kol,
  ReportData
} from '../../../src/client-edge/src/app/prediction/components';

const KOL_LIST: Kol[] = [
  { id: '1940360837547565056', name: 'Aleabitoreddit (默认标的)' }
];

const KOL_ID = '1940360837547565056';

export default function PredictionApp() {
  const [kols, setKols] = useState<Kol[]>(KOL_LIST);
  const [selectedKolId, setSelectedKolId] = useState<string>(KOL_ID);
  const [report, setReport] = useState<ReportData | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('30');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReport(selectedKolId, timeFilter);
  }, [selectedKolId, timeFilter]);

  // 直接从静态文件读取报告（kol/ 目录投放）。文件命名与 run_analysis.py
  // 生成的 daily_cache 一致：report_translated_{user_id}_{range_days}d.json，
  // 兼容无后缀版本作为 30d 降级。
  const fetchReport = async (kolId: string, days: string) => {
    setLoading(true);
    setError(null);
    try {
      const candidates = [
        `./kol/report_translated_${kolId}_${days}d.json`,
        `./kol/report_translated_${kolId}.json`,
      ];
      let data: ReportData | null = null;
      for (const url of candidates) {
        const res = await fetch(url);
        if (res.ok) {
          data = await res.json();
          break;
        }
      }
      if (data) {
        setReport(data);
      } else {
        setReport(null);
        setError(`该大 V 暂无近 ${days} 天的抓取对比数据。`);
      }
    } catch (e) {
      setReport(null);
      setError('无法加载数据文件，请确认 kol/ 目录包含对应报告。');
    } finally {
      setLoading(false);
    }
  };

  // 数据已由 run_analysis.py 根据 range_days 在报告中归档过滤好，直接消费
  const filteredTweets = report ? report.data : [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header (头部及全局操作栏) */}
        <Header
          kols={kols}
          selectedKolId={selectedKolId}
          onKolChange={setSelectedKolId}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          onRefresh={() => fetchReport(selectedKolId, timeFilter)}
          loading={loading}
          hasReport={false}
        />

        {/* Loading State */}
        {loading && !report && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/20 p-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-[#00f2fe] mx-auto" />
            <p className="text-xs text-slate-500">正在载入最新数据对照账本...</p>
          </div>
        )}

        {/* Error Alert */}
        {error && !loading && (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-rose-450 text-xs">
            {error}
          </div>
        )}

        {/* Report Content */}
        {report ? (
          <div className="space-y-6">

            {/* 2. Hot Topics & Industry Charts */}
            <AnalysisCharts
              hotTopics={report.hot_topics}
              industries={report.industries}
            />

            {/* 3. Conviction Watchlist */}
            <Watchlist watchlist={report.conviction_watchlist} />

            {/* 4. Bottlenecks & Value Chain Mapping */}
            <ChainAnalysis
              bottlenecks={report.supply_chain_bottlenecks}
              valueChain={report.value_chain_mapping}
            />

            {/* 5. Bilingual Tweet Timeline */}
            <TweetTimeline
              filteredTweets={filteredTweets}
              selectedKolId={selectedKolId}
              lastUpdated={report.last_updated}
            />

          </div>
        ) : (
          !loading && !error && (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center text-slate-500 space-y-6">
              <Terminal size={48} className="mx-auto text-slate-700 animate-pulse" />
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="font-bold text-slate-400">数据对照缓存文件未找到</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  请先在仓库内运行数据更新脚本生成报告，并把 JSON 拷入本页 kol/ 目录。
                </p>
              </div>
              <div className="inline-block rounded-2xl bg-slate-955 p-4 border border-slate-800/60 font-mono text-[10px] text-left text-slate-400 space-y-1">
                <div><span className="text-[#00f2fe]"># 1. 进入后端项目</span></div>
                <div>cd src/cloud-orchestrator</div>
                <div><span className="text-[#00f2fe]"># 2. 激活虚拟环境</span></div>
                <div>source .venv/bin/activate</div>
                <div><span className="text-[#00f2fe]"># 3. 运行翻页采集并让 AI 翻译与归纳</span></div>
                <div>python run_analysis.py</div>
                <div><span className="text-[#00f2fe]"># 4. 重新打包（自动同步报告到 kol/）</span></div>
                <div>cd standalone && make prediction</div>
              </div>
            </div>
          )
        )}

      </div>
    </main>
  );
}