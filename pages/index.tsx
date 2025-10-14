// pages/index.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from "react";
import dynamic from "next/dynamic";

// dynamic imports to avoid SSR issues with Recharts in Next.js
const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

type Network = { id: string; name: string };
type Vulnerability = { type: string; severity: string; description?: string; locations?: Array<{ file?: string; lines?: number[] }>; functions?: string[] };
type ScanResult = {
  id?: string;
  contract?: string;
  network?: string;
  timestamp?: string;
  vulnerabilities?: Vulnerability[];
  metrics?: {
    total_vulnerabilities?: number;
    severity_breakdown?: Record<string, number>;
    vulnerable_lines?: number;
    total_lines?: number;
    scan_duration?: number;
  };
  code_insights?: { imports?: string[]; external_libraries?: number; functions_analyzed?: number; compiler_version?: string };
  risk_score?: number;
  comparative?: { rank?: number | null; vulnerability_density?: number; riskiest_contracts?: Array<{ name: string; risk_score: number }>; networks?: Array<{ name: string; scans: number }>; word_cloud?: Array<{ text: string; value: number }> };
  recommendations?: Array<{ type: string; advice: string }>;
};

type HistoryRow = { id?: string; timestamp: string; contract_path: string; vulnerabilities_found?: number; severity_breakdown?: Record<string, number>; scan_duration?: number; network?: string; risk_score?: number; raw?: any };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
};

