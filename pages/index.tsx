import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import dynamic from "next/dynamic";

const PieChart = dynamic(() => import("recharts").then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then(m => m.Cell), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });

type Network = { id: string; name: string; chainId?: number | string };
type Vulnerability = { type: string; category: string; severity: string; description?: string; locations?: Array<{ file?: string; lines?: number[] }> };
type ScanResult = { id?: string; contract?: string; network?: string; timestamp?: string; vulnerabilities?: Vulnerability[]; metrics?: { total_lines?: number; vulnerable_lines?: number; total_vulnerabilities?: number; severity_breakdown?: Record<string, number>; scan_duration?: number } };
type HistoryRow = { id?: string; timestamp: string; contract_path: string; vulnerabilities_found?: number; severity_breakdown?: Record<string, number>; scan_duration?: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const formatDate = (iso?: string) => { try { return iso ? new Date(iso).toLocaleString() : "-"; } catch { return iso || "-"; } };
const severityToChartData = (breakdown?: Record<string, number>) => breakdown ? Object.entries(breakdown).map(([k, v]) => ({ name: k, value: v })) : [];

export default function DashboardPage() {
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [networks, setNetworks] = useState<Network[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Record<string, boolean>>({});
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => setCurrentTime(new Date().toLocaleString()), []);
  useEffect(() => { fetchNetworks(); fetchHistory(); }, []);

  async function fetchNetworks() {
    try {
      const res = await fetch(`${API_BASE}/api/networks`);
      const json = await res.json();
      setNetworks(json?.networks || []);
      if (json?.networks?.length) setSelectedNetwork(json.networks[0].id);
    } catch {
      setNetworks([{ id: "ethereum", name: "Ethereum" }, { id: "bsc", name: "Binance Smart Chain" }, { id: "polygon", name: "Polygon" }]);
      if (!selectedNetwork) setSelectedNetwork("ethereum");
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

  async function handleScan(e?: FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!address && !file) { setError("Provide contract address or file."); return; }
    if (!selectedNetwork) { setError("Select a network."); return; }

    setLoading(true); setResult(null);
    try {
      let res: Response;
      if (file) {
        const fd = new FormData(); fd.append("file", file); fd.append("network", selectedNetwork); if (address) fd.append("address", address);
        res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: fd });
      } else {
        res = await fetch(`${API_BASE}/api/scan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, network: selectedNetwork }) });
      }
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setResult(json || { vulnerabilities: [], metrics: {} });
      setSuccessMessage("Scan completed.");
      await fetchHistory();
    } catch (err: any) { setError(err.message || String(err)); } finally { setLoading(false); }
  }

  async function handleDeleteHistory(id?: string) {
    const ids = id ? [id] : Object.keys(selectedHistoryIds).filter(k => selectedHistoryIds[k]);
    if (!ids.length) { setError("No history selected."); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/history`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error(await res.text());
      setSuccessMessage("History deleted.");
      await fetchHistory(); setSelectedHistoryIds({});
    } catch (err: any) { setError(err.message || String(err)); } finally { setLoading(false); }
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    if (f && !f.name.endsWith(".sol")) { setError("Only .sol files allowed."); setFile(null); return; }
    setError(null); setFile(f);
  }

  function toggleHistorySelect(id?: string) { if (!id) return; setSelectedHistoryIds(s => ({ ...s, [id]: !s[id] })); }
  function clearForm() { setAddress(""); setFile(null); const fi = document.getElementById("file-input") as HTMLInputElement | null; if (fi) fi.value = ""; }

  const severityData = severityToChartData(result?.metrics?.severity_breakdown || result?.vulnerabilities?.reduce((acc: any, v) => { acc[v.severity] = (acc[v.severity] || 0) + 1; return acc; }, {}));

  const totalVulnerabilities = result?.metrics?.total_vulnerabilities ?? (Array.isArray(result?.vulnerabilities) ? result.vulnerabilities.length : 0);
  const scanDuration = result?.metrics?.scan_duration ?? "-";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <header className="flex items-center justify-between py-6">
          <div>
            <h1 className="text-2xl font-extrabold">Smart Contract Vulnerability Scanner Dashboard</h1>
            <p className="text-sm text-slate-600 mt-1">Multi-network · 50+ detectors · Realtime analysis · Historical tracking</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-700">API: <span className="font-mono text-xs">{API_BASE}</span></div>
            <div className="text-sm text-slate-500">Last refresh: <span className="font-medium">{currentTime}</span></div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="col-span-3 bg-white rounded-2xl p-4 shadow-sm">
            <nav className="space-y-4">
              {["Home","Scan Contract","Analytics","History","Settings"].map((t,i) => (
                <button key={i} className={`w-full text-left flex items-center gap-3 py-2 px-3 rounded ${t==="Scan Contract"?"bg-slate-100":"hover:bg-slate-50"}`}>
                  <span>{i===0?"🏠":i===1?"🛡️":i===2?"📈":i===3?"📜":"⚙️"}</span>
                  <span>{t}</span>
                </button>
              ))}
            </nav>

            <div className="mt-6 border-t pt-4">
              <div className="text-xs text-slate-500">Quick Stats</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-3 rounded">
                  <div className="text-xs text-slate-400">Total Scans</div>
                  <div className="text-lg font-semibold">{history.length}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <div className="text-xs text-slate-400">Total Vulnerabilities</div>
                  <div className="text-lg font-semibold">{history.reduce((acc,h)=>acc+(h.vulnerabilities_found||0),0)}</div>
                </div>
              </div>

              <div className="mt-4 text-center text-sm">
                <button className="px-3 py-2 bg-rose-500 text-white rounded" onClick={()=>handleDeleteHistory()} disabled={loading}>Delete Selected History</button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="col-span-9">
            {/* Scan Form */}
            <section className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Scan Contract</h2>
              <form className="mt-4 grid grid-cols-12 gap-4" onSubmit={handleScan}>
                <div className="col-span-7">
                  <label className="text-xs text-slate-600">Contract address</label>
                  <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="0x..." className="mt-1 block w-full rounded border px-3 py-2" />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-600">Network</label>
                  <select value={selectedNetwork} onChange={e=>setSelectedNetwork(e.target.value)} className="mt-1 block w-full rounded border px-3 py-2">
                    {networks.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-600">Severity filter</label>
                  <select multiple value={severityFilter} onChange={e=>setSeverityFilter(Array.from(e.target.selectedOptions,o=>o.value))} className="mt-1 block w-full rounded border px-3 py-2 h-10 text-xs">
                    {["critical","high","medium","low","informational"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="col-span-12">
                  <label className="text-xs text-slate-600">Upload .sol file</label>
                  <input id="file-input" type="file" accept=".sol" onChange={onFileChange} className="mt-1 block w-full" />
                </div>
                <div className="col-span-12 flex items-center gap-3 mt-2">
                  <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded" disabled={loading}>Scan</button>
                  <button type="button" className="px-4 py-2 bg-slate-100 rounded" onClick={clearForm}>Clear</button>
                  {loading && <div className="text-sm text-slate-500">Scanning…</div>}
                  {error && <div className="text-sm text-rose-600">{error}</div>}
                  {successMessage && <div className="text-sm text-emerald-600">{successMessage}</div>}
                </div>
              </form>
            </section>

            {/* Results */}
            {result && (
              <section className="mt-6 grid grid-cols-12 gap-6">
                <div className="col-span-7 bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-semibold">Vulnerability Report</h3>
                  <div className="mt-3 space-y-4">
                    <div className="text-xs text-slate-400">Contract</div>
                    <div className="font-mono text-sm break-all">{result.contract || result.id || "(uploaded file)"}</div>
                    <div className="text-xs text-slate-400 mt-2">Scanned</div>
                    <div className="text-sm">{formatDate(result.timestamp)}</div>

                    <div className="mt-4">
                      <div className="text-sm font-medium">Summary</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        <div className="p-3 bg-slate-50 rounded">
                          <div className="text-xs text-slate-400">Total Vulnerabilities</div>
                          <div className="text-lg font-bold">{totalVulnerabilities}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                          <div className="text-xs text-slate-400">Scan Duration</div>
                          <div className="text-lg font-bold">{scanDuration}</div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded">
                          <div className="text-xs text-slate-400">Vulnerable Lines</div>
                          <div className="text-lg font-bold">{result.metrics?.vulnerable_lines ?? "-"}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium">Vulnerabilities</div>
                      <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                        {(result.vulnerabilities || []).filter(v => severityFilter.length ? severityFilter.includes(v.severity) : true).map((v,i)=>(
                          <div key={i} className="p-3 bg-slate-50 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{v.type} <span className="text-xs text-slate-400">({v.severity})</span></div>
                                <div className="text-sm text-slate-600 mt-1">{v.description}</div>
                              </div>
                              <div className="text-xs text-slate-400">{v.locations?.[0]?.file || ""}</div>
                            </div>
                          </div>
                        ))}
                        {(result.vulnerabilities || []).length===0 && <div className="text-sm text-slate-500">No vulnerabilities found.</div>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-5 bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="font-semibold">Analytics</h3>
                  {severityData.length>0 ? (
                    <PieChart width={300} height={200}>
                      <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                        {severityData.map((entry,i)=><Cell key={i} fill={["#f87171","#fb923c","#facc15","#4ade80","#60a5fa"][i%5]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : <div className="text-sm text-slate-400">No severity data</div>}
                </div>
              </section>
            )}

            {/* History */}
            <section className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Recent Scans</h3>
                <div className="text-sm text-slate-500">{history.length} results</div>
              </div>

              <div className="mt-3 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b">
                      <th className="py-2 pl-2">#</th>
                      <th>Contract</th>
                      <th>Timestamp</th>
                      <th>Vulns</th>
                      <th>Duration</th>
                      <th className="text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(history || []).map((h,idx)=>(
                      <tr key={h.timestamp+idx} className="border-b hover:bg-slate-50">
                        <td className="py-2 pl-2"><input type="checkbox" checked={!!selectedHistoryIds[h.timestamp]} onChange={()=>toggleHistorySelect(h.timestamp)} /></td>
                        <td className="py-2">{h.contract_path}</td>
                        <td className="py-2">{formatDate(h.timestamp)}</td>
                        <td className="py-2">{h.vulnerabilities_found ?? 0}</td>
                        <td className="py-2">{h.scan_duration ?? "-"}s</td>
                        <td className="py-2 text-right pr-2">
                          <button className="text-xs px-2 py-1 mr-2 bg-slate-100 rounded" onClick={()=>fetchSpecificHistoryAndShow(h)}>View</button>
                          <button className="text-xs px-2 py-1 bg-rose-500 text-white rounded" onClick={()=>handleDeleteHistory(h.timestamp)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {(history || []).length===0 && <tr><td colSpan={6} className="py-6 text-center text-slate-500">No history yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );

  async function fetchSpecificHistoryAndShow(row: HistoryRow) {
    setLoading(true); setError(null);
    try {
      const id = row.id || row.timestamp;
      const res = await fetch(`${API_BASE}/api/history/${encodeURIComponent(String(id))}`);
      if (!res.ok) throw new Error("Could not load history item");
      const json = await res.json();
      const mapped: ScanResult = {
        id: json.id || id,
        contract: json.contract_path || json.contract || "(unknown)",
        timestamp: json.timestamp || json.scan_timestamp,
        vulnerabilities: json.vulnerabilities || [],
        metrics: json.metrics || { total_vulnerabilities: json.vulnerabilities?.length || row.vulnerabilities_found || 0 }
      };
      setResult(mapped);
    } catch (e) { setError(String(e)); } finally { setLoading(false); }
  }
}
