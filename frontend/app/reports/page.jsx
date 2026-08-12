'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  BarChart3, TrendingUp, Banknote, Clock, CheckCircle2, Download,
  AlertOctagon, AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// DARK CHART CONFIG
// ---------------------------------------------------------------------------
const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', '#ec4899', '#06b6d4', '#f97316'];
const PRIORITY_COLORS = { CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#3b82f6' };
const darkTooltip = {
  contentStyle: { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9', fontSize: '13px' },
  labelStyle: { color: '#94a3b8' },
};

// ---------------------------------------------------------------------------
// MOCK DATA (falls back if API unavailable)
// ---------------------------------------------------------------------------
const MOCK_KPIS = {
  total_downtime_hours: 28.5, downtime_cost: 18525, downtime_cost_change: -12,
  avg_mttr_hours: 2.1, total_tickets: 6, pm_compliance_rate: 94.2,
};
const MOCK_CATEGORY = [
  { category: 'Autoclave / Curing', total_downtime_hours: 11.8, ticket_count: 2 },
  { category: 'Robotics & Welding', total_downtime_hours: 7.1, ticket_count: 2 },
  { category: 'CNC Machining', total_downtime_hours: 4.5, ticket_count: 1 },
  { category: 'Conveyor Systems', total_downtime_hours: 2.3, ticket_count: 1 },
  { category: 'Hydraulic Presses', total_downtime_hours: 4.5, ticket_count: 1 },
  { category: 'Quality Inspection', total_downtime_hours: 2.3, ticket_count: 1 },
];
const MOCK_TRENDS = [
  { period: '2026-03-01T00:00:00.000Z', downtime_hours: 14.2, ticket_count: 3 },
  { period: '2026-04-01T00:00:00.000Z', downtime_hours: 9.5, ticket_count: 2 },
  { period: '2026-05-01T00:00:00.000Z', downtime_hours: 6.8, ticket_count: 2 },
  { period: '2026-06-01T00:00:00.000Z', downtime_hours: 11.3, ticket_count: 3 },
  { period: '2026-07-01T00:00:00.000Z', downtime_hours: 8.1, ticket_count: 2 },
  { period: '2026-08-01T00:00:00.000Z', downtime_hours: 4.9, ticket_count: 1 },
];
const MOCK_TECH = [
  { technician_name: 'Ahmad Faizal', resolved_tickets: 3, avg_mttr_hours: 2.8 },
  { technician_name: 'Siti Nurhaliza', resolved_tickets: 2, avg_mttr_hours: 3.5 },
  { technician_name: 'Tech Team B', resolved_tickets: 1, avg_mttr_hours: 6.2 },
];
const MOCK_PRIORITY = [
  { priority: 'HIGH', count: 2 }, { priority: 'CRITICAL', count: 1 }, { priority: 'MEDIUM', count: 2 }, { priority: 'LOW', count: 1 },
];
const MOCK_OFFENDERS = [
  { machine_code: 'AST-002', machine_name: 'Autoclave Unit 02', location_zone: 'Zone-3 Finishing', category: 'Autoclave / Curing', failure_count: 2, total_downtime: 11.8, est_loss: 7670 },
  { machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01', location_zone: 'Zone-2 Assembly', category: 'Robotics & Welding', failure_count: 2, total_downtime: 7.1, est_loss: 4615 },
  { machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01', location_zone: 'Zone-1 Machining', category: 'Hydraulic Presses', failure_count: 1, total_downtime: 4.5, est_loss: 2925 },
  { machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', location_zone: 'Zone-1 Machining', category: 'CNC Machining', failure_count: 1, total_downtime: 3.2, est_loss: 2080 },
  { machine_code: 'QC-001', machine_name: 'Quality Control Scanner', location_zone: 'Zone-4 Packaging', category: 'Quality Inspection', failure_count: 1, total_downtime: 2.3, est_loss: 1495 },
];

const RANGES = [
  { key: '7d', label: '7 Days' }, { key: '30d', label: '30 Days' }, { key: '90d', label: '90 Days' }, { key: '1y', label: 'Year' },
];

// ---------------------------------------------------------------------------
// CSV EXPORT UTILITY
// ---------------------------------------------------------------------------
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function ReportsPage() {
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const [kpis, setKpis] = useState(MOCK_KPIS);
  const [categoryData, setCategoryData] = useState(MOCK_CATEGORY);
  const [trends, setTrends] = useState(MOCK_TRENDS);
  const [techData, setTechData] = useState(MOCK_TECH);
  const [priorityData, setPriorityData] = useState(MOCK_PRIORITY);
  const [offenders, setOffenders] = useState(MOCK_OFFENDERS);
  const [fullOffenders, setFullOffenders] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, c, t, h, p, o, fo] = await Promise.all([
        api.getReportKPIs(range),
        api.getDowntimeByCategory(range),
        api.getDowntimeTrends(range),
        api.getTechnicianPerformance(range),
        api.getPriorityDistribution(range),
        api.getWorstOffenders(range, 5),
        api.getWorstOffenders(range, 0),
      ]);
      setKpis(k);
      setCategoryData(Array.isArray(c) && c.length > 0 ? c : MOCK_CATEGORY);
      setTrends(Array.isArray(t) && t.length > 0 ? t : MOCK_TRENDS);
      setTechData(Array.isArray(h) && h.length > 0 ? h : MOCK_TECH);
      setPriorityData(Array.isArray(p) && p.length > 0 ? p : MOCK_PRIORITY);
      setOffenders(Array.isArray(o) && o.length > 0 ? o : MOCK_OFFENDERS);
      setFullOffenders(Array.isArray(fo) && fo.length > 0 ? fo : null);
      setApiError(null);
    } catch {
      setApiError('Backend unavailable — showing sample data.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Inject target reference line into trend data
  const trendData = useMemo(() => trends.map(t => ({ ...t, target: 5 })), [trends]);

  // Health risk from downtime
  const healthRisk = (hours) => hours >= 10 ? { label: 'CRITICAL', cls: 'text-rose-400' } : hours >= 5 ? { label: 'HIGH', cls: 'text-orange-400' } : hours >= 2 ? { label: 'MODERATE', cls: 'text-amber-400' } : { label: 'LOW', cls: 'text-emerald-400' };

  const RADIAN = Math.PI / 180;
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const r = outerRadius + 30;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="space-y-5">
      {apiError && <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" />{apiError}</div>}
      {loading && <div className="text-text-muted text-xs py-1">Generating reports...</div>}

      {/* ===== TOOLBAR ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === r.key ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>{r.label}</button>
          ))}
        </div>
        <button onClick={() => exportCSV(fullOffenders || offenders, `equip-maint-all-equipment-${range}.csv`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-surface-border text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors">
          <Download className="w-3.5 h-3.5" />Export CSV
        </button>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Banknote, label: 'Downtime Cost', value: `RM ${kpis.downtime_cost.toLocaleString()}`, sub: `${kpis.downtime_cost_change >= 0 ? '+' : ''}${kpis.downtime_cost_change}% vs prev`, color: 'text-rose-400', bg: 'bg-rose-900/30', subColor: kpis.downtime_cost_change <= 0 ? 'text-emerald-400' : 'text-rose-400' },
          { icon: Clock, label: 'Avg MTTR', value: `${kpis.avg_mttr_hours}h`, sub: `${kpis.total_tickets} tickets resolved`, color: 'text-accent-blue', bg: 'bg-blue-900/30', subColor: 'text-text-muted' },
          { icon: AlertOctagon, label: 'Unplanned Downtime', value: `${kpis.total_downtime_hours}h`, sub: `Cost: RM ${kpis.downtime_cost.toLocaleString()}`, color: 'text-amber-400', bg: 'bg-amber-900/30', subColor: 'text-text-muted' },
          { icon: CheckCircle2, label: 'PM Compliance', value: `${kpis.pm_compliance_rate}%`, sub: kpis.pm_compliance_rate >= 90 ? 'On track' : 'Needs attention', color: 'text-emerald-400', bg: 'bg-emerald-900/30', subColor: kpis.pm_compliance_rate >= 90 ? 'text-emerald-400' : 'text-amber-400' },
        ].map((c, i) => (
          <div key={i} className="bg-surface-card border border-surface-border rounded-xl px-4 lg:px-5 py-3.5 lg:py-4 flex items-center gap-3">
            <span className={`p-2.5 rounded-lg ${c.bg}`}><c.icon className={`w-5 h-5 ${c.color} shrink-0`} /></span>
            <div className="min-w-0">
              <p className="text-xs text-text-muted whitespace-nowrap">{c.label}</p>
              <p className={`text-xl lg:text-2xl font-bold ${c.color}`}>{c.value}</p>
              <p className={`text-xs ${c.subColor}`}>{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== CHARTS GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Downtime by Category */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-accent-blue" />Downtime by Machine Category</h3>
          {mounted && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={130} />
                <Tooltip {...darkTooltip} formatter={(v) => [`${v} hrs`, 'Downtime']} />
                <Bar dataKey="total_downtime_hours" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Downtime hours" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Monthly Downtime Trend */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent-purple" />Downtime Trend</h3>
          {mounted && (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="period" tickFormatter={(v) => { const d = new Date(v); return d.toLocaleDateString('en-US', { month: 'short' }); }} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip {...darkTooltip} labelFormatter={(v) => { const d = new Date(v); return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="downtime_hours" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Downtime (hrs)" />
                {/* Target MTTR line (static reference) */}
                <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Target (5h)" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 3: Priority Distribution (Donut) */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><AlertOctagon className="w-4 h-4 text-rose-400" />Defect by Priority</h3>
          {mounted && (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={priorityData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="count" nameKey="priority"
                  label={renderPieLabel} labelLine={{ stroke: '#64748b', strokeWidth: 1 }}>
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[entry.priority] || CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...darkTooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 4: Technician MTTR */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-accent-green" />Technician MTTR</h3>
          {mounted && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={techData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} unit="h" />
                <YAxis type="category" dataKey="technician_name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={110} />
                <Tooltip {...darkTooltip} formatter={(v) => [`${v} hrs`, 'Avg MTTR']} />
                <Bar dataKey="avg_mttr_hours" fill="#10b981" radius={[0, 4, 4, 0]} barSize={22} name="Avg MTTR" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ===== WORST OFFENDERS TABLE ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Worst Offenders — Top 5</h2>
          <button onClick={() => exportCSV(fullOffenders || offenders, `equip-maint-full-audit-${range}.csv`)} className="text-xs text-accent-blue hover:text-blue-400 transition-colors flex items-center gap-1">
            <Download className="w-3 h-3" />Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left px-3 lg:px-5 py-3 font-semibold">Equipment</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden md:table-cell">Zone</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden sm:table-cell">Category</th>
              <th className="text-center px-3 lg:px-5 py-3 font-semibold">Failures</th>
              <th className="text-right px-3 lg:px-5 py-3 font-semibold">Downtime</th>
              <th className="text-right px-3 lg:px-5 py-3 font-semibold">Est. Loss</th>
              <th className="text-center px-3 lg:px-5 py-3 font-semibold">Risk</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-border">
              {offenders.map((o, i) => {
                const risk = healthRisk(o.total_downtime);
                return (
                  <tr key={i} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-3 lg:px-5 py-3.5">
                      <p className="font-medium text-text-primary text-xs lg:text-sm">{o.machine_name}</p>
                      <p className="text-xs text-text-muted font-mono">{o.machine_code}</p>
                    </td>
                    <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden md:table-cell">{o.location_zone}</td>
                    <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden sm:table-cell">{o.category || '—'}</td>
                    <td className="px-3 lg:px-5 py-3.5 text-center font-mono text-text-primary text-sm">{o.failure_count}</td>
                    <td className="px-3 lg:px-5 py-3.5 text-right font-mono text-rose-400 text-sm">{o.total_downtime}h</td>
                    <td className="px-3 lg:px-5 py-3.5 text-right font-mono text-amber-400 text-sm">RM {o.est_loss.toLocaleString()}</td>
                    <td className="px-3 lg:px-5 py-3.5 text-center"><span className={`text-xs font-bold ${risk.cls}`}>{risk.label}</span></td>
                  </tr>
                );
              })}
              {offenders.length === 0 && <tr><td colSpan={7} className="text-center text-text-muted py-12">No data for selected range.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
