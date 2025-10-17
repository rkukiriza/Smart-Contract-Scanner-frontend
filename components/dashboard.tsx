"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Search,
  LayoutDashboard,
  ScanSearch,
  History,
  Settings,
  Shield,
  Menu,
  X,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Code,
  FileCode,
  TrendingUp,
  Network,
  AlertCircle,
  XCircle,
  Sun,
  Moon,
  Download,
  FileText,
  Loader2,
  Info,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader,TableRow } from "@/components/ui/table"

// Local fallback TableRow in case the ui/table module doesn't export it
// const TableRow: React.FC<any> = (props) => <tr {...props} /> //
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, // Added
  DialogContent, // Added
  DialogDescription, // Added
  DialogHeader, // Added
  DialogTitle, // Added
} from "@/components/ui/dialog"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts"

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "#" },
  { icon: ScanSearch, label: "Scan Contract", href: "#scan" },
  { icon: History, label: "Scan History", href: "#history" },
  { icon: Settings, label: "Settings", href: "#settings" },
]

interface ScanRecord {
  date: string
  time: string
  contract: string
  vulns: number
  duration: string
  network: string
  success: boolean
  linesOfCode?: number
  functionsAnalyzed?: number
  compilerVersion?: string
}

interface VulnerabilityDetail {
  name: string
  severity: string
  description: string
  impact: string
  remediation: string
  codeExample: string
}

const getRiskColor = (vulns: number) => {
  if (vulns >= 8) return "bg-destructive text-destructive-foreground"
  if (vulns >= 5) return "bg-chart-5 text-foreground"
  if (vulns >= 3) return "bg-chart-4 text-foreground"
  return "bg-chart-3 text-foreground"
}

const getRiskLevel = (vulns: number) => {
  if (vulns >= 8) return "Critical"
  if (vulns >= 5) return "High"
  if (vulns >= 3) return "Medium"
  return "Low"
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
)

