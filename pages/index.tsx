// pages/index.tsx
import React, { useEffect, useMemo, useState, FormEvent } from "react";
import dynamic from "next/dynamic";

// Recharts Imports
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
const Legend = dynamic(() => import("recharts").then((m) => m.Legend as any), { ssr: false });

// --- 1. DATA TYPES ---
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
  code_insights?: { 
    imports?: string[]; 
    external_libraries?: number; 
    functions_analyzed?: number; 
    compiler_version?: string; 
  };
  risk_score?: number; 
  comparative?: { 
    rank?: number | null; 
    vulnerability_density?: number; 
    riskiest_contracts?: Array<{ name: string; risk_score: number }>; 
    networks?: Array<{ name: string; scans: number }>; 
    word_cloud?: Array<{ text: string; value: number }> 
  };
  recommendations?: Array<{ type: string; advice: string }>;
};

type HistoryRow = { 
    id?: string; 
    timestamp: string; 
    contract_path: string;
    vulnerabilities_found?: number; 
    severity_breakdown?: Record<string, number>; 
    scan_duration?: number; 
    network?: string; 
    risk_score?: number; 
    raw?: any 
    formattedDate?: string;
    formattedTime?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const RISK_MAX = 10;

// Colors for the Severity Breakdown (Dark Mode)
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#facc15',
  low: '#60a5fa',
  informational: '#9ca3af',
};

// --- 2. CUSTOM COMPONENTS ---
function RiskGauge({ score, max }: { score: number; max: number }) {
  const percentage = Math.min(100, Math.max(0, (score / max) * 100));
  const normalizedScore = percentage * 1.8; 
  const riskStatus = score > 7.5 ? 'Critical' : score > 4.5 ? 'High' : score > 2.5 ? 'Medium' : 'Low';
  const color = score > 7.5 ? SEVERITY_COLORS.critical : score > 4.5 ? SEVERITY_COLORS.high : score > 2.5 ? SEVERITY_COLORS.medium : SEVERITY_COLORS.low;

  return (
    <div className="relative flex flex-col items-center">
      <svg width="180" height="100" viewBox="0 0 180 100" className="transform -rotate-180">
        <defs>
          <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: SEVERITY_COLORS.low, stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: SEVERITY_COLORS.medium, stopOpacity: 1 }} />
            <stop offset="80%" style={{ stopColor: SEVERITY_COLORS.high, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: SEVERITY_COLORS.critical, stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          d="M 10 90 A 80 80 0 0 1 170 90"
          fill="none"
          stroke="#374151" 
          strokeWidth="20"
        />
        <path
          d="M 10 90 A 80 80 0 0 1 170 90"
          fill="none"
          stroke="url(#riskGradient)"
          strokeWidth="20"
          strokeDasharray={`${normalizedScore * 2.5}, 500`}
        />
      </svg>
      <div className="absolute top-1/2 mt-12 text-center transform -translate-y-full">
        <div className={`text-4xl font-bold`} style={{ color }}>{score.toFixed(1)}</div>
        <div className="text-sm text-gray-400">Risk Score / {max}</div>
        <div className={`text-lg font-semibold mt-1`} style={{ color }}>{riskStatus}</div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, unit = '' }: { title: string, value: string | number | undefined, unit?: string }) {
  return (
    <div className="bg-gray-700 rounded-lg shadow-md p-4 border border-gray-600">
      <div className="text-sm text-gray-400 font-medium">{title}</div>
      <div className="text-2xl font-bold text-white mt-1">
        {value === undefined || value === null ? '-' : value}
        <span className="text-base font-normal ml-1 text-gray-300">{unit}</span>
      </div>
    </div>
  );
}

