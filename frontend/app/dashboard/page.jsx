'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from 'recharts';
import {
  Factory, CheckCircle2, AlertTriangle, Clock, Zap,
  AlertOctagon, Wrench, CalendarClock, MoreVertical, Eye, BarChart3,
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// STATIC / MOCK DATA (replace with API calls in production)
// ---------------------------------------------------------------------------

const DOWNTIME_TREND = [
  { month: 'Jan', CNC: 4.5, Robotics: 2.1, Autoclave: 6.2, Conveyor: 1.8 },
  { month: 'Feb', CNC: 3.8, Robotics: 1.5, Autoclave: 5.1, Conveyor: 0.9 },
  { month: 'Mar', CNC: 2.9, Robotics: 3.2, Autoclave: 7.4, Conveyor: 2.4 },
  { month: 'Apr', CNC: 5.1, Robotics: 2.8, Autoclave: 4.3, Conveyor: 1.1 },
  { month: 'May', CNC: 3.2, Robotics: 1.9, Autoclave: 3.8, Conveyor: 2.2 },
  { month: 'Jun', CNC: 1.7, Robotics: 4.1, Autoclave: 5.6, Conveyor: 3.0 },
];

const PREVENTIVE_SCHEDULE = [
  { id: 1, task: 'CNC-001 Spindle Lubrication', zone: 'Zone-1 Machining', due: '2026-08-09', overdue: false },
  { id: 2, task: 'AST-001 Pressure Valve Calibration', zone: 'Zone-3 Finishing', due: '2026-08-10', overdue: false },
  { id: 3, task: 'ROB-001 Welding Arm Inspection', zone: 'Zone-2 Assembly', due: '2026-08-08', overdue: true },
  { id: 4, task: 'CNV-001 Belt Tension Check', zone: 'Zone-4 Packaging', due: '2026-08-11', overdue: false },
];

const CRITICAL_ALERTS = [
  {
    id: 'c002',
    level: 'CRITICAL',
    machine: 'Autoclave Unit 02 (AST-002)',
    issue: 'Pressure valve fails to maintain 2.5 bar during curing cycle.',
    assigned: 'Tech Team B',
    time: '2026-08-07 06:15',
  },
  {
    id: 'c001',
    level: 'HIGH',
    machine: 'Robot Welder RW-01 (ROB-001)',
    issue: 'Welding arm misalignment - inconsistent bond quality.',
    assigned: 'Ahmad Faizal',
    time: '2026-08-05 08:30',
  },
  {
    id: 'c003',
    level: 'MEDIUM',
    machine: 'Conveyor Belt Main Line (CNV-001)',
    issue: 'Belt slipping at high speed. Tracking misalignment.',
    assigned: 'Siti Nurhaliza',
    time: '2026-08-06 14:00',
  },
];

const EQUIPMENT_TABLE_DATA = [
  { id: 'b001', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', zone: 'Zone-1 Machining', issue: 'None', priority: 'LOW', tech: 'Unassigned', status: 'OPERATIONAL' },
  { id: 'b002', machine_code: 'CNC-002', machine_name: 'CNC Lathe B2', zone: 'Zone-1 Machining', issue: 'None', priority: 'LOW', tech: 'Unassigned', status: 'OPERATIONAL' },
  { id: 'b003', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01', zone: 'Zone-2 Assembly', issue: 'Welding arm misalignment', priority: 'HIGH', tech: 'Ahmad Faizal', status: 'DOWN' },
  { id: 'b004', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01', zone: 'Zone-3 Finishing', issue: 'None', priority: 'LOW', tech: 'Unassigned', status: 'OPERATIONAL' },
  { id: 'b005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02', zone: 'Zone-3 Finishing', issue: 'Pressure valve fault', priority: 'CRITICAL', tech: 'Tech Team B', status: 'DOWN' },
  { id: 'b006', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line', zone: 'Zone-4 Packaging', issue: 'Belt slipping', priority: 'MEDIUM', tech: 'Siti Nurhaliza', status: 'MAINTENANCE' },
  { id: 'b007', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01', zone: 'Zone-1 Machining', issue: 'None', priority: 'LOW', tech: 'Unassigned', status: 'OPERATIONAL' },
  { id: 'b008', machine_code: 'QC-001', machine_name: 'Quality Control Scanner', zone: 'Zone-4 Packaging', issue: 'None', priority: 'LOW', tech: 'Unassigned', status: 'OPERATIONAL' },
];

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------

function KpiCard({ icon: Icon, label, value, colorClass, accentColor }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-5 flex items-start justify-between hover:border-surface-elevated transition-colors">
      <div>
        <p className="text-text-muted text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${accentColor}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    OPERATIONAL: 'badge-green',
    MAINTENANCE: 'badge-orange',
    DOWN: 'bg-rose-900/40 text-rose-400 border border-rose-700/50 px-2.5 py-0.5 rounded-full text-xs font-semibold animate-pulse',
  };
  return <span className={map[status] || 'badge-green'}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const map = {
    LOW: 'badge-green',
    MEDIUM: 'badge-orange',
    HIGH: 'bg-red-900/30 text-red-400 border border-red-700/40 px-2.5 py-0.5 rounded-full text-xs font-semibold',
    CRITICAL: 'bg-red-950/80 text-red-300 border border-red-600/60 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse',
  };
  return <span className={map[priority] || 'badge-green'}>{priority}</span>;
}

// ---------------------------------------------------------------------------
// MAIN DASHBOARD PAGE
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [equipmentData, setEquipmentData] = useState(EQUIPMENT_TABLE_DATA);
  const [alerts, setAlerts] = useState(CRITICAL_ALERTS);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [reportIssue, setReportIssue] = useState('');
  const [reportPriority, setReportPriority] = useState('MEDIUM');
  const [kpi, setKpi] = useState({
    totalMachinery: 0,
    operational: 0,
    maintenance: 0,
    down: 0,
    avgMttrHours: 0,
  });

  // Fetch live stats + equipment + alerts from API
  useEffect(() => {
    async function fetchData() {
      try {
        // KPI stats
        const stats = await api.getEquipmentStats();
        setKpi({
          totalMachinery: stats.total_machinery,
          operational: stats.operational,
          maintenance: stats.maintenance,
          down: stats.down,
          avgMttrHours: stats.avg_mttr_hours,
        });

        // Equipment table — fetch all active equipment
        const eqRes = await api.getEquipment({ limit: 50 });
        const eqData = eqRes.data || eqRes;
        // Fetch open + in-progress tickets for merging
        const ticketRes = await api.getTickets({ status: 'OPEN', limit: 50 });
        const inProgressRes = await api.getTickets({ status: 'IN_PROGRESS', limit: 50 });
        const activeTickets = [...(ticketRes.data || ticketRes), ...(inProgressRes.data || inProgressRes)];

        const merged = eqData.map((eq) => {
          const ticket = activeTickets.find((t) => t.equipment_id === eq.id);
          return {
            id: eq.id,
            machine_code: eq.machine_code,
            machine_name: eq.machine_name,
            zone: eq.location_zone,
            issue: ticket ? ticket.issue_description : 'None',
            priority: ticket ? ticket.priority : 'LOW',
            tech: ticket ? (ticket.assigned_tech_name || 'Unassigned') : 'Unassigned',
            status: eq.status,
            ticket_id: ticket ? ticket.id : null,
          };
        });
        setEquipmentData(merged);

        // Live alerts from OPEN + IN_PROGRESS tickets
        const alertData = activeTickets.map((t) => ({
          id: t.id,
          level: t.priority,
          machine: `${t.machine_name} (${t.machine_code})`,
          issue: t.issue_description,
          assigned: t.assigned_tech_name || 'Unassigned',
          time: new Date(t.created_at).toISOString().slice(0, 16).replace('T', ' '),
        }));
        setAlerts(alertData);
      } catch {
        // Keep existing data if API fails
      }
    }
    fetchData();
  }, []);

  const displayKpi = {
    totalMachinery: kpi.totalMachinery || equipmentData.length,
    operational: kpi.operational,
    maintenance: kpi.maintenance,
    down: kpi.down,
    avgMttrHours: kpi.avgMttrHours || 2.4,
  };

  // Report Defect — open modal
  const handleReportClick = useCallback((equip) => {
    setSelectedEquip(equip);
    setReportIssue('');
    setReportPriority('MEDIUM');
    setShowReportModal(true);
  }, []);

  // Submit Defect Report
  const handleSubmitReport = useCallback(() => {
    if (!selectedEquip || !reportIssue.trim()) return;

    const newAlert = {
      id: `c${Date.now()}`,
      level: reportPriority,
      machine: `${selectedEquip.machine_name} (${selectedEquip.machine_code})`,
      issue: reportIssue,
      assigned: 'Unassigned',
      time: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    setAlerts((prev) => [newAlert, ...prev]);

    setEquipmentData((prev) =>
      prev.map((e) =>
        e.id === selectedEquip.id
          ? { ...e, status: 'DOWN', issue: reportIssue, priority: reportPriority, tech: 'Unassigned' }
          : e
      )
    );

    setShowReportModal(false);
    setSelectedEquip(null);
    setReportIssue('');
  }, [selectedEquip, reportIssue, reportPriority]);

  // Resolve Ticket
  const handleResolveClick = useCallback((equip) => {
    setEquipmentData((prev) =>
      prev.map((e) =>
        e.id === equip.id
          ? { ...e, status: 'OPERATIONAL', issue: 'None', priority: 'LOW', tech: 'Unassigned' }
          : e
      )
    );

    setAlerts((prev) =>
      prev.filter(
        (a) => !a.machine.includes(equip.machine_code)
      )
    );
  }, []);

  return (
    <div className="space-y-6">

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Factory}
          label="Total Plant Machinery"
          value={displayKpi.totalMachinery}
          colorClass="text-text-primary"
          accentColor="bg-blue-900/30 text-accent-blue"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Operational Equipment"
          value={displayKpi.operational}
          colorClass="text-accent-green"
          accentColor="bg-green-900/30 text-accent-green"
        />
        <KpiCard
          icon={Wrench}
          label="Under Maintenance"
          value={displayKpi.maintenance}
          colorClass="text-amber-400"
          accentColor="bg-amber-900/30 text-amber-400"
        />
        <KpiCard
          icon={AlertOctagon}
          label="Machines Down / Faulty"
          value={displayKpi.down}
          colorClass="text-accent-red"
          accentColor="bg-red-900/40 text-accent-red"
        />
        <KpiCard
          icon={Clock}
          label="Avg MTTR (Hours)"
          value={`${displayKpi.avgMttrHours}h`}
          colorClass="text-accent-blue"
          accentColor="bg-blue-900/30 text-accent-blue"
        />
      </div>

      {/* ===== MIDDLE SECTION ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Preventive Schedule (Left) */}
        <div className="lg:col-span-3 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Preventive Maintenance Due
            </h2>
          </div>
          <div className="space-y-3">
            {PREVENTIVE_SCHEDULE.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-sm ${
                  item.overdue
                    ? 'border-red-700/50 bg-red-900/10'
                    : 'border-surface-border bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wrench className={`w-4 h-4 ${item.overdue ? 'text-accent-red' : 'text-accent-orange'}`} />
                  <span className="font-medium text-text-primary truncate">{item.task}</span>
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-text-muted">
                  <span>{item.zone}</span>
                  <span className={item.overdue ? 'text-accent-red font-semibold' : ''}>
                    {item.overdue ? 'OVERDUE: ' : 'Due: '}{item.due}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Downtime Chart (Center) */}
        <div className="lg:col-span-6 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Downtime Hours per Machine Category (6-Month Trend)
            </h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={DOWNTIME_TREND} barSize={18} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#343842" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#22262e',
                  border: '1px solid #343842',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '13px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="CNC" fill="#3b82f6" radius={[4, 4, 0, 0]} name="CNC Machines" />
              <Bar dataKey="Robotics" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Robotics" />
              <Bar dataKey="Autoclave" fill="#ef4444" radius={[4, 4, 0, 0]} name="Autoclave Units" />
              <Bar dataKey="Conveyor" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Conveyor Systems" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Defect Alerts (Right) */}
        <div className="lg:col-span-3 bg-surface-card border border-surface-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertOctagon className="w-5 h-5 text-accent-red animate-pulse" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
              Live Defect Alerts
            </h2>
          </div>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {alerts.length === 0 && (
              <p className="text-text-muted text-sm text-center py-8">No active alerts.</p>
            )}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border text-sm ${
                  alert.level === 'CRITICAL'
                    ? 'border-red-600/50 bg-red-950/20 ring-1 ring-red-600/20 animate-pulse'
                    : alert.level === 'HIGH'
                    ? 'border-orange-600/50 bg-orange-950/15'
                    : 'border-surface-border bg-surface-elevated'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      alert.level === 'CRITICAL'
                        ? 'text-red-400'
                        : alert.level === 'HIGH'
                        ? 'text-orange-400'
                        : 'text-yellow-400'
                    }`}
                  >
                    {alert.level}
                  </span>
                  <span className="text-text-muted text-xs">| {alert.time}</span>
                </div>
                <p className="font-medium text-text-primary text-xs leading-relaxed">{alert.machine}</p>
                <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{alert.issue}</p>
                <p className="text-text-muted text-xs mt-1">
                  Assigned: <span className="text-text-secondary">{alert.assigned}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== EQUIPMENT & MAINTENANCE TICKETS TABLE ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            Equipment Register &amp; Maintenance Tickets
          </h2>
          <span className="text-xs text-text-muted">
            {equipmentData.length} machines registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Equipment ID</th>
                <th className="text-left px-5 py-3 font-semibold">Machine Name</th>
                <th className="text-left px-5 py-3 font-semibold">Location / Zone</th>
                <th className="text-left px-5 py-3 font-semibold">Active Issue</th>
                <th className="text-left px-5 py-3 font-semibold">Priority</th>
                <th className="text-left px-5 py-3 font-semibold">Assigned Tech</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-center px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {equipmentData.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-surface-elevated/50 transition-colors ${
                    row.status === 'DOWN' ? 'bg-red-950/15' : ''
                  }`}
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-accent-blue">{row.machine_code}</td>
                  <td className="px-5 py-3.5 font-medium text-text-primary">{row.machine_name}</td>
                  <td className="px-5 py-3.5 text-text-secondary">{row.zone}</td>
                  <td className="px-5 py-3.5 text-text-secondary max-w-[180px] truncate">
                    {row.issue}
                  </td>
                  <td className="px-5 py-3.5">
                    <PriorityBadge priority={row.priority} />
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">{row.tech}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.status === 'DOWN' || row.status === 'MAINTENANCE' ? (
                      <button
                        onClick={() => handleResolveClick(row)}
                        className="btn-success text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                        Resolve Ticket
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReportClick(row)}
                        className="btn-danger text-xs"
                      >
                        <AlertOctagon className="w-3.5 h-3.5 inline mr-1" />
                        Report Defect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {equipmentData.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-text-muted py-12">
                    No equipment registered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== REPORT DEFECT MODAL ===== */}
      {showReportModal && selectedEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <AlertOctagon className="w-5 h-5 text-accent-red" />
              <h3 className="text-lg font-semibold text-text-primary">Report Machine Defect</h3>
            </div>

            <p className="text-sm text-text-secondary mb-4">
              <span className="text-text-primary font-medium">{selectedEquip.machine_code}</span> — {selectedEquip.machine_name}
              <br />
              <span className="text-text-muted text-xs">Zone: {selectedEquip.zone}</span>
            </p>

            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Issue Description
            </label>
            <textarea
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none mb-4"
              rows={3}
              placeholder="Describe the fault or defect observed..."
              value={reportIssue}
              onChange={(e) => setReportIssue(e.target.value)}
            />

            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Priority Level
            </label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 mb-5"
              value={reportPriority}
              onChange={(e) => setReportPriority(e.target.value)}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowReportModal(false); setSelectedEquip(null); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportIssue.trim()}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Submit Defect Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