export function Dashboard() {
  const [activeNav, setActiveNav] = useState("Dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [network, setNetwork] = useState("ethereum-mainnet")
  const [contractAddress, setContractAddress] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [theme, setTheme] = useState<"light" | "dark">("dark")
  const [isLoading, setIsLoading] = useState(true)
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedVulnerability, setSelectedVulnerability] = useState<VulnerabilityDetail | null>(null)
  const [networkFilter, setNetworkFilter] = useState<string>("all")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle("dark", savedTheme === "dark")
    } else {
      document.documentElement.classList.add("dark")
    }
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Contract",
      "Network",
      "Status",
      "Vulnerabilities",
      "Duration",
      "Lines of Code",
      "Functions",
    ]
    const rows = scanHistory.map((scan) => [
      scan.date,
      scan.time,
      scan.contract,
      scan.network,
      scan.success ? "Success" : "Failed",
      scan.vulns.toString(),
      scan.duration,
      scan.linesOfCode?.toString() || "N/A",
      scan.functionsAnalyzed?.toString() || "N/A",
    ])

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `scan-history-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    // Create a simple HTML report
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Smart Contract Vulnerability Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #6366f1; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f3f4f6; }
          .critical { color: #ef4444; font-weight: bold; }
          .high { color: #f97316; font-weight: bold; }
          .medium { color: #eab308; font-weight: bold; }
          .low { color: #22c55e; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Smart Contract Vulnerability Scanner Report</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        
        <div class="metrics">
          <div class="metric-card">
            <div>Total Scans</div>
            <div class="metric-value">${totalScans}</div>
          </div>
          <div class="metric-card">
            <div>Vulnerabilities Found</div>
            <div class="metric-value">${totalVulnerabilities}</div>
          </div>
          <div class="metric-card">
            <div>Success Rate</div>
            <div class="metric-value">${totalScans === 0 ? "0.0%" : ((successfulScans / totalScans) * 100).toFixed(1) + "%"}</div>
          </div>
          <div class="metric-card">
            <div>Critical Issues</div>
            <div class="metric-value">${severityData[0].value}</div>
          </div>
        </div>

        <h2>Recent Scans</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Contract</th>
              <th>Network</th>
              <th>Status</th>
              <th>Risk Level</th>
              <th>Vulnerabilities</th>
            </tr>
          </thead>
          <tbody>
            ${scanHistory
              .map(
                (scan) => `
              <tr>
                <td>${scan.date}</td>
                <td style="font-family: monospace; font-size: 12px;">${scan.contract}</td>
                <td>${scan.network}</td>
                <td>${scan.success ? "✓ Success" : "✗ Failed"}</td>
                <td class="${getRiskLevel(scan.vulns).toLowerCase()}">${getRiskLevel(scan.vulns)}</td>
                <td>${scan.vulns}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([reportContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `vulnerability-report-${new Date().toISOString().split("T")[0]}.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([
    {
      date: "Oct 15, 2025",
      time: "01:45:01 AM",
      contract: "0xA33dec23927cEAcbd14Dd9Fa9754Aa275723D6F1",
      vulns: 5,
      duration: "1.20s",
      network: "Ethereum",
      success: true,
      linesOfCode: 450,
      functionsAnalyzed: 12,
      compilerVersion: "0.8.20",
    },
    {
      date: "Oct 15, 2025",
      time: "01:43:59 AM",
      contract: "0x71d865673E6c2E112CdED381b38f7A958eA22d39",
      vulns: 8,
      duration: "1.20s",
      network: "Polygon",
      success: true,
      linesOfCode: 620,
      functionsAnalyzed: 18,
      compilerVersion: "0.8.19",
    },
    {
      date: "Oct 15, 2025",
      time: "01:43:04 AM",
      contract: "0xE789e109B2C97AA039bfBD42892B742bc2955555",
      vulns: 3,
      duration: "1.20s",
      network: "BSC",
      success: true,
      linesOfCode: 320,
      functionsAnalyzed: 8,
      compilerVersion: "0.8.18",
    },
    {
      date: "Oct 15, 2025",
      time: "01:42:58 AM",
      contract: "0xE789e109B2C97AA039bfBD42892B742bc2955555",
      vulns: 2,
      duration: "1.20s",
      network: "Arbitrum",
      success: false,
      linesOfCode: 280,
      functionsAnalyzed: 7,
      compilerVersion: "0.8.17",
    },
    {
      date: "Oct 15, 2025",
      time: "01:42:07 AM",
      contract: "0xeACCAe297e72959360205761101D8541cbe96b100",
      vulns: 10,
      duration: "1.20s",
      network: "Ethereum",
      success: true,
      linesOfCode: 890,
      functionsAnalyzed: 25,
      compilerVersion: "0.8.20",
    },
    {
      date: "Oct 15, 2025",
      time: "01:40:35 AM",
      contract: "0x831D3748f476667397129AbE057050249579792e512",
      vulns: 6,
      duration: "1.20s",
      network: "Polygon",
      success: true,
      linesOfCode: 540,
      functionsAnalyzed: 15,
      compilerVersion: "0.8.19",
    },
    {
      date: "Oct 15, 2025",
      time: "01:38:50 AM",
      contract: "0x94bE2665a31F0E6caBCb9487f1A0Da7766cdfA299",
      vulns: 4,
      duration: "1.20s",
      network: "BSC",
      success: true,
      linesOfCode: 410,
      functionsAnalyzed: 11,
      compilerVersion: "0.8.18",
    },
  ])

  const totalScans = scanHistory.length
  const totalVulnerabilities = scanHistory.reduce((sum, scan) => sum + scan.vulns, 0)
  const successfulScans = scanHistory.filter((s) => s.success).length
  const failedScans = totalScans - successfulScans
  const avgDuration = "1.20s"
  const lastScanDate = scanHistory[0]?.date || "N/A"

  const calculateRiskScore = () => {
    if (totalScans === 0) return 0
    const avgVulns = totalVulnerabilities / totalScans
    return Math.min(Math.round((avgVulns / 10) * 100), 100)
  }

  const riskScoreTrend = scanHistory
    .slice()
    .reverse()
    .map((scan, index) => {
      const scansUpToNow = scanHistory.slice(scanHistory.length - index - 1)
      const totalVulns = scansUpToNow.reduce((sum, s) => sum + s.vulns, 0)
      const avgVulns = totalVulns / scansUpToNow.length
      const riskScore = Math.min(Math.round((avgVulns / 10) * 100), 100)
      return {
        scan: `Scan ${index + 1}`,
        riskScore: riskScore,
      }
    })

  const severityData = [
    { name: "Critical", value: scanHistory.filter((s) => s.vulns >= 8).length, fill: "#ef4444" }, // Red
    { name: "High", value: scanHistory.filter((s) => s.vulns >= 5 && s.vulns < 8).length, fill: "#f97316" }, // Orange
    {
      name: "Medium",
      value: scanHistory.filter((s) => s.vulns >= 3 && s.vulns < 5).length,
      fill: "#eab308", // Yellow
    },
    { name: "Low", value: scanHistory.filter((s) => s.vulns < 3).length, fill: "#22c55e" }, // Green
  ]

  const topVulnerabilities = [
    { name: "Reentrancy", count: 12, severity: "Critical" },
    { name: "Integer Overflow", count: 8, severity: "High" },
    { name: "Unchecked Call", count: 6, severity: "Medium" },
    { name: "Access Control", count: 5, severity: "High" },
    { name: "Timestamp Dependence", count: 4, severity: "Low" },
  ]

  const totalLinesOfCode = scanHistory.reduce((sum, scan) => sum + (scan.linesOfCode || 0), 0)
  const totalFunctions = scanHistory.reduce((sum, scan) => sum + (scan.functionsAnalyzed || 0), 0)
  const avgLinesPerContract = totalScans > 0 ? Math.round(totalLinesOfCode / totalScans) : 0

  const codeDistributionData = [
    { name: "Core Code", value: 65, fill: "#14b8a6" }, // Teal
    { name: "Libraries", value: 35, fill: "#a855f7" }, // Purple
  ]

  const successFailData = [
    { name: "Success", value: successfulScans, fill: "#22c55e" }, // Green
    { name: "Failed", value: failedScans, fill: "#ef4444" }, // Red
  ]

  const riskiestContracts = scanHistory
    .sort((a, b) => b.vulns - a.vulns)
    .slice(0, 10)
    .map((scan) => ({
      name: scan.contract.slice(0, 10) + "...",
      vulns: scan.vulns,
      fill: scan.vulns >= 8 ? "#ef4444" : scan.vulns >= 5 ? "#f97316" : "#eab308", // Red, Orange, Yellow
    }))

  const networkData = scanHistory.reduce(
    (acc, scan) => {
      const existing = acc.find((item) => item.name === scan.network)
      if (existing) {
        existing.value++
      } else {
        acc.push({ name: scan.network, value: 1 })
      }
      return acc
    },
    [] as { name: string; value: number }[],
  )

  const COLORS = ["#14b8a6", "#a855f7", "#3b82f6", "#f59e0b", "#ec4899", "#10b981"] // Teal, Purple, Blue, Amber, Pink, Emerald

  console.log("[v0] Network Data:", networkData)
  console.log("[v0] COLORS array:", COLORS)

  const vulnerabilityTypes = [
    { text: "Reentrancy", value: 12 },
    { text: "Overflow", value: 8 },
    { text: "Unchecked", value: 6 },
    { text: "Access Control", value: 5 },
    { text: "Timestamp", value: 4 },
    { text: "Delegatecall", value: 3 },
    { text: "tx.origin", value: 2 },
  ]

  const scansOverTimeData = scanHistory
    .slice()
    .reverse()
    .map((scan, index) => ({
      scan: `Scan ${index + 1}`,
      vulnerabilities: scan.vulns,
    }))

  const metrics = [
    { title: "Total Scans", value: totalScans.toString(), icon: ScanSearch, color: "text-chart-1" },
    {
      title: "Vulnerabilities Found",
      value: totalVulnerabilities.toString(),
      icon: AlertTriangle,
      color: "text-chart-5",
    },
    { title: "Avg Scan Time", value: avgDuration, icon: Clock, color: "text-chart-3" },
    { title: "Critical Issues", value: severityData[0].value.toString(), icon: Shield, color: "text-destructive" },
  ]

  const vulnerabilityDetails: Record<string, VulnerabilityDetail> = {
    Reentrancy: {
      name: "Reentrancy Attack",
      severity: "Critical",
      description:
        "A reentrancy attack occurs when a function makes an external call to another untrusted contract before resolving its own state. The attacker can recursively call back into the original function, potentially draining funds or manipulating state.",
      impact:
        "Can lead to complete loss of funds, unauthorized state changes, and contract compromise. The DAO hack in 2016 resulted in a loss of $60 million due to a reentrancy vulnerability.",
      remediation:
        "Use the Checks-Effects-Interactions pattern: perform all checks first, update state variables, then make external calls. Alternatively, use ReentrancyGuard from OpenZeppelin or implement mutex locks.",
      codeExample: `// Vulnerable Code
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    msg.sender.call{value: amount}("");
    balances[msg.sender] -= amount; // State updated AFTER external call
}

// Fixed Code
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount; // State updated BEFORE external call
    msg.sender.call{value: amount}("");
}`,
    },
    "Integer Overflow": {
      name: "Integer Overflow/Underflow",
      severity: "High",
      description:
        "Integer overflow occurs when an arithmetic operation exceeds the maximum value a variable can hold, wrapping around to zero. Underflow is the opposite, wrapping to the maximum value.",
      impact:
        "Can lead to incorrect calculations, unauthorized token minting, bypassing of balance checks, and financial losses.",
      remediation:
        "Use Solidity 0.8.0+ which has built-in overflow/underflow checks, or use SafeMath library for older versions. Always validate arithmetic operations.",
      codeExample: `// Vulnerable Code (Solidity < 0.8.0)