export default function IndexPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchNetworks();
    fetchHistory();
    fetchStats();
  }, []);

  async function fetchNetworks() {
    try {
      const res = await fetch(`${API_BASE}/api/networks`);
      const json = await res.json();
      const nets: Network[] = json?.networks || json || [];
      setNetworks(nets);
      if (nets.length && !selectedNetwork) setSelectedNetwork(nets[0].id);
    } catch (e) {
      setNetworks([{ id: "mainnet", name: "Ethereum" }, { id: "polygon", name: "Polygon" }]);
      if (!selectedNetwork) setSelectedNetwork("mainnet");
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch(`${API_BASE}/api/history`);
      const json = await res.json();
      setHistory(Array.isArray(json.scans) ? json.scans : []);
    } catch {
      setHistory([]);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const json = await res.json();
      setStats(json);
    } catch {
      setStats(null);
    }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (f && !f.name.endsWith(".sol")) { setError("Only .sol files allowed."); setFile(null); return; }
    setError(null); setFile(f);
  }

  async function handleScan(e?: FormEvent) {
    if (e) e.preventDefault();
    setError(null); setSuccessMessage(null);
    if (!address && !file) { setError("Provide contract address or upload a .sol file."); return; }
    if (!selectedNetwork) { setError("Select a network."); return; }

    setLoading(true); setResult(null);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("network", selectedNetwork);
        if (address) fd.append("address", address);
        res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: fd });
      } else {
        res = await fetch(`${API_BASE}/api/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, network: selectedNetwork }) });
      }
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const sr = json?.scan_result || json?.scanResult || json;
      setResult(sr || null);
      setSuccessMessage("Scan completed");
      await fetchHistory();
      await fetchStats();
    } catch (err: any) { setError(err?.message || String(err)); } finally { setLoading(false); }
  }

  async function handleClearHistory() {
    if (!confirm("Clear all history?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/history`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear history");
      setHistory([]); setStats(null);
    } catch (e: any) { setError(String(e)); }
  }

  // Derived values
  const severityBreakdown = result?.metrics?.severity_breakdown || {};
  const severityData = useMemo(() => {
    return Object.entries(severityBreakdown).map(([name, value]) => ({ name, value }));
  }, [severityBreakdown]);

  const totalVulns = result?.metrics?.total_vulnerabilities ?? (result?.vulnerabilities?.length ?? 0);
  const scanDuration = result?.metrics?.scan_duration ?? "-";
  const riskScore = result?.risk_score ?? (result?.metrics ? Math.min(100, (result.metrics.total_vulnerabilities || 0) * 10) : 0);

  // timeline from history
  const timelineData = (history || []).slice(0, 20).reverse().map(h => ({ name: new Date(h.timestamp).toLocaleTimeString(), vulns: h.vulnerabilities_found || 0 }));

  // severity totals across history for bar chart
  const severityTotals = (history || []).reduce((acc: Record<string, number>, h) => {
    const br = h.severity_breakdown || {};
    Object.entries(br).forEach(([k, v]) => acc[k] = (acc[k] || 0) + (v as number));
    return acc;
  }, { critical: 0, high: 0, medium: 0, low: 0, informational: 0 });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Smart Contract Vulnerability Scanner — Dashboard</h1>
            <p className="text-sm text-slate-600">Risk · Code Insights · Operations · Comparative</p>
          </div>
          <div className="text-sm text-slate-500">API: <span className="font-mono text-xs">{API_BASE}</span></div>
        </header>

        {/* Scan form */}
        <section className="bg-white rounded-2xl shadow p-5 mb-6">
          <form onSubmit={handleScan} className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-6">
              <label className="text-xs text-slate-500">Contract address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="0x..." className="mt-1 block w-full rounded border px-3 py-2" />
            </div>
            <div className="col-span-3">
              <label className="text-xs text-slate-500">Network</label>
              <select value={selectedNetwork} onChange={e => setSelectedNetwork(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2">
                {networks.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="text-xs text-slate-500">Severity filter</label>
              <select multiple value={severityFilter} onChange={e => setSeverityFilter(Array.from(e.target.selectedOptions, o => o.value))} className="mt-1 block w-full rounded border px-3 py-2 h-10 text-xs">
                {["critical","high","medium","low","informational"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="col-span-9">
              <label className="text-xs text-slate-500">Upload .sol (optional)</label>
              <input id="file-input" type="file" accept=".sol" onChange={onFileChange} className="mt-1 block w-full" />
            </div>

            <div className="col-span-3 flex gap-2">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded"> {loading ? "Scanning…" : "Scan"} </button>
              <button type="button" onClick={() => { setAddress(""); setFile(null); const fi = document.getElementById("file-input") as HTMLInputElement | null; if (fi) fi.value = ""; }} className="px-4 py-2 bg-slate-100 rounded">Clear</button>
            </div>

            <div className="col-span-12 mt-2">
              {error && <div className="text-sm text-rose-600">{error}</div>}
              {successMessage && <div className="text-sm text-emerald-600">{successMessage}</div>}
            </div>
          </form>
        </section>

        {/* Dashboard grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left column: Risk + top vulns */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Risk Overview</div>
                  <div className="text-3xl font-bold">{riskScore}%</div>
                  <div className="text-xs text-slate-500 mt-1">Overall risk (higher is worse)</div>
                </div>
                <div className="w-36 h-36 flex items-center justify-center">
                  <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#fb7185 ${riskScore*3.6}deg, #cbd5e1 0deg)` }}>
                    <div className="text-sm font-semibold">{riskScore}%</div>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-slate-400">Severity Breakdown</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(result?.metrics?.severity_breakdown || { critical:0, high:0, medium:0, low:0, informational:0 }).map(([k,v]) => (
                    <div key={k} className="p-2 bg-slate-50 rounded flex justify-between">
                      <div className="capitalize text-xs text-slate-600">{k}</div>
                      <div className="font-medium">{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="text-sm font-semibold">Top Vulnerabilities</div>
              <div className="mt-3 space-y-2 max-h-56 overflow-auto">
                {(result?.vulnerabilities || []).slice(0,6).map((v, i) => (
                  <div key={i} className="p-2 bg-slate-50 rounded">
                    <div className="flex justify-between">
                      <div className="font-medium">{v.type}</div>
                      <div className="text-xs text-slate-500">{v.severity}</div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{v.description}</div>
                  </div>
                ))}
                {(result?.vulnerabilities || []).length === 0 && <div className="text-sm text-slate-500">No vulnerabilities to show.</div>}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="text-sm font-semibold">Code Insights</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-400">Lines of Code</div>
                  <div className="font-bold">{result?.metrics?.total_lines ?? result?.code_insights?.lines_of_code ?? "-"}</div>
                </div>
                <div className="p-2 bg-slate-50 rounded">
                  <div className="text-xs text-slate-400">Functions Analyzed</div>
                  <div className="font-bold">{result?.code_insights?.functions_analyzed ?? "-"}</div>
                </div>
                <div className="col-span-2 mt-2 text-xs text-slate-500">Imports: {(result?.code_insights?.imports || []).slice(0,3).join(", ") || "-"}</div>
              </div>
            </div>
          </div>

          {/* Right column: Charts + Results */}
          <div className="col-span-8 space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Activity — Recent Scans</div>
                  <div className="text-xs text-slate-400">Last {timelineData.length} scans</div>
                </div>
                <div className="text-xs text-slate-400">Avg Vulns: {history.length ? (history.reduce((a,h)=>a+(h.vulnerabilities_found||0),0)/history.length).toFixed(2) : 0}</div>
              </div>
              <div className="mt-3 h-56">
                {timelineData.length > 0 ? (
                  // @ts-ignore
                  <ResponsiveContainer width="100%" height="100%">
                    {/* @ts-ignore */}
                    <LineChart data={timelineData}>
                      {/* @ts-ignore */}
                      <CartesianGrid strokeDasharray="3 3" />
                      {/* @ts-ignore */}
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      {/* @ts-ignore */}
                      <YAxis />
                      {/* @ts-ignore */}
                      <Tooltip />
                      {/* @ts-ignore */}
                      <Line type="monotone" dataKey="vulns" stroke="#ef4444" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="text-sm text-slate-500">No activity yet.</div>}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-6 bg-white rounded-2xl p-4 shadow">
                <div className="text-sm font-semibold">Severity Distribution (Current Scan)</div>
                <div className="h-40 mt-3">
                  {severityData.length > 0 ? (
                    // @ts-ignore
                    <ResponsiveContainer width="100%" height="100%">
                      {/* @ts-ignore */}
                      <PieChart>
                        {/* @ts-ignore */}
                        <Pie data={severityData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={60} label>
                          {severityData.map((entry, i) => <Cell key={i} fill={["#ef4444","#fb923c","#f59e0b","#60a5fa","#a78bfa"][i%5]} />)}
                        </Pie>
                        {/* @ts-ignore */}
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div className="text-sm text-slate-500">No severity data</div>}
                </div>
              </div>

              <div className="col-span-6 bg-white rounded-2xl p-4 shadow">
                <div className="text-sm font-semibold">Totals by Severity (History)</div>
                <div className="h-40 mt-3">
                  {Object.keys(severityTotals).length > 0 ? (
                    // @ts-ignore
                    <ResponsiveContainer width="100%" height="100%">
                      {/* @ts-ignore */}
                      <BarChart data={Object.entries(severityTotals).map(([k,v])=>({name:k, value:v}))}>
                        {/* @ts-ignore */}
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        {/* @ts-ignore */}
                        <YAxis />
                        {/* @ts-ignore */}
                        <Tooltip />
                        {/* @ts-ignore */}
                        <Bar dataKey="value" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="text-sm text-slate-500">No history data</div>}
                </div>
              </div>
            </div>

            {/* Detailed result */}
            <div className="bg-white rounded-2xl p-4 shadow">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Vulnerability Report</div>
                <div className="text-xs text-slate-500">{formatDate(result?.timestamp)}</div>
              </div>

              {!result && <div className="text-sm text-slate-500 mt-4">Run a scan to view findings here.</div>}

              {result && (
                <div className="mt-4 grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <div className="text-xs text-slate-400">Contract</div>
                    <div className="font-mono text-sm break-all">{result.contract || result.id}</div>

                    <div className="mt-3">
                      <div className="text-sm font-medium">Findings</div>
                      <div className="mt-2 space-y-2 max-h-72 overflow-auto">
                        {(result.vulnerabilities || []).filter((v:any)=> severityFilter.length ? severityFilter.includes(v.severity) : true).map((v:any,i:number)=>(
                          <div key={i} className="p-3 bg-slate-50 rounded">
                            <div className="flex justify-between">
                              <div>
                                <div className="font-medium">{v.type} <span className="text-xs text-slate-500">({v.severity})</span></div>
                                <div className="text-xs text-slate-500 mt-1">{v.description}</div>
                              </div>
                              <div className="text-xs text-slate-400">{v.locations?.[0]?.file || ""}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-4">
                    <div className="text-xs text-slate-400">Code Insights</div>
                    <div className="mt-2 text-sm">
                      <div>Compiler: {result?.code_insights?.compiler_version ?? "-"}</div>
                      <div>Imports: {(result?.code_insights?.imports || []).slice(0,3).join(", ") || "-"}</div>
                      <div className="mt-2">Recommendations:</div>
                      <ul className="text-sm mt-1 space-y-1">
                        {(result?.recommendations || []).map((r:any, idx:number)=>(<li key={idx} className="bg-slate-50 p-2 rounded text-xs"><strong>{r.type}:</strong> {r.advice}</li>))}
                        {(result?.recommendations || []).length===0 && <li className="text-xs text-slate-500">No suggestions available.</li>}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History table */}
        <section className="bg-white rounded-2xl p-4 shadow mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Recent Scans</h3>
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-500">{history.length} results</div>
              <button className="bg-rose-500 text-white px-3 py-1 rounded" onClick={handleClearHistory}>Clear History</button>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pl-2">#</th>
                  <th>Contract</th>
                  <th>Network</th>
                  <th>Timestamp</th>
                  <th>Vulns</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => (
                  <tr key={(h.id||h.timestamp)+idx} className="border-b hover:bg-slate-50">
                    <td className="py-2 pl-2">{idx+1}</td>
                    <td className="py-2">{h.contract_path}</td>
                    <td className="py-2">{h.network ?? "-"}</td>
                    <td className="py-2">{formatDate(h.timestamp)}</td>
                    <td className="py-2">{h.vulnerabilities_found ?? 0}</td>
                    <td className="py-2">{h.risk_score ?? "-"}</td>
                  </tr>
                ))}
                {history.length===0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No history yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
