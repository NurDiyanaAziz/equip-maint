'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarCheck, AlertOctagon, Clock, CheckCircle2, TrendingUp,
  Search, Plus, X, Eye, ArrowLeft, Calendar, MapPin, Wrench,
  AlertTriangle, RotateCw, ShieldAlert,
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// MOCK DATA (matches Supabase seed)
// ---------------------------------------------------------------------------

const INITIAL_PREVENTIVE = [
  { id: 'd0000000-0000-0000-0000-000000000005', equipment_id: 'b0000000-0000-0000-0000-000000000007', task_name: 'Hydraulic Press Fluid Check', frequency_days: 30, last_serviced_date: '2026-07-05', next_service_due: '2026-08-04', assigned_technician_id: 'a0000000-0000-0000-0000-000000000002', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01', location_zone: 'Zone-1 Machining', assigned_tech_name: 'Ahmad Faizal', computed_status: 'OVERDUE' },
  { id: 'd0000000-0000-0000-0000-000000000003', equipment_id: 'b0000000-0000-0000-0000-000000000003', task_name: 'Robot Welding Arm Inspection', frequency_days: 60, last_serviced_date: '2026-06-09', next_service_due: '2026-08-08', assigned_technician_id: 'a0000000-0000-0000-0000-000000000002', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01', location_zone: 'Zone-2 Assembly', assigned_tech_name: 'Ahmad Faizal', computed_status: 'OVERDUE' },
  { id: 'd0000000-0000-0000-0000-000000000008', equipment_id: 'b0000000-0000-0000-0000-000000000005', task_name: 'Autoclave Gasket Replacement', frequency_days: 180, last_serviced_date: '2026-02-10', next_service_due: '2026-08-09', assigned_technician_id: 'a0000000-0000-0000-0000-000000000005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02', location_zone: 'Zone-3 Finishing', assigned_tech_name: 'Tech Team B', computed_status: 'DUE_SOON' },
  { id: 'd0000000-0000-0000-0000-000000000001', equipment_id: 'b0000000-0000-0000-0000-000000000001', task_name: 'CNC Spindle Lubrication', frequency_days: 30, last_serviced_date: '2026-07-10', next_service_due: '2026-08-09', assigned_technician_id: 'a0000000-0000-0000-0000-000000000002', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', location_zone: 'Zone-1 Machining', assigned_tech_name: 'Ahmad Faizal', computed_status: 'DUE_SOON' },
  { id: 'd0000000-0000-0000-0000-000000000002', equipment_id: 'b0000000-0000-0000-0000-000000000004', task_name: 'Autoclave Pressure Valve Calibration', frequency_days: 90, last_serviced_date: '2026-05-11', next_service_due: '2026-08-09', assigned_technician_id: 'a0000000-0000-0000-0000-000000000005', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01', location_zone: 'Zone-3 Finishing', assigned_tech_name: 'Tech Team B', computed_status: 'DUE_SOON' },
  { id: 'd0000000-0000-0000-0000-000000000004', equipment_id: 'b0000000-0000-0000-0000-000000000006', task_name: 'Conveyor Belt Tension Check', frequency_days: 45, last_serviced_date: '2026-06-25', next_service_due: '2026-08-09', assigned_technician_id: 'a0000000-0000-0000-0000-000000000003', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line', location_zone: 'Zone-4 Packaging', assigned_tech_name: 'Siti Nurhaliza', computed_status: 'DUE_SOON' },
  { id: 'd0000000-0000-0000-0000-000000000006', equipment_id: 'b0000000-0000-0000-0000-000000000002', task_name: 'CNC Lathe Coolant System Check', frequency_days: 60, last_serviced_date: '2026-06-10', next_service_due: '2026-08-09', assigned_technician_id: 'a0000000-0000-0000-0000-000000000003', machine_code: 'CNC-002', machine_name: 'CNC Lathe B2', location_zone: 'Zone-1 Machining', assigned_tech_name: 'Siti Nurhaliza', computed_status: 'DUE_SOON' },
  { id: 'd0000000-0000-0000-0000-000000000010', equipment_id: 'b0000000-0000-0000-0000-000000000006', task_name: 'Conveyor Motor Inspection', frequency_days: 120, last_serviced_date: '2026-04-15', next_service_due: '2026-08-13', assigned_technician_id: 'a0000000-0000-0000-0000-000000000003', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line', location_zone: 'Zone-4 Packaging', assigned_tech_name: 'Siti Nurhaliza', computed_status: 'UPCOMING' },
  { id: 'd0000000-0000-0000-0000-000000000007', equipment_id: 'b0000000-0000-0000-0000-000000000008', task_name: 'QC Scanner Recalibration', frequency_days: 90, last_serviced_date: '2026-05-16', next_service_due: '2026-08-14', assigned_technician_id: 'a0000000-0000-0000-0000-000000000003', machine_code: 'QC-001', machine_name: 'Quality Control Scanner', location_zone: 'Zone-4 Packaging', assigned_tech_name: 'Siti Nurhaliza', computed_status: 'UPCOMING' },
  { id: 'd0000000-0000-0000-0000-000000000009', equipment_id: 'b0000000-0000-0000-0000-000000000001', task_name: 'CNC Coolant Filter Replacement', frequency_days: 30, last_serviced_date: '2026-07-15', next_service_due: '2026-08-14', assigned_technician_id: 'a0000000-0000-0000-0000-000000000002', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1', location_zone: 'Zone-1 Machining', assigned_tech_name: 'Ahmad Faizal', computed_status: 'UPCOMING' },
  { id: 'd0000000-0000-0000-0000-000000000012', equipment_id: 'b0000000-0000-0000-0000-000000000007', task_name: 'Hydraulic Press Bolts Tightening', frequency_days: 90, last_serviced_date: '2026-05-20', next_service_due: '2026-08-18', assigned_technician_id: 'a0000000-0000-0000-0000-000000000002', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01', location_zone: 'Zone-1 Machining', assigned_tech_name: 'Ahmad Faizal', computed_status: 'UPCOMING' },
  { id: 'd0000000-0000-0000-0000-000000000011', equipment_id: 'b0000000-0000-0000-0000-000000000004', task_name: 'Autoclave Door Seal Check', frequency_days: 30, last_serviced_date: '2026-07-25', next_service_due: '2026-08-24', assigned_technician_id: 'a0000000-0000-0000-0000-000000000005', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01', location_zone: 'Zone-3 Finishing', assigned_tech_name: 'Tech Team B', computed_status: 'UPCOMING' },
];

const TECHNICIANS = [
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Ahmad Faizal' },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Siti Nurhaliza' },
  { id: 'a0000000-0000-0000-0000-000000000005', name: 'Tech Team B' },
];

// ---------------------------------------------------------------------------
// STATUS BADGE
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    OVERDUE:   'bg-rose-900/40 text-rose-400 border border-rose-700/50 animate-pulse',
    DUE_SOON:  'bg-amber-900/30 text-amber-400 border border-amber-700/40',
    UPCOMING:  'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || ''}`}>{status === 'DUE_SOON' ? 'DUE SOON' : status}</span>;
}

// ---------------------------------------------------------------------------
// SCHEDULE INSPECTION MODAL (portal)
// ---------------------------------------------------------------------------

function ScheduleModal({ onClose, onCreate, equipmentList }) {
  const [form, setForm] = useState({ equipment_id: '', task_name: '', frequency_days: '30', last_serviced_date: '', assigned_technician_id: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!form.equipment_id) errs.equipment_id = 'Select equipment.';
    if (!form.task_name.trim()) errs.task_name = 'Task name is required.';
    if (!form.last_serviced_date) errs.last_serviced_date = 'Select date.';
    if (!form.frequency_days || Number(form.frequency_days) < 1) errs.frequency_days = 'Min 1 day.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const eq = equipmentList.find((e) => e.id === form.equipment_id);
    const tech = TECHNICIANS.find((t) => t.id === form.assigned_technician_id);
    const nextDue = new Date(form.last_serviced_date);
    nextDue.setDate(nextDue.getDate() + Number(form.frequency_days));
    onCreate({
      id: `d${Date.now()}`,
      ...form,
      frequency_days: Number(form.frequency_days),
      machine_code: eq?.machine_code,
      machine_name: eq?.machine_name,
      location_zone: eq?.location_zone || eq?.zone,
      assigned_tech_name: tech?.name || null,
      next_service_due: nextDue.toISOString().slice(0, 10),
      computed_status: nextDue < new Date() ? 'OVERDUE' : nextDue <= new Date(Date.now() + 3*86400000) ? 'DUE_SOON' : 'UPCOMING',
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-accent-purple" /><h3 className="text-lg font-semibold text-text-primary">Schedule Inspection</h3></div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Equipment *</label>
            <select className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.equipment_id ? 'border-rose-500' : 'border-surface-border'}`}
              value={form.equipment_id} onChange={(e) => { setForm(f => ({ ...f, equipment_id: e.target.value })); setErrors(p => ({ ...p, equipment_id: '' })); }}>
              <option value="">Select equipment</option>
              {equipmentList.map(e => <option key={e.id} value={e.id}>{e.machine_code} — {e.machine_name}</option>)}
            </select>
            {errors.equipment_id && <p className="text-rose-400 text-xs mt-1">{errors.equipment_id}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Task Name *</label>
            <input className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.task_name ? 'border-rose-500' : 'border-surface-border'}`}
              placeholder="e.g. Quarterly Belt Inspection" value={form.task_name}
              onChange={(e) => { setForm(f => ({ ...f, task_name: e.target.value })); setErrors(p => ({ ...p, task_name: '' })); }} />
            {errors.task_name && <p className="text-rose-400 text-xs mt-1">{errors.task_name}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Interval (Days) *</label>
            <select className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={form.frequency_days} onChange={(e) => setForm(f => ({ ...f, frequency_days: e.target.value }))}>
              <option value="7">7 days (Weekly)</option>
              <option value="14">14 days (Bi-weekly)</option>
              <option value="30">30 days (Monthly)</option>
              <option value="45">45 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days (Quarterly)</option>
              <option value="180">180 days (Semi-annual)</option>
              <option value="365">365 days (Annual)</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Last Serviced *</label>
            <div className="relative">
              <input type="date" className={`w-full bg-surface-elevated border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 [color-scheme:dark] appearance-none date-input-dark ${errors.last_serviced_date ? 'border-rose-500' : 'border-surface-border'}`}
                value={form.last_serviced_date} onChange={(e) => { setForm(f => ({ ...f, last_serviced_date: e.target.value })); setErrors(p => ({ ...p, last_serviced_date: '' })); }} />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            {errors.last_serviced_date && <p className="text-rose-400 text-xs mt-1">{errors.last_serviced_date}</p>}
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Assigned Technician</label>
            <select className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={form.assigned_technician_id} onChange={(e) => setForm(f => ({ ...f, assigned_technician_id: e.target.value }))}>
              <option value="">Unassigned</option>
              {TECHNICIANS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-surface-border">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary">Schedule Inspection</button>
        </div>
      </div>
    </div>, document.body
  );
}

// ---------------------------------------------------------------------------
// TASK DETAIL DRAWER (portal)
// ---------------------------------------------------------------------------

function TaskDetailDrawer({ task, onClose, onComplete, onEscalate }) {
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [desc, setDesc] = useState('');

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[110] h-screen w-full sm:max-w-lg bg-surface-card border-l border-surface-border shadow-2xl flex flex-col animate-slide-in">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-5 bg-surface-card border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated"><ArrowLeft className="w-5 h-5" /></button>
            <div><h3 className="text-base font-semibold text-text-primary">{task.task_name}</h3><p className="text-xs text-accent-blue font-mono">{task.machine_code}</p></div>
          </div>
          <StatusBadge status={task.computed_status} />
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Equipment</p>
              <p className="text-text-primary font-medium">{task.machine_name}</p>
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{task.location_zone}</p>
            </div>
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Frequency</p>
              <p className="text-text-primary font-medium">Every {task.frequency_days} days</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Last Serviced</p>
              <p className="text-text-primary font-mono">{task.last_serviced_date}</p>
            </div>
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">Next Service Due</p>
              <p className={`font-mono font-semibold ${task.computed_status === 'OVERDUE' ? 'text-rose-400' : task.computed_status === 'DUE_SOON' ? 'text-amber-400' : 'text-text-primary'}`}>{task.next_service_due}</p>
            </div>
          </div>
          <div className="bg-surface-elevated border border-surface-border rounded-xl p-3">
            <p className="text-xs text-text-muted mb-1">Assigned Technician</p>
            <p className="text-text-primary font-medium">{task.assigned_tech_name || 'Unassigned'}</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-surface-border shrink-0 space-y-3">
          {!confirmComplete && !showEscalate && (
            <div className="flex gap-2">
              <button onClick={() => setConfirmComplete(true)} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <CheckCircle2 className="w-4 h-4" />Complete Task
              </button>
              <button onClick={() => setShowEscalate(true)} className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <ShieldAlert className="w-4 h-4" />Log Defect
              </button>
            </div>
          )}
          {confirmComplete && (
            <div className="bg-emerald-950/20 border border-emerald-700/40 rounded-xl p-3 space-y-2">
              <p className="text-xs text-text-secondary">Confirm completion? Next service will roll forward to {new Date(new Date().getTime() + task.frequency_days * 86400000).toISOString().slice(0,10)}.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmComplete(false)} className="flex-1 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-surface-border rounded-lg transition-colors">Cancel</button>
                <button onClick={() => { onComplete(task.id); setConfirmComplete(false); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Confirm</button>
              </div>
            </div>
          )}
          {showEscalate && (
            <div className="space-y-2">
              <label className="text-xs text-text-muted">Fault Description</label>
              <textarea className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 resize-none" rows={3}
                placeholder="Describe the fault found during inspection..." value={desc} onChange={(e) => setDesc(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setShowEscalate(false)} className="flex-1 px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-surface-border rounded-lg transition-colors">Cancel</button>
                <button onClick={() => { onEscalate(task.id, desc); setShowEscalate(false); setDesc(''); }} disabled={desc.length < 10}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Escalate to Defect Ticket</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`.animate-slide-in { animation: slideInRight 0.25s ease-out; } @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>, document.body
  );
}

// ---------------------------------------------------------------------------
// MAIN PAGE
// ---------------------------------------------------------------------------

export default function PreventivePage() {
  const [schedules, setSchedules] = useState(INITIAL_PREVENTIVE);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [equipmentList, setEquipmentList] = useState([]);

  useEffect(() => { try { const s = localStorage.getItem('equip-maint-preventive'); if (s) setSchedules(JSON.parse(s)); } catch {} setHydrated(true); }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetch() {
      try {
        const res = await api.getPreventive({ limit: 100 });
        const data = res.data || res;
        if (!cancelled) { setSchedules(data); localStorage.setItem('equip-maint-preventive', JSON.stringify(data)); }
        const eq = await api.getEquipment({ limit: 100 });
        if (!cancelled) setEquipmentList(eq.data || eq);
      } catch (err) {
        if (!cancelled) setApiError('Backend unavailable — using cached data.');
        setEquipmentList(EQUIPMENT_STATIC);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetch();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem('equip-maint-preventive', JSON.stringify(schedules)); }, [schedules, hydrated]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [drawerTask, setDrawerTask] = useState(null);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (statusFilter !== 'ALL' && s.computed_status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.task_name.toLowerCase().includes(q) && !(s.machine_code || '').toLowerCase().includes(q) && !(s.machine_name || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [schedules, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: schedules.length,
    overdue: schedules.filter(s => s.computed_status === 'OVERDUE').length,
    dueThisWeek: schedules.filter(s => s.computed_status === 'DUE_SOON' || s.next_service_due <= new Date(Date.now() + 7*86400000).toISOString().slice(0,10)).length,
    completionRate: 94.2,
  }), [schedules]);

  const handleCreate = useCallback(async (s) => {
    setSchedules(prev => [s, ...prev]);
    setShowScheduleModal(false);
    try { await api.createPreventive({ equipment_id: s.equipment_id, task_name: s.task_name, frequency_days: s.frequency_days, last_serviced_date: s.last_serviced_date, assigned_technician_id: s.assigned_technician_id || null }); } catch (e) { console.error(e); }
  }, []);

  const handleComplete = useCallback(async (taskId) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== taskId) return s;
      const next = new Date(); next.setDate(next.getDate() + s.frequency_days);
      return { ...s, last_serviced_date: new Date().toISOString().slice(0,10), next_service_due: next.toISOString().slice(0,10), computed_status: 'UPCOMING' };
    }));
    try { await api.completePreventive(taskId); } catch (e) { console.error(e); }
  }, []);

  const handleEscalate = useCallback(async (taskId, desc) => {
    setSchedules(prev => prev.map(s => {
      if (s.id !== taskId) return s;
      const next = new Date(); next.setDate(next.getDate() + s.frequency_days);
      return { ...s, last_serviced_date: new Date().toISOString().slice(0,10), next_service_due: next.toISOString().slice(0,10), computed_status: 'UPCOMING' };
    }));
    try {
      const user = JSON.parse(localStorage.getItem('equip-maint-user') || '{}');
      await api.escalateDefect(taskId, { issue_description: desc, priority: 'HIGH', reported_by_user_id: user.id || 'a0000000-0000-0000-0000-000000000001' });
    } catch (e) { console.error(e); }
    setDrawerTask(null);
  }, []);

  const tabs = [{ key: 'ALL', label: 'All' }, { key: 'OVERDUE', label: 'Overdue' }, { key: 'DUE_SOON', label: 'Due Soon' }, { key: 'UPCOMING', label: 'Upcoming' }];

  return (
    <div className="space-y-5">
      {apiError && <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" />{apiError}</div>}
      {loading && <div className="text-text-muted text-xs py-1">Loading schedules...</div>}

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: CalendarCheck, label: 'Total Schedules', value: stats.total, color: 'text-accent-blue', bg: 'bg-blue-900/30' },
          { icon: AlertOctagon, label: 'Overdue Tasks', value: stats.overdue, color: 'text-rose-400', bg: 'bg-rose-900/30' },
          { icon: Clock, label: 'Due This Week', value: stats.dueThisWeek, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { icon: TrendingUp, label: 'On-Time Completion', value: `${stats.completionRate}%`, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
        ].map((c, i) => (
          <div key={i} className="bg-surface-card border border-surface-border rounded-xl px-4 lg:px-5 py-3.5 lg:py-4 flex items-center gap-3">
            <span className={`p-2.5 rounded-lg ${c.bg}`}><c.icon className={`w-5 h-5 ${c.color} shrink-0`} /></span>
            <div className="min-w-0"><p className="text-xs text-text-muted whitespace-nowrap">{c.label}</p><p className={`text-2xl font-bold ${c.color}`}>{c.value}</p></div>
          </div>
        ))}
      </div>

      {/* ===== FILTER TOOLBAR ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4 space-y-3">
        <div className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            placeholder="Search by task name or equipment code..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-surface-elevated rounded-lg p-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === t.key ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>{t.label}</button>
            ))}
          </div>
          <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />Schedule Inspection
          </button>
        </div>
      </div>

      {/* ===== MASTER TABLE ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Inspection Schedule</h2>
          <span className="text-xs text-text-muted">{filteredSchedules.length} tasks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider">
              <th className="text-left px-3 lg:px-5 py-3 font-semibold">Task</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden md:table-cell">Equipment</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden sm:table-cell">Zone</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden lg:table-cell">Freq</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden md:table-cell">Last</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold">Next Due</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden lg:table-cell">Tech</th>
              <th className="text-left px-3 lg:px-5 py-3 font-semibold">Status</th>
              <th className="text-center px-3 lg:px-5 py-3 font-semibold"></th>
            </tr></thead>
            <tbody className="divide-y divide-surface-border">
              {filteredSchedules.map(s => (
                <tr key={s.id} className={`hover:bg-surface-elevated/50 transition-colors cursor-pointer ${s.computed_status === 'OVERDUE' ? 'bg-rose-950/10' : ''}`} onClick={() => setDrawerTask(s)}>
                  <td className="px-3 lg:px-5 py-3.5 font-medium text-text-primary text-xs lg:text-sm">{s.task_name}</td>
                  <td className="px-3 lg:px-5 py-3.5 hidden md:table-cell"><p className="text-text-primary text-xs">{s.machine_name}</p><p className="text-text-muted text-xs font-mono">{s.machine_code}</p></td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden sm:table-cell">{s.location_zone}</td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden lg:table-cell">{s.frequency_days}d</td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-muted text-xs font-mono hidden md:table-cell">{s.last_serviced_date}</td>
                  <td className={`px-3 lg:px-5 py-3.5 font-mono text-xs font-semibold ${s.computed_status === 'OVERDUE' ? 'text-rose-400' : s.computed_status === 'DUE_SOON' ? 'text-amber-400' : 'text-text-primary'}`}>{s.next_service_due}</td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary text-xs hidden lg:table-cell">{s.assigned_tech_name || '—'}</td>
                  <td className="px-3 lg:px-5 py-3.5"><StatusBadge status={s.computed_status} /></td>
                  <td className="px-3 lg:px-5 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setDrawerTask(s)} className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredSchedules.length === 0 && <tr><td colSpan={9} className="text-center text-text-muted py-16"><Search className="w-10 h-10 mx-auto mb-2 opacity-30" /><p className="text-sm">No schedules match your filters.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
          <span>Showing {filteredSchedules.length} of {schedules.length} schedules</span>
        </div>
      </div>

      {showScheduleModal && <ScheduleModal onClose={() => setShowScheduleModal(false)} onCreate={handleCreate} equipmentList={equipmentList} />}
      {drawerTask && <TaskDetailDrawer task={drawerTask} onClose={() => setDrawerTask(null)} onComplete={handleComplete} onEscalate={handleEscalate} />}
    </div>
  );
}

const EQUIPMENT_STATIC = [
  { id: 'b0000000-0000-0000-0000-000000000001', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1' },
  { id: 'b0000000-0000-0000-0000-000000000002', machine_code: 'CNC-002', machine_name: 'CNC Lathe B2' },
  { id: 'b0000000-0000-0000-0000-000000000003', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01' },
  { id: 'b0000000-0000-0000-0000-000000000004', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01' },
  { id: 'b0000000-0000-0000-0000-000000000005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02' },
  { id: 'b0000000-0000-0000-0000-000000000006', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line' },
  { id: 'b0000000-0000-0000-0000-000000000007', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01' },
  { id: 'b0000000-0000-0000-0000-000000000008', machine_code: 'QC-001', machine_name: 'Quality Control Scanner' },
];