uint256 balance = 100;
balance = balance - 200; // Underflows to max uint256

// Fixed Code (Solidity >= 0.8.0)
uint256 balance = 100;
balance = balance - 200; // Reverts automatically

// Or use SafeMath
using SafeMath for uint256;
balance = balance.sub(200); // Reverts on underflow`,
    },
    "Unchecked Call": {
      name: "Unchecked External Call",
      severity: "Medium",
      description:
        "When a contract makes an external call without checking the return value, it may continue execution even if the call failed, leading to unexpected behavior.",
      impact: "Failed transfers may go unnoticed, leading to loss of funds or incorrect state assumptions.",
      remediation:
        "Always check return values of external calls. Use require() to ensure calls succeed, or handle failures explicitly.",
      codeExample: `// Vulnerable Code
address.call{value: amount}(""); // Return value ignored

// Fixed Code
(bool success, ) = address.call{value: amount}("");
require(success, "Transfer failed");`,
    },
    "Access Control": {
      name: "Access Control Vulnerability",
      severity: "High",
      description:
        "Improper access control allows unauthorized users to execute privileged functions, potentially compromising the entire contract.",
      impact: "Attackers can gain admin privileges, modify critical parameters, drain funds, or destroy the contract.",
      remediation:
        "Implement proper access control using modifiers, OpenZeppelin's Ownable or AccessControl contracts. Always validate msg.sender.",
      codeExample: `// Vulnerable Code
function setOwner(address newOwner) public {
    owner = newOwner; // Anyone can call this!
}

// Fixed Code
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}

function setOwner(address newOwner) public onlyOwner {
    owner = newOwner;
}`,
    },
    "Timestamp Dependence": {
      name: "Timestamp Dependence",
      severity: "Low",
      description:
        "Relying on block.timestamp for critical logic can be manipulated by miners within a ~15 second window, potentially affecting time-sensitive operations.",
      impact: "Can affect lottery outcomes, auction endings, or time-locked operations if exploited by miners.",
      remediation:
        "Avoid using block.timestamp for critical randomness or precise timing. Use block.number for relative time, or oracle services for secure randomness.",
      codeExample: `// Vulnerable Code
if (block.timestamp % 2 == 0) {
    winner = player1; // Miner can manipulate
}

// Better Approach
if (block.number % 2 == 0) {
    winner = player1; // Harder to manipulate
}

// Best Approach
// Use Chainlink VRF for randomness`,
    },
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  const handleRunScan = () => {
    if (!contractAddress && !selectedFile) {
      alert("Please enter a contract address or upload a .sol file")
      return
    }
    setIsScanning(true)
    setScanProgress(0)

    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return 95
        }
        return prev + 5
      })
    }, 100)

    setTimeout(() => {
      clearInterval(progressInterval)
      setScanProgress(100)
      const newScan: ScanRecord = {
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: new Date().toLocaleTimeString("en-US"),
        contract: contractAddress || selectedFile?.name || "Unknown",
        vulns: Math.floor(Math.random() * 10),
        duration: "1.20s",
        network: network.split("-")[0].charAt(0).toUpperCase() + network.split("-")[0].slice(1),
        success: Math.random() > 0.2,
        linesOfCode: Math.floor(Math.random() * 800) + 200,
        functionsAnalyzed: Math.floor(Math.random() * 20) + 5,
        compilerVersion: "0.8.20",
      }
      setScanHistory([newScan, ...scanHistory])
      setIsScanning(false)
      setScanProgress(0)
      setContractAddress("")
      setSelectedFile(null)
    }, 2000)
  }

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to clear all scan history?")) {
      setScanHistory([])
    }
  }

  const filteredScans = scanHistory.filter((scan) => {
    const matchesSearch = scan.contract.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesNetwork = networkFilter === "all" || scan.network === networkFilter
    return matchesSearch && matchesNetwork
  })

  const uniqueNetworks = Array.from(new Set(scanHistory.map((scan) => scan.network)))

  if (isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <aside className="hidden lg:block w-64 bg-sidebar border-r border-sidebar-border">
          <div className="flex h-full flex-col">
            <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
        </aside>
        <div className="flex-1 flex flex-col">
          <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-6">
            <Skeleton className="h-10 w-64" />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <DashboardSkeleton />
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Contract Scanner</span>
              <span className="text-xs text-muted-foreground">Security Suite</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeNav === item.label
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setActiveNav(item.label)
                    setSidebarOpen(false)
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            <div className="rounded-lg bg-sidebar-accent p-3">
              <p className="text-xs font-medium text-sidebar-accent-foreground">Need Help?</p>
              <p className="mt-1 text-xs text-muted-foreground">Check our documentation</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex flex-1 items-center gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by contract address..."
                className="pl-9 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="hidden sm:flex gap-2 bg-transparent">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="hidden sm:flex gap-2 bg-transparent">
              <FileText className="h-4 w-4" />
              Report
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Badge variant="outline" className="hidden sm:flex">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {totalScans} Scans
            </Badge>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-balance">Smart Contract Vulnerability Scanner</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comprehensive security analysis and vulnerability detection
                </p>
              </div>
            </div>

            {/* Scanner Section */}
            <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/50 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScanSearch className="h-5 w-5 text-primary" />
                  New Scan
                </CardTitle>
                <CardDescription>Enter a contract address or upload a Solidity file to scan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Network</label>
                    <Select value={network} onValueChange={setNetwork}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum-mainnet">Ethereum Mainnet</SelectItem>
                        <SelectItem value="ethereum-sepolia">Ethereum Sepolia</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="bsc">BSC</SelectItem>
                        <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contract Address</label>
                    <Input
                      placeholder="0x..."
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                      className="font-mono"
                      disabled={isScanning}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload Contract (.sol)</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".sol"
                      onChange={handleFileChange}
                      className="flex-1"
                      disabled={isScanning}
                    />
                    {selectedFile && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Upload className="h-3 w-3" />
                        {selectedFile.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    onClick={handleRunScan}
                    disabled={isScanning}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scanning... {scanProgress}%
                      </>
                    ) : (
                      <>
                        <ScanSearch className="mr-2 h-4 w-4" />
                        Run Scan
                      </>
                    )}
                  </Button>
                  {isScanning && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-300 ease-out"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-chart-5" />
                Risk Overview
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Circular Risk Gauge */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Overall Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <RadialBarChart
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="90%"
                        barSize={15}
                        data={[{ name: "Risk", value: calculateRiskScore(), fill: "#ef4444" }]}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar dataKey="value" cornerRadius={10} />
                        <Tooltip content={<CustomTooltip />} />
                        <text
                          x="50%"
                          y="50%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="fill-foreground text-3xl font-bold"
                        >
                          {calculateRiskScore()}%
                        </text>
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Severity Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={severityData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs fill-foreground" tick={{ fill: "currentColor" }} />
                        <YAxis className="text-xs fill-foreground" tick={{ fill: "currentColor" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top 5 Vulnerabilities */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Top 5 Vulnerabilities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {topVulnerabilities.map((vuln, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-lg transition-colors cursor-pointer"
                          onClick={() => setSelectedVulnerability(vulnerabilityDetails[vuln.name])}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium">{vuln.name}</span>
                            <Info className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                vuln.severity === "Critical"
                                  ? "border-destructive text-destructive"
                                  : vuln.severity === "High"
                                    ? "border-chart-5 text-chart-5"
                                    : "border-chart-4 text-chart-4"
                              }
                            >
                              {vuln.count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-4 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-chart-2" />
                    Risk Score Trend
                  </CardTitle>
                  <CardDescription>Track how your overall risk score has evolved over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={riskScoreTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="scan" className="text-xs" tick={{ fill: "currentColor" }} />
                      <YAxis className="text-xs" tick={{ fill: "currentColor" }} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="riskScore"
                        stroke="#ef4444"
                        strokeWidth={3}
                        dot={{ fill: "#ef4444", r: 5 }}
                        activeDot={{ r: 7 }}
                        name="Risk Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Code className="h-5 w-5 text-chart-1" />
                Code Insights
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Lines of Code</CardTitle>
                    <FileCode className="h-5 w-5 text-chart-1" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalLinesOfCode.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-1">Avg: {avgLinesPerContract} per contract</p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Functions Analyzed</CardTitle>
                    <TrendingUp className="h-5 w-5 text-chart-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{totalFunctions}</div>
                    <p className="text-xs text-muted-foreground mt-1">Across all contracts</p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm">Compiler Version</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">0.8.20</div>
                    <p className="text-xs text-muted-foreground mt-1">Most common</p>
                  </CardContent>
                </Card>

                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-sm">Code Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie
                          data={codeDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {codeDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-chart-3" />
                Scan History & Performance
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                {metrics.map((metric) => {
                  const Icon = metric.icon
                  return (
                    <Card
                      key={metric.title}
                      className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                        <Icon className={`h-5 w-5 ${metric.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{metric.value}</div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Line Chart: Scans over Time */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Vulnerabilities Over Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={scansOverTimeData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="scan" className="text-xs" tick={{ fill: "currentColor" }} />
                        <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                          type="monotone"
                          dataKey="vulnerabilities"
                          stroke="#a855f7"
                          strokeWidth={3}
                          dot={{ fill: "#a855f7", r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Pie Chart: Success vs Failed */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Scan Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={successFailData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {successFailData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Avg Duration</p>
                        <p className="text-lg font-semibold">{avgDuration}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Scan</p>
                        <p className="text-lg font-semibold">{lastScanDate}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Network className="h-5 w-5 text-chart-2" />
                Comparative Analysis
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Bar Chart: Top 10 Riskiest Contracts */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Top 10 Riskiest Contracts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={riskiestContracts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" tick={{ fill: "currentColor" }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={80}
                          className="text-xs"
                          tick={{ fill: "currentColor" }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="vulns" radius={[0, 8, 8, 0]}>
                          {riskiestContracts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Network Distribution */}
                <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base">Scans by Network</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={networkData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {networkData.map((entry, index) => {
                            const color = COLORS[index % COLORS.length]
                            return <Cell key={`cell-${index}`} fill={color} />
                          })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Word Cloud: Common Vulnerability Types */}
              <Card className="mt-4 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">Common Vulnerability Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3 justify-center items-center min-h-[200px]">
                    {vulnerabilityTypes.map((vuln, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="transition-all hover:scale-110 cursor-pointer"
                        style={{
                          fontSize: `${Math.max(0.75, vuln.value / 10)}rem`,
                          padding: `${Math.max(0.25, vuln.value / 20)}rem ${Math.max(0.5, vuln.value / 15)}rem`,
                        }}
                      >
                        {vuln.text} ({vuln.value})
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Scans Table */}
            <Card className="transition-all duration-200 hover:shadow-lg hover:shadow-primary/5">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Scans History</CardTitle>
                  <CardDescription>Latest smart contract security assessments</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={networkFilter} onValueChange={setNetworkFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Networks</SelectItem>
                      {uniqueNetworks.map((network) => (
                        <SelectItem key={network} value={network}>
                          {network}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleClearHistory} disabled={scanHistory.length === 0}>
                    Clear History
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Contract / Time</TableHead>
                        <TableHead>Network</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead className="text-right">Vulns</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScans.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            {networkFilter !== "all"
                              ? `No scans found for ${networkFilter} network.`
                              : "No scan history available. Run your first scan to get started."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredScans.map((scan, index) => (
                          <TableRow key={index} className="transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{scan.date}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono text-sm">{scan.contract}</span>
                                <span className="text-xs text-muted-foreground">{scan.time}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{scan.network}</Badge>
                            </TableCell>
                            <TableCell>
                              {scan.success ? (
                                <Badge variant="outline" className="border-chart-3 text-chart-3">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Success
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-destructive text-destructive">
                                  <XCircle className="mr-1 h-3 w-3" />
                                  Failed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getRiskColor(scan.vulns)}>{getRiskLevel(scan.vulns)}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{scan.vulns}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{scan.duration}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Dialog open={!!selectedVulnerability} onOpenChange={() => setSelectedVulnerability(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              {selectedVulnerability?.name}
            </DialogTitle>
            <DialogDescription>
              <Badge
                variant="outline"
                className={
                  selectedVulnerability?.severity === "Critical"
                    ? "border-destructive text-destructive"
                    : selectedVulnerability?.severity === "High"
                      ? "border-chart-5 text-chart-5"
                      : selectedVulnerability?.severity === "Medium"
                        ? "border-chart-4 text-chart-4"
                        : "border-chart-3 text-chart-3"
                }
              >
                {selectedVulnerability?.severity} Severity
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-muted-foreground leading-relaxed">{selectedVulnerability?.description}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Impact</h3>
              <p className="text-muted-foreground leading-relaxed">{selectedVulnerability?.impact}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Code Example</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{selectedVulnerability?.codeExample}</code>
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Remediation</h3>
              <p className="text-muted-foreground leading-relaxed">{selectedVulnerability?.remediation}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
