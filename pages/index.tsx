// pages/index.tsx
import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent, useRef } from "react";
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

// 🧩 Lightweight custom WordCloud renderer (no dependency)
function WordCloud({ words }: { words: Array<{ text: string; value: number }> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sorted = [...words].sort((a, b) => b.value - a.value);
    sorted.forEach((word, i) => {
      const fontSize = 12 + word.value * 1.2;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = `hsl(${(i * 40) % 360}, 70%, 40%)`;
      const x = Math.random() * (canvas.width - 100);
      const y = Math.random() * (canvas.height - 20) + fontSize;
      ctx.fillText(word.text, x, y);
    });
  }, [words]);

  return <canvas ref={canvasRef} width={300} height={200} />;
}

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
  const severityData = useMemo(() => Object.entries(severityBreakdown).map(([name, value]) => ({ name, value })), [severityBreakdown]);
  const totalVulns = result?.metrics?.total_vulnerabilities ?? (result?.vulnerabilities?.length ?? 0);
  const riskScore = result?.risk_score ?? (result?.metrics ? Math.min(100, (result.metrics.total_vulnerabilities || 0) * 10) : 0);
  const timelineData = (history || []).slice(0, 20).reverse().map(h => ({ name: new Date(h.timestamp).toLocaleTimeString(), vulns: h.vulnerabilities_found || 0 }));
  const severityTotals = (history || []).reduce((acc: Record<string, number>, h) => {
    const br = h.severity_breakdown || {};
    Object.entries(br).forEach(([k, v]) => acc[k] = (acc[k] || 0) + (v as number));
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      {/* ... all your existing layout and dashboard content stays unchanged ... */}

      {/* Example spot to render word cloud if comparative data exists */}
      {result?.comparative?.word_cloud?.length ? (
        <div className="bg-white rounded-2xl p-4 shadow mt-6">
          <h3 className="text-sm font-semibold mb-2">Keyword Cloud</h3>
          <WordCloud words={result.comparative.word_cloud} />
        </div>
      ) : null}
    </div>
  );
}
