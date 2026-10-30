import React, { useState, useEffect } from 'react';
import { FileText, Download, CheckCircle2, RefreshCw, Printer, AlertTriangle } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

export default function ReportsPage({ project }) {
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchReports = async () => {
    if (!project?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project._id}/reports`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        if (data.reports?.length > 0 && !activeReport) {
          setActiveReport(data.reports[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch project reports:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!project?._id) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project._id,
          jobId: `job-${Date.now().toString(36)}`,
          formats: ['html', 'pdf', 'md', 'json']
        })
      });
      if (res.ok) {
        const data = await res.json();
        setReports([data.report, ...reports]);
        setActiveReport(data.report);
      }
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [project]);

  const reportData = activeReport?.contentJson;
  const ex = reportData?.executiveSummary;

  return (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-400" />
            Final Optimization Reports &amp; Artifacts
            <InfoTooltip term="nfr_scorecard" />
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Statistically verified executive reports formatted in self-contained HTML, print-ready PDF, Markdown, and JSON.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Compiling Artifacts...' : 'Generate New Report'}</span>
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
          <FileText className="w-12 h-12 text-slate-600 mx-auto" />
          <div>
            <h3 className="font-bold text-white text-base">No Optimization Reports Compiled</h3>
            <p className="text-xs text-slate-500 mt-1">Generate a report to compile all benchmark metrics, diffs, and lessons into downloadable artifacts.</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-black font-bold rounded-xl text-xs"
          >
            Generate Report Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Report Selector Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Reports</h3>
            <div className="space-y-2">
              {reports.map((r) => {
                const isSelected = activeReport?._id === r._id;
                return (
                  <button
                    key={r._id}
                    onClick={() => setActiveReport(r)}
                    className={`w-full text-left p-3.5 rounded-xl border transition text-xs ${
                      isSelected 
                        ? 'bg-sky-950/40 border-sky-500/50 text-white shadow-md' 
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="font-bold text-sm text-sky-400">{r.title}</div>
                    <div className="text-[11px] text-slate-500 mt-1">Job: {r.jobId}</div>
                    <div className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Report View & Downloads */}
          <div className="lg:col-span-3 space-y-6">
            {activeReport && (
              <>
                {/* Download Bar */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2 text-xs text-slate-300">
                    <span className="font-bold">Download Artifacts:</span>
                    <span className="text-slate-500 font-mono">Job: {activeReport.jobId}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={`/api/reports/${activeReport._id}/download?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </a>

                    <a
                      href={`/api/reports/${activeReport._id}/download?format=html`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-sky-600/20 text-sky-300 hover:bg-sky-600/30 border border-sky-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>HTML</span>
                    </a>

                    <a
                      href={`/api/reports/${activeReport._id}/download?format=md`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Markdown</span>
                    </a>

                    <a
                      href={`/api/reports/${activeReport._id}/download?format=json`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center space-x-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </a>
                  </div>
                </div>

                {/* 1-Page Plain-Language Summary */}
                {reportData?.plainLanguageSummary && (
                  <div className="bg-sky-950/20 border border-sky-500/30 rounded-xl p-5 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">Plain-Language Summary for Leadership</h4>
                      <InfoTooltip term="executive_health" />
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{reportData.plainLanguageSummary}</p>
                  </div>
                )}

                {/* Executive Summary Metrics Grid */}
                {ex && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Baseline P95</span>
                        <InfoTooltip term="latency_p95" />
                      </div>
                      <div className="text-xl font-bold text-sky-400 mt-1">{ex.baselineP95Ms} ms</div>
                      <span className="text-[11px] text-slate-500">at {ex.baselineRps} req/sec</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Optimized P95</span>
                        <InfoTooltip term="latency_p95" />
                      </div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{ex.finalP95Ms} ms</div>
                      <span className="text-[11px] text-emerald-400 font-bold">-{ex.p95ReductionPct}% Latency</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Patches Accepted</span>
                        <InfoTooltip term="agent_loop" />
                      </div>
                      <div className="text-xl font-bold text-white mt-1">{ex.acceptedCount} <span className="text-xs text-slate-500">/ {ex.totalExperiments}</span></div>
                      <span className="text-[11px] text-slate-500">{ex.rejectedCount} rejected</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Compute Budget</span>
                        <InfoTooltip term="agent_loop" />
                      </div>
                      <div className="text-xl font-bold text-white mt-1">{ex.tokensSpent} <span className="text-xs text-slate-500">tokens</span></div>
                      <span className="text-[11px] text-slate-500">{ex.benchRunsSpent} bench runs</span>
                    </div>
                  </div>
                )}

                {/* Accepted Fixes List */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Accepted Code Patches &amp; Statistical Verification</h3>
                    <InfoTooltip term="mann_whitney" />
                  </div>
                  {reportData?.acceptedFixes?.length === 0 ? (
                    <p className="text-xs text-slate-500">No patches met empirical acceptance criteria in this run.</p>
                  ) : (
                    reportData?.acceptedFixes?.map((a, i) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-emerald-400 text-sm flex items-center space-x-2">
                            <span>{a.strategy.toUpperCase()} &mdash; {a.hotspot}</span>
                            <InfoTooltip term={`strategy_${a.strategy.toLowerCase()}`} />
                          </span>
                          <div className="flex items-center space-x-1">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-bold">
                              p={a.mannWhitneyP} (n={a.sampleSizeN})
                            </span>
                            <InfoTooltip term="wilson_interval" />
                          </div>
                        </div>
                        <p className="text-slate-400"><strong>Lesson:</strong> {a.lesson}</p>
                        <pre className="bg-slate-900 p-3 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto">
                          <code>{a.diff}</code>
                        </pre>
                      </div>
                    ))
                  )}
                </div>

                {/* Strategy Win Rates */}
                {reportData?.policyBehavior?.strategyWinRates && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center space-x-2 mb-3">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Policy Empirical Strategy Win Rates</h3>
                      <InfoTooltip term="wilson_interval" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                            <th className="py-2 px-3">
                              <span className="flex items-center space-x-1">
                                <span>Strategy</span>
                                <InfoTooltip term="strategy_cache" />
                              </span>
                            </th>
                            <th className="py-2 px-3">
                              <span className="flex items-center space-x-1">
                                <span>Trials (n)</span>
                                <InfoTooltip term="wilson_interval" />
                              </span>
                            </th>
                            <th className="py-2 px-3">Wins</th>
                            <th className="py-2 px-3">
                              <span className="flex items-center space-x-1">
                                <span>Win Rate</span>
                                <InfoTooltip term="reward_score" />
                              </span>
                            </th>
                            <th className="py-2 px-3">
                              <span className="flex items-center space-x-1">
                                <span>Wilson 95% CI</span>
                                <InfoTooltip term="wilson_interval" />
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {reportData.policyBehavior.strategyWinRates.map(s => (
                            <tr key={s.strategy} className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 font-bold text-slate-200 uppercase flex items-center space-x-1.5">
                                <span>{s.strategy}</span>
                                <InfoTooltip term={`strategy_${s.strategy.toLowerCase()}`} />
                              </td>
                              <td className="py-2.5 px-3 text-slate-400">{s.total}</td>
                              <td className="py-2.5 px-3 text-emerald-400">{s.wins}</td>
                              <td className="py-2.5 px-3 font-bold text-white">{(s.winRate * 100).toFixed(1)}%</td>
                              <td className="py-2.5 px-3 text-slate-400">
                                [{(s.ci95[0] * 100).toFixed(1)}%, {(s.ci95[1] * 100).toFixed(1)}%]
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
