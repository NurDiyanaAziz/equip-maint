'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ClipboardList, AlertOctagon, Wrench, CheckCircle2, Clock,
  Search, Plus, X, Eye, ArrowLeft, Calendar, MapPin,
  Filter, UserCheck, Timer, Hash, AlertTriangle,
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------

const INITIAL_TICKETS = [
  { id: 'c0000000-0000-0000-0000-000000000003', equipment_id: 'b0000000-0000-0000-0000-000000000003', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01', location_zone: 'Zone-2 Assembly', serial_number: 'SN-ROB-2024-001', category: 'Robotics & Welding', priority: 'HIGH', issue_description: 'Welding arm misalignment causing inconsistent bond quality on chassis frames.', ticket_status: 'IN_PROGRESS', reported_by_name: 'Raj Kumar', assigned_tech_name: 'Ahmad Faizal', created_at: '2026-08-05T00:30:00.000Z', resolved_at: null, downtime_hours: null },
  { id: 'c0000000-0000-0000-0000-000000000002', equipment_id: 'b0000000-0000-0000-0000-000000000005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02', location_zone: 'Zone-3 Finishing', serial_number: 'SN-AST-2024-002', category: 'Autoclave / Curing', priority: 'CRITICAL', issue_description: 'Pressure valve fails to maintain 2.5 bar during curing cycle. Risk of product batch rejection.', ticket_status: 'OPEN', reported_by_name: 'Raj Kumar', assigned_tech_name: null, created_at: '2026-08-06T22:15:00.000Z', resolved_at: null, downtime_hours: null },
  { id: 'c0000000-0000-0000-0000-000000000001', equipment_id: 'b0000000-0000-0000-0000-000000000006', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line', location_zone: 'Zone-4 Packaging', serial_number: 'SN-CNV-2024-001', category: 'Conveyor Systems', priority: 'MEDIUM', issue_description: 'Conveyor belt slipping at high speed. Minor tracking misalignment observed.', ticket_status: 'IN_PROGRESS', reported_by_name: 'Raj Kumar', assigned_tech_name: 'Siti Nurhaliza', created_at: '2026-08-06T06:00:00.000Z', resolved_at: null, downtime_hours: null },
  { id: 'c0000000-0000-0000-0000-000000000004', equipment_id: 'b0000000-0000-0000-0000-000000000001', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', location_zone: 'Zone-1 Machining', serial_number: 'SN-CNC-2024-001', category: 'CNC Machining', priority: 'LOW', issue_description: 'Coolant pump making intermittent noise. No impact on production quality yet.', ticket_status: 'OPEN', reported_by_name: 'Raj Kumar', assigned_tech_name: null, created_at: '2026-08-07T01:00:00.000Z', resolved_at: null, downtime_hours: null },
];

const TECHNICIANS = [
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Ahmad Faizal' },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Siti Nurhaliza' },
  { id: 'a0000000-0000-0000-0000-000000000005', name: 'Tech Team B' },
];

const EQUIPMENT_OPTIONS = [
  { id: 'b0000000-0000-0000-0000-000000000001', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', zone: 'Zone-1 Machining' },
  { id: 'b0000000-0000-0000-0000-000000000002', machine_code: 'CNC-002', machine_name: 'CNC Lathe B2', zone: 'Zone-1 Machining' },
  { id: 'b0000000-0000-0000-0000-000000000003', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01', zone: 'Zone-2 Assembly' },
  { id: 'b0000000-0000-0000-0000-000000000004', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01', zone: 'Zone-3 Finishing' },
  { id: 'b0000000-0000-0000-0000-000000000005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02', zone: 'Zone-3 Finishing' },
  { id: 'b0000000-0000-0000-0000-000000000006', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line', zone: 'Zone-4 Packaging' },
  { id: 'b0000000-0000-0000-0000-000000000007', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01', zone: 'Zone-1 Machining' },
  { id: 'b0000000-0000-0000-0000-000000000008', machine_code: 'QC-001', machine_name: 'Quality Control Scanner', zone: 'Zone-4 Packaging' },
];

// ---------------------------------------------------------------------------
// BADGES
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    OPEN:         'bg-rose-900/30 text-rose-400 border border-rose-700/40',
    IN_PROGRESS:  'bg-amber-900/30 text-amber-400 border border-amber-700/40',
    RESOLVED:     'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || ''}`}>
      {status === 'IN_PROGRESS' ? 'IN PROGRESS' : status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    LOW:      'bg-slate-700/50 text-slate-400 border border-slate-600/40',
    MEDIUM:   'bg-amber-900/30 text-amber-400 border border-amber-700/40',
    HIGH:     'bg-orange-900/40 text-orange-400 border border-orange-700/50',
    CRITICAL: 'bg-rose-950/80 text-rose-300 border border-rose-600/60 animate-pulse',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[priority] || ''}`}>
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LOG NEW TICKET MODAL (portal)
// ---------------------------------------------------------------------------

function LogTicketModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    equipment_id: '',
    priority: 'MEDIUM',
    issue_description: '',
  });
  const [errors, setErrors] = useState({});
  const [equipmentList, setEquipmentList] = useState([]);
  const [loadingEquip, setLoadingEquip] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await api.getEquipment({ limit: 100, zone: '', status: '', category: '' });
        const data = res.data || res;
        if (!cancelled) setEquipmentList(data);
      } catch {
        if (!cancelled) setEquipmentList(EQUIPMENT_OPTIONS);
      } finally {
        if (!cancelled) setLoadingEquip(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.equipment_id) errs.equipment_id = 'Select equipment.';
    if (form.issue_description.length < 10) errs.issue_description = 'Min 10 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const selected = equipmentList.find((e) => e.id === form.equipment_id);
    onCreate({
      id: `c${Date.now()}`,
      equipment_id: form.equipment_id,
      machine_code: selected?.machine_code,
      machine_name: selected?.machine_name,
      location_zone: selected?.location_zone || selected?.zone,
      priority: form.priority,
      issue_description: form.issue_description,
      ticket_status: 'OPEN',
      reported_by_name: 'Diyana Aziz',
      assigned_tech_name: null,
      created_at: new Date().toISOString(),
      resolved_at: null,
      downtime_hours: null,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-text-primary">Log Defect Ticket</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Equipment *</label>
            <select
              className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.equipment_id ? 'border-rose-500' : 'border-surface-border'}`}
              value={form.equipment_id}
              onChange={(e) => { setForm((f) => ({ ...f, equipment_id: e.target.value })); setErrors((p) => ({ ...p, equipment_id: '' })); }}
              disabled={loadingEquip}
            >
              <option value="">{loadingEquip ? 'Loading equipment...' : 'Select equipment'}</option>
              {equipmentList.map((e) => {
                const zone = e.location_zone || e.zone;
                return (
                  <option key={e.id} value={e.id}>{e.machine_code} — {e.machine_name} ({zone})</option>
                );
              })}
            </select>
            {errors.equipment_id && <p className="text-rose-400 text-xs mt-1">{errors.equipment_id}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Priority</label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Issue Description *</label>
            <textarea
              className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none ${errors.issue_description ? 'border-rose-500' : 'border-surface-border'}`}
              rows={4}
              placeholder="Describe the fault or defect observed..."
              value={form.issue_description}
              onChange={(e) => { setForm((f) => ({ ...f, issue_description: e.target.value })); setErrors((p) => ({ ...p, issue_description: '' })); }}
            />
            {errors.issue_description && <p className="text-rose-400 text-xs mt-1">{errors.issue_description}</p>}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Submit Defect Ticket</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// SLIDE-OVER TICKET DETAIL DRAWER (portal)
// ---------------------------------------------------------------------------

function TicketDetailDrawer({ ticket, onClose, onAssign, onResolve }) {
  const [selectedTech, setSelectedTech] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [confirmResolve, setConfirmResolve] = useState(false);

  const handleAssign = () => {
    if (!selectedTech) return;
    onAssign(ticket.id, selectedTech);
    setShowAssign(false);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[110] h-screen w-full sm:max-w-lg bg-surface-card border-l border-surface-border shadow-2xl flex flex-col animate-slide-in">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-5 bg-surface-card border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-semibold text-text-primary">{ticket.machine_name}</h3>
              <p className="text-xs text-accent-blue font-mono">{ticket.machine_code} — TICKET #{ticket.id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <StatusBadge status={ticket.ticket_status} />
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Priority & Equipment */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Priority</p>
              <PriorityBadge priority={ticket.priority} />
            </div>
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Zone</p>
              <p className="text-text-primary font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-text-muted" />{ticket.location_zone}</p>
            </div>
          </div>

          {/* Issue Description */}
          <div className="bg-surface-elevated border border-surface-border rounded-xl p-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Issue Description</h4>
            <p className="text-sm text-text-primary leading-relaxed">{ticket.issue_description}</p>
          </div>

          {/* People & Timeline */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Reported By</p>
              <p className="text-text-primary font-medium">{ticket.reported_by_name}</p>
            </div>
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Assigned To</p>
              <p className="text-text-primary font-medium">{ticket.assigned_tech_name || 'Unassigned'}</p>
            </div>
          </div>

          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <p className="text-xs text-text-muted mb-1">Created At</p>
            <p className="text-text-primary font-mono text-sm flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              {new Date(ticket.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          {ticket.ticket_status === 'RESOLVED' && (
            <div className="bg-emerald-900/10 border border-emerald-700/30 rounded-xl p-3">
              <p className="text-xs text-emerald-400 font-semibold mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />RESOLVED
              </p>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Resolved at:</span>
                <span className="text-text-primary font-mono">{new Date(ticket.resolved_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-text-muted">Downtime:</span>
                <span className="text-rose-400 font-mono font-semibold">{ticket.downtime_hours}h</span>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {ticket.ticket_status !== 'RESOLVED' && (
          <div className="px-5 py-4 border-t border-surface-border shrink-0 space-y-3">
            {ticket.ticket_status === 'OPEN' && !showAssign && (
              <button onClick={() => setShowAssign(true)} className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <UserCheck className="w-4 h-4" />Assign Technician & Start Repair
              </button>
            )}

            {showAssign && (
              <div className="space-y-2">
                <label className="text-xs text-text-muted">Select Technician</label>
                <select
                  className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                >
                  <option value="">Choose technician...</option>
                  {TECHNICIANS.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button onClick={() => setShowAssign(false)} className="flex-1 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-surface-border rounded-lg transition-colors">Cancel</button>
                  <button onClick={handleAssign} disabled={!selectedTech} className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Confirm Assign</button>
                </div>
              </div>
            )}

            {ticket.ticket_status === 'IN_PROGRESS' && !confirmResolve && (
              <button onClick={() => setConfirmResolve(true)} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <CheckCircle2 className="w-4 h-4" />Resolve Ticket
              </button>
            )}

            {confirmResolve && (
              <div className="bg-rose-950/20 border border-rose-700/40 rounded-xl p-3 space-y-2">
                <p className="text-xs text-text-secondary">Confirm resolve? Machine &quot;{ticket.machine_name}&quot; will be restored to <span className="text-emerald-400">OPERATIONAL</span> and downtime finalized.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmResolve(false)} className="flex-1 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-surface-border rounded-lg transition-colors">Cancel</button>
                  <button onClick={() => { onResolve(ticket.id); setConfirmResolve(false); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Confirm Resolve</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-slide-in { animation: slideInRight 0.25s ease-out; }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// MAIN TICKETS PAGE
// ---------------------------------------------------------------------------

export default function TicketsPage() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on client mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('equip-maint-tickets');
      if (saved) setTickets(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  // Fetch from API
  useEffect(() => {
    let cancelled = false;
    async function fetchTickets() {
      try {
        const res = await api.getTickets({ limit: 100 });
        const data = res.data || res;
        if (!cancelled) {
          setTickets(data);
          localStorage.setItem('equip-maint-tickets', JSON.stringify(data));
        }
      } catch (err) {
        if (!cancelled) setApiError('Backend unavailable — using cached data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTickets();
    return () => { cancelled = true; };
  }, []);

  // Sync to localStorage
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('equip-maint-tickets', JSON.stringify(tickets));
    }
  }, [tickets, hydrated]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [drawerTicket, setDrawerTicket] = useState(null);

  // Filtered data
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL' && t.ticket_status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !t.id.toLowerCase().includes(q) &&
          !(t.machine_code && t.machine_code.toLowerCase().includes(q)) &&
          !(t.issue_description && t.issue_description.toLowerCase().includes(q))
        ) return false;
      }
      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  // KPI stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const open = tickets.filter((t) => t.ticket_status === 'OPEN' || t.ticket_status === 'IN_PROGRESS');
    return {
      openTotal: open.length,
      critical: open.filter((t) => t.priority === 'CRITICAL').length,
      inProgress: tickets.filter((t) => t.ticket_status === 'IN_PROGRESS').length,
      resolvedToday: tickets.filter(
        (t) => t.ticket_status === 'RESOLVED' && t.resolved_at && t.resolved_at.slice(0, 10) === today
      ).length,
    };
  }, [tickets]);

  const handleCreate = useCallback(async (newTicket) => {
    setTickets((prev) => [newTicket, ...prev]);
    setShowLogModal(false);
    try {
      const user = JSON.parse(localStorage.getItem('equip-maint-user') || '{}');
      await api.createTicket({
        equipment_id: newTicket.equipment_id,
        reported_by_user_id: user.id || 'a0000000-0000-0000-0000-000000000001',
        priority: newTicket.priority,
        issue_description: newTicket.issue_description,
      });
    } catch (err) {
      console.error('Failed to create ticket on server:', err.message);
    }
  }, []);

  const handleAssign = useCallback(async (ticketId, techId) => {
    const tech = TECHNICIANS.find((t) => t.id === techId);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, ticket_status: 'IN_PROGRESS', assigned_tech_name: tech?.name || null }
          : t
      )
    );
    try {
      await api.assignTicket(ticketId, techId);
    } catch (err) {
      console.error('Failed to assign on server:', err.message);
    }
  }, []);

  const handleResolve = useCallback(async (ticketId) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        const now = new Date().toISOString();
        const created = new Date(t.created_at);
        const hours = parseFloat(((Date.now() - created.getTime()) / (1000 * 60 * 60)).toFixed(2));
        return {
          ...t,
          ticket_status: 'RESOLVED',
          resolved_at: now,
          downtime_hours: hours,
        };
      })
    );
    try {
      await api.resolveTicket(ticketId);
    } catch (err) {
      console.error('Failed to resolve on server:', err.message);
    }
  }, []);

  const statusTabs = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
  ];

  return (
    <div className="space-y-5">
      {/* API error banner */}
      {apiError && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />{apiError}
        </div>
      )}
      {loading && <div className="text-text-muted text-xs py-1">Loading tickets...</div>}

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ClipboardList, label: 'Total Open Tickets', value: stats.openTotal, color: 'text-accent-blue', bg: 'bg-blue-900/30' },
          { icon: AlertOctagon, label: 'Critical Faults', value: stats.critical, color: 'text-rose-400', bg: 'bg-rose-900/30' },
          { icon: Wrench, label: 'In-Progress Repairs', value: stats.inProgress, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { icon: CheckCircle2, label: 'Resolved Today', value: stats.resolvedToday, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
        ].map((card, i) => (
          <div key={i} className="bg-surface-card border border-surface-border rounded-xl px-4 lg:px-5 py-3.5 lg:py-4 flex items-center gap-3">
            <span className={`p-2.5 rounded-lg ${card.bg}`}><card.icon className={`w-5 h-5 ${card.color} shrink-0`} /></span>
            <div className="min-w-0">
              <p className="text-xs text-text-muted whitespace-nowrap">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== FILTER TOOLBAR ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
        {/* Search */}
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            placeholder="Search by ticket ID, machine code, or issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status tabs + priority + action */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-accent-blue text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              className="bg-surface-elevated border border-surface-border rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <button
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />Log Defect Ticket
            </button>
          </div>
        </div>
      </div>

      {/* ===== MASTER TICKETS TABLE ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Defect Tickets</h2>
          <span className="text-xs text-text-muted">{filteredTickets.length} tickets</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Ticket ID</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Equipment</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden sm:table-cell">Zone</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Priority</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden md:table-cell">Reported</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden lg:table-cell">Tech</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden xl:table-cell">Date</th>
                <th className="text-center px-3 lg:px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredTickets.map((t) => (
                <tr
                  key={t.id}
                  className={`hover:bg-surface-elevated/50 transition-colors cursor-pointer ${
                    t.priority === 'CRITICAL' ? 'bg-rose-950/10' : ''
                  }`}
                  onClick={() => setDrawerTicket(t)}
                >
                  <td className="px-3 lg:px-5 py-3.5 font-mono text-xs text-accent-blue">
                    #{t.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-3 lg:px-5 py-3.5">
                    <p className="font-medium text-text-primary text-xs lg:text-sm">{t.machine_name}</p>
                    <p className="text-xs text-text-muted font-mono">{t.machine_code}</p>
                  </td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden sm:table-cell">{t.location_zone}</td>
                  <td className="px-3 lg:px-5 py-3.5"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden md:table-cell">{t.reported_by_name}</td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden lg:table-cell">{t.assigned_tech_name || '—'}</td>
                  <td className="px-3 lg:px-5 py-3.5"><StatusBadge status={t.ticket_status} /></td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-muted text-xs font-mono hidden xl:table-cell whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-3 lg:px-5 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setDrawerTicket(t)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {t.ticket_status === 'RESOLVED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-text-muted py-16">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tickets match your filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
          <span>Showing {filteredTickets.length} of {tickets.length} tickets</span>
        </div>
      </div>

      {/* ===== LOG TICKET MODAL ===== */}
      {showLogModal && (
        <LogTicketModal onClose={() => setShowLogModal(false)} onCreate={handleCreate} />
      )}

      {/* ===== DETAIL DRAWER ===== */}
      {drawerTicket && (
        <TicketDetailDrawer
          ticket={drawerTicket}
          onClose={() => setDrawerTicket(null)}
          onAssign={handleAssign}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