function SimpleWordCloud({ words }: { words: Array<{ text: string; value: number }> }) {
  const sorted = [...words].sort((a, b) => b.value - a.value).slice(0, 15);
  return (
    <div className="h-40 p-2 border border-gray-600 rounded-lg overflow-hidden flex flex-wrap content-center justify-center bg-gray-700">
      {sorted.map((word, i) => (
        <span 
          key={i} 
          className="m-1 whitespace-nowrap font-semibold"
          style={{ 
            fontSize: `${10 + word.value * 0.15}px`, 
            color: `hsl(${(i * 40) % 360}, 80%, 65%)`, 
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}

// --- 3. MAIN COMPONENT ---
export default function IndexPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [formattedHistory, setFormattedHistory] = useState<HistoryRow[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNetworks();
    fetchHistory();
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
      setHistory(Array.isArray(json.scans) ? json.scans.slice(0, 20) : []);
      setTotalScans(json.total_scans || 0); 
    } catch {
      setHistory([]);
      setTotalScans(0);
    }
  }

  async function handleScan(e?: FormEvent) {
    if (e) e.preventDefault();
    setError(null);
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
      await fetchHistory();
    } catch (err: any) { setError(err?.message || String(err)); } finally { setLoading(false); }
  }

  async function handleClearHistory() {
    if (!confirm("Clear all history?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/history`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear history");
      setHistory([]);
      setTotalScans(0);
    } catch (e: any) { setError(String(e)); }
  }

  // --- Hydration-safe formatting of history dates ---
  useEffect(() => {
    // Only run on client
    if (typeof window !== "undefined") {
      setFormattedHistory(
        history.map(h => {
          const dateObj = new Date(h.timestamp);
          return {
            ...h,
            formattedDate: dateObj.toLocaleDateString('en-US', { timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: 'numeric' }),
            formattedTime: dateObj.toLocaleTimeString('en-US', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
        })
      );
    }
  }, [history]);

  // --- Derived Values ---
  const severityBreakdown = result?.metrics?.severity_breakdown || {};
  const severityData = useMemo(() => Object.entries(severityBreakdown).map(([name, value]) => ({ 
    name, 
    value: value as number,
    color: SEVERITY_COLORS[name] || SEVERITY_COLORS.informational
  })).filter(d => d.value > 0), [severityBreakdown]);
  
  const riskScore = result?.risk_score ?? 0;
  const totalVulns = result?.metrics?.total_vulnerabilities ?? (result?.vulnerabilities?.length ?? 0);
  const totalLines = result?.metrics?.total_lines; 
  const vulnerableLines = result?.metrics?.vulnerable_lines;
  const functionsAnalyzed = result?.code_insights?.functions_analyzed;
  const externalLibraries = result?.code_insights?.external_libraries;
  const compilerVersion = result?.code_insights?.compiler_version;
  const rank = result?.comparative?.rank;
  const density = result?.comparative?.vulnerability_density;

  // Data for History Timeline (Line Chart)
  const timelineData = (formattedHistory || []).map(h => ({
    name: h.formattedTime || "",
    vulns: h.vulnerabilities_found || 0
  })).reverse();

  // Data for Comparative Charts
  const riskiestContractsData = result?.comparative?.riskiest_contracts || [];
  const networkScansData = result?.comparative?.networks || [];
  const wordCloudData = result?.comparative?.word_cloud || [];

  return (
    <div className="min-h-screen bg-gray-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          🔬 Smart Contract Vulnerability Scanner Dashboard
        </h1>

        {/* 1. 🔍 Search & Upload Bar */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border-t-4 border-blue-500">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Network</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-600 rounded-lg focus:ring-blue-500 bg-gray-900 text-white"
                >
                  {networks.map(net => (<option key={net.id} value={net.id}>{net.name}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Contract Address / Upload (.sol)</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); setFile(null); }}
                    placeholder="0x..."
                    className="flex-grow px-4 py-2 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-900 text-white"
                  />
                  <input
                    type="file"
                    accept=".sol"
                    onChange={(e) => { 
                      const f = e.target.files?.[0] || null;
                      setFile(f); 
                      if(f) setAddress(''); 
                    }}
                    className="w-1/3 px-2 py-1 border border-gray-600 rounded-lg text-sm text-gray-300"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || (!address && !file)}
                className="w-full bg-blue-500 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {loading ? 'Scanning...' : '▶ Run Scan'}
              </button>
            </div>
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300">
                Error: {error}
              </div>
            )}
          </form>
        </div>

        {/* 2. 🔔 Risk Overview & Results */}
        {result && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Scan Results: {result.contract?.substring(0, 10) || 'Local File'}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
                <h3 className="text-xl font-semibold mb-6 text-gray-200">Contract Risk Score</h3>
                <div className="flex justify-center">
                  <RiskGauge score={riskScore} max={RISK_MAX} />
                </div>
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-400">Total Vulnerabilities Found</p>
                  <p className="text-4xl font-extrabold text-red-400">{totalVulns}</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700 lg:col-span-2">
                <h3 className="text-xl font-semibold mb-4 text-gray-200">Severity Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={100} fill="#8884d8" labelLine={false} paddingAngle={5}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {severityData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ color: 'white' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 p-2">
                    {Object.entries(SEVERITY_COLORS).map(([severity, color]) => {
                      const value = severityBreakdown[severity] || 0;
                      return (
                        <div key={severity} className="flex justify-between items-center p-2 rounded-md bg-gray-700">
                          <span className={`w-3 h-3 rounded-full mr-2`} style={{backgroundColor: color}}></span>
                          <span className="capitalize text-sm font-medium text-gray-300 flex-grow">{severity}</span>
                          <span className="text-lg font-bold text-white">{value}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {result.vulnerabilities && result.vulnerabilities.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
                <h3 className="text-xl font-semibold mb-4 text-gray-200">Top 5 Vulnerabilities Detected</h3>
                <div className="space-y-3">
                  {result.vulnerabilities.slice(0, 5).map((vuln, i) => (
                    <div key={i} className={`border-l-4 border-red-500 bg-red-900/30 p-4 rounded`}>
                      <h4 className="font-bold text-red-300">{vuln.type} ({vuln.severity.toUpperCase()})</h4>
                      <p className="text-sm text-gray-300 mt-1 line-clamp-2">{vuln.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Code Insights & Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Total Lines of Code" value={totalLines} />
                <MetricCard title="Vulnerable Lines" value={vulnerableLines} />
                <MetricCard title="Functions Analyzed" value={functionsAnalyzed} />
                <MetricCard title="External Libraries" value={externalLibraries} />
                <MetricCard title="Compiler Version" value={compilerVersion || 'N/A'} />
                <MetricCard title="Scan Duration" value={result.metrics?.scan_duration} unit="s" />
                <div className="col-span-2 bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold text-gray-300 mb-2">Libraries vs Core Code</h4>
                  <div className="h-24 flex items-center justify-center text-gray-500">
                    [Donut Chart Placeholder]
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl shadow-md p-6 border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-gray-200">Comparative Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <MetricCard title="Global Rank" value={rank || 'N/A'} unit="/ 10k" />
                  <MetricCard title="Vulnerability Density" value={density?.toFixed(4)} unit="vuln/line" />
                </div>
                <div className="lg:col-span-2 h-64 bg-gray-700 p-2 rounded-lg border border-gray-600">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Top Riskiest Contracts by Score</h4>
                  <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={riskiestContractsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                      <XAxis dataKey="name" hide stroke="#9ca3af" />
                      <YAxis dataKey="risk_score" stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                      <Bar dataKey="risk_score" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 bg-gray-700 p-2 rounded-lg border border-gray-600">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Common Keywords/Types</h4>
                  <SimpleWordCloud words={wordCloudData.length ? wordCloudData : [{text: 'Fallback', value: 80}, {text: 'DelegateCall', value: 60}, {text: 'Reentrancy', value: 40}]} />
                </div>
                <div className="lg:col-span-2 bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h4 className="font-semibold text-gray-300 mb-2">Network Activity Breakdown</h4>
                  <div className="h-40 flex items-center justify-center text-gray-500">
                    [Map/Network Chart Placeholder]
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. ⏱ Scan History & Performance - RESTRUCTURED TABLE */}
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 mt-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Scan History & Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-700 p-4 rounded-lg border border-gray-600">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Vulnerabilities Found Over Last Scans</h3>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', color: '#fff' }} />
                  <Legend wrapperStyle={{ color: 'white' }} />
                  <Line type="monotone" dataKey="vulns" stroke="#8884d8" name="Vulnerabilities Found" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-1 space-y-4">
              <MetricCard title="Total Scans Conducted" value={totalScans} />
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-200">Recent Scans History</h3>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Clear History
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-700 rounded-lg">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contract / Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vulns</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700 max-h-60 overflow-y-auto">
                    {formattedHistory.map((h, i) => {
                      const isNewDate = i === 0 || formattedHistory[i - 1].formattedDate !== h.formattedDate;
                      return (
                        <tr key={h.id || i} className="hover:bg-gray-700">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-300">
                            {isNewDate ? h.formattedDate : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="text-sm font-medium text-white truncate max-w-[100px]">{h.contract_path}</div>
                            <div className="text-xs text-gray-400">{h.formattedTime}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-bold text-red-400">
                            {h.vulnerabilities_found || 0}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-yellow-400">
                            {h.scan_duration ? `${h.scan_duration.toFixed(2)}s` : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}