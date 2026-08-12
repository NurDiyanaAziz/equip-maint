'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';
import { createPortal } from 'react-dom';
import {
  Search, Plus, X, Eye, Pencil, Wrench,
  AlertOctagon, CheckCircle2, Clock, Calendar, Hash, MapPin, Tag,
  Filter, ChevronDown, PackageOpen, History, ArrowLeft,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// MOCK DATA — updated schema including category, serial_number, installation_date
// ---------------------------------------------------------------------------

const INITIAL_EQUIPMENT = [
  { id: 'e001', machine_code: 'CNC-001', machine_name: 'CNC Milling Machine A1',   category: 'CNC Machining',      serial_number: 'SN-CNC-2024-001', zone: 'Zone-1 Machining',  installation_date: '2024-01-15', status: 'OPERATIONAL',   last_serviced: '2026-08-01' },
  { id: 'e002', machine_code: 'CNC-002', machine_name: 'CNC Lathe B2',             category: 'CNC Machining',      serial_number: 'SN-CNC-2024-002', zone: 'Zone-1 Machining',  installation_date: '2024-02-20', status: 'OPERATIONAL',   last_serviced: '2026-07-28' },
  { id: 'e003', machine_code: 'ROB-001', machine_name: 'Robot Welder RW-01',       category: 'Robotics & Welding',  serial_number: 'SN-ROB-2024-001', zone: 'Zone-2 Assembly',   installation_date: '2024-03-10', status: 'DOWN',          last_serviced: '2026-07-15' },
  { id: 'e004', machine_code: 'AST-001', machine_name: 'Autoclave Unit 01',         category: 'Autoclave / Curing',  serial_number: 'SN-AST-2024-001', zone: 'Zone-3 Finishing',  installation_date: '2024-04-05', status: 'OPERATIONAL',   last_serviced: '2026-08-03' },
  { id: 'e005', machine_code: 'AST-002', machine_name: 'Autoclave Unit 02',         category: 'Autoclave / Curing',  serial_number: 'SN-AST-2024-002', zone: 'Zone-3 Finishing',  installation_date: '2024-04-05', status: 'DOWN',          last_serviced: '2026-07-20' },
  { id: 'e006', machine_code: 'CNV-001', machine_name: 'Conveyor Belt Main Line',   category: 'Conveyor Systems',    serial_number: 'SN-CNV-2024-001', zone: 'Zone-4 Packaging',  installation_date: '2024-05-12', status: 'MAINTENANCE',   last_serviced: '2026-07-30' },
  { id: 'e007', machine_code: 'PMP-001', machine_name: 'Hydraulic Press HP-01',     category: 'Hydraulic Presses',   serial_number: 'SN-PMP-2024-001', zone: 'Zone-1 Machining',  installation_date: '2024-01-25', status: 'OPERATIONAL',   last_serviced: '2026-08-04' },
  { id: 'e008', machine_code: 'QC-001',  machine_name: 'Quality Control Scanner',   category: 'Quality Inspection',  serial_number: 'SN-QC-2024-001',  zone: 'Zone-4 Packaging',  installation_date: '2024-06-01', status: 'OPERATIONAL',   last_serviced: '2026-08-02' },
  { id: 'e009', machine_code: 'CNC-003', machine_name: 'CNC 5-Axis Mill C3',        category: 'CNC Machining',      serial_number: 'SN-CNC-2025-003', zone: 'Zone-1 Machining',  installation_date: '2025-03-18', status: 'OPERATIONAL',   last_serviced: '2026-08-05' },
  { id: 'e010', machine_code: 'ROB-002', machine_name: 'Robot Palletiser RP-02',   category: 'Robotics & Welding',  serial_number: 'SN-ROB-2025-002', zone: 'Zone-2 Assembly',   installation_date: '2025-06-10', status: 'OPERATIONAL',   last_serviced: '2026-08-01' },
  { id: 'e011', machine_code: 'AST-003', machine_name: 'Autoclave Unit 03',         category: 'Autoclave / Curing',  serial_number: 'SN-AST-2025-003', zone: 'Zone-3 Finishing',  installation_date: '2025-05-22', status: 'DECOMMISSIONED', last_serviced: '2025-12-01' },
  { id: 'e012', machine_code: 'CMP-001', machine_name: 'Air Compressor Station 01', category: 'Compressor Systems',  serial_number: 'SN-CMP-2024-001', zone: 'Zone-1 Machining',  installation_date: '2024-07-15', status: 'OPERATIONAL',   last_serviced: '2026-08-06' },
];

const TICKET_HISTORY = {
  e003: [
    { id: 'c001', priority: 'HIGH',     description: 'Welding arm misalignment causing inconsistent bond quality.',   status: 'IN_PROGRESS', created: '2026-08-05', resolved: null, downtime: null,    tech: 'Ahmad Faizal' },
    { id: 'c005', priority: 'MEDIUM',   description: 'Robot teach pendant intermittent signal loss.',                status: 'RESOLVED',    created: '2026-07-10', resolved: '2026-07-12', downtime: 3.5,   tech: 'Siti Nurhaliza' },
  ],
  e005: [
    { id: 'c002', priority: 'CRITICAL', description: 'Pressure valve fails to maintain 2.5 bar during curing cycle.', status: 'OPEN',       created: '2026-08-07', resolved: null, downtime: null,    tech: 'Tech Team B' },
    { id: 'c006', priority: 'HIGH',     description: 'Temperature sensor drift exceeding tolerance (±2°C).',         status: 'RESOLVED',    created: '2026-06-28', resolved: '2026-06-30', downtime: 6.2,   tech: 'Tech Team B' },
  ],
  e006: [
    { id: 'c003', priority: 'MEDIUM',   description: 'Conveyor belt slipping at high speed. Tracking misalignment.', status: 'IN_PROGRESS', created: '2026-08-06', resolved: null, downtime: null,    tech: 'Siti Nurhaliza' },
  ],
  e001: [
    { id: 'c004', priority: 'LOW',      description: 'Coolant pump making intermittent noise. No impact on quality.', status: 'OPEN',       created: '2026-08-07', resolved: null, downtime: null,    tech: 'Ahmad Faizal' },
  ],
};

const ZONES = ['Zone-1 Machining', 'Zone-2 Assembly', 'Zone-3 Finishing', 'Zone-4 Packaging'];
const STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED'];
const CATEGORIES = ['CNC Machining', 'Robotics & Welding', 'Autoclave / Curing', 'Conveyor Systems', 'Hydraulic Presses', 'Quality Inspection', 'Compressor Systems'];

// Map API response (location_zone, UUID id) to UI format (zone, short id)
function mapApiToUI(item) {
  return {
    ...item,
    zone: item.location_zone || item.zone,
    id: item.id,
  };
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTS
// ---------------------------------------------------------------------------

function StatusBadge({ status }) {
  const map = {
    OPERATIONAL:   'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
    MAINTENANCE:   'bg-amber-900/30 text-amber-400 border border-amber-700/40',
    DOWN:          'bg-rose-900/40 text-rose-400 border border-rose-700/50 animate-pulse',
    DECOMMISSIONED:'bg-slate-700/50 text-slate-400 border border-slate-600/40',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || ''}`}>
      {status}
    </span>
  );
}

function TicketStatusBadge({ status }) {
  const map = {
    OPEN:         'bg-rose-900/30 text-rose-400 border border-rose-700/40',
    IN_PROGRESS:  'bg-amber-900/30 text-amber-400 border border-amber-700/40',
    RESOLVED:     'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || ''}`}>
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
// REGISTER ASSET MODAL
// ---------------------------------------------------------------------------

function RegisterModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    machine_code: '',
    machine_name: '',
    category: '',
    serial_number: '',
    location_zone: '',
    installation_date: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.machine_code.trim()) errs.machine_code = 'Asset code is required.';
    if (!form.machine_name.trim()) errs.machine_name = 'Machine name is required.';
    if (!form.location_zone) errs.location_zone = 'Select a zone.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onCreate({
      id: `e${Date.now()}`,
      ...form,
      zone: form.location_zone,
      status: 'OPERATIONAL',
      last_serviced: null,
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-accent-blue" />
            <h3 className="text-lg font-semibold text-text-primary">Register New Asset</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Machine Code */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Asset Code *</label>
            <input
              className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.machine_code ? 'border-accent-red' : 'border-surface-border'}`}
              placeholder="e.g. CNC-004"
              value={form.machine_code}
              onChange={(e) => handleChange('machine_code', e.target.value.toUpperCase())}
            />
            {errors.machine_code && <p className="text-accent-red text-xs mt-1">{errors.machine_code}</p>}
          </div>

          {/* Serial Number */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Serial Number</label>
            <input
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              placeholder="e.g. SN-CNC-2026-001"
              value={form.serial_number}
              onChange={(e) => handleChange('serial_number', e.target.value)}
            />
          </div>

          {/* Machine Name */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Machine Name *</label>
            <input
              className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.machine_name ? 'border-accent-red' : 'border-surface-border'}`}
              placeholder="e.g. CNC 5-Axis Precision Mill"
              value={form.machine_name}
              onChange={(e) => handleChange('machine_name', e.target.value)}
            />
            {errors.machine_name && <p className="text-accent-red text-xs mt-1">{errors.machine_name}</p>}
          </div>

          {/* Category */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Location Zone */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Zone / Location *</label>
            <select
              className={`w-full bg-surface-elevated border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 ${errors.location_zone ? 'border-accent-red' : 'border-surface-border'}`}
              value={form.location_zone}
              onChange={(e) => handleChange('location_zone', e.target.value)}
            >
              <option value="">Select zone</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
            {errors.location_zone && <p className="text-accent-red text-xs mt-1">{errors.location_zone}</p>}
          </div>

          {/* Installation Date */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Installation Date</label>
            <div className="relative">
              <input
                type="date"
                className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 [color-scheme:dark] appearance-none date-input-dark"
                value={form.installation_date}
                onChange={(e) => handleChange('installation_date', e.target.value)}
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-surface-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Register Asset
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}


// ---------------------------------------------------------------------------
// SLIDE-OVER DETAIL DRAWER
// ---------------------------------------------------------------------------

function DetailDrawer({ equipment, onClose }) {
  const tickets = TICKET_HISTORY[equipment.id] || [];

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 right-0 z-[110] h-screen w-full sm:max-w-lg bg-surface-card border-l border-surface-border shadow-2xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-5 bg-surface-card border-b border-surface-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-semibold text-text-primary">{equipment.machine_name}</h3>
              <p className="text-xs text-accent-blue font-mono">{equipment.machine_code}</p>
            </div>
          </div>
          <StatusBadge status={equipment.status} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Asset Metadata */}
          <div className="bg-surface-elevated border border-surface-border rounded-xl p-4">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Asset Information</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted text-xs">Serial Number</p>
                <p className="text-text-primary font-medium">{equipment.serial_number || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Category</p>
                <p className="text-text-primary font-medium">{equipment.category || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Zone / Location</p>
                <p className="text-text-primary font-medium">{equipment.zone}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Installed Date</p>
                <p className="text-text-primary font-medium">{equipment.installation_date || '—'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Last Serviced</p>
                <p className="text-text-primary font-medium">{equipment.last_serviced || 'No records'}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Total Tickets</p>
                <p className="text-text-primary font-medium">{tickets.length}</p>
              </div>
            </div>
          </div>

          {/* Defect Ticket History */}
          <div>
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Defect Ticket History</h4>
            {tickets.length === 0 ? (
              <div className="bg-surface-elevated border border-surface-border rounded-xl p-6 text-center">
                <PackageOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">No defect tickets found for this asset.</p>
              </div>
            ) : (
              <div className="bg-surface-elevated border border-surface-border rounded-xl overflow-x-auto">
                <table className="min-w-[560px] w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a1d23] text-text-muted uppercase">
                      <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Ticket ID</th>
                      <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Priority</th>
                      <th className="text-left px-3 py-2 font-semibold">Issue</th>
                      <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Status</th>
                      <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">Tech</th>
                      <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">Downtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {tickets.map((t) => (
                      <tr key={t.id} className="hover:bg-surface-elevated/50 transition-colors">
                        <td className="px-3 py-2.5 font-mono text-accent-blue whitespace-nowrap">{t.id.toUpperCase()}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap"><PriorityBadge priority={t.priority} /></td>
                        <td className="px-3 py-2.5 text-text-secondary min-w-[200px] whitespace-normal break-words" title={t.description}>{t.description}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap"><TicketStatusBadge status={t.status} /></td>
                        <td className="px-3 py-2.5 text-text-secondary whitespace-nowrap">{t.tech}</td>
                        <td className="px-3 py-2.5 text-right text-text-primary font-mono whitespace-nowrap">
                          {t.downtime !== null ? `${t.downtime}h` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simple slide-in animation via style tag */}
      <style jsx>{`
        .animate-slide-in {
          animation: slideInRight 0.25s ease-out;
        }
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
// EDIT ASSET MODAL (portal-based)
// ---------------------------------------------------------------------------

function EditAssetModal({ editEquip, editForm, setEditForm, onSave, onDecommission, onClose }) {
  const [confirmDecommission, setConfirmDecommission] = useState(false);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-surface-card border border-surface-border rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-text-primary">Edit Asset</h3>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-text-muted mb-4">
          Editing <span className="text-accent-blue font-mono">{editEquip.machine_code}</span>
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Asset Code</label>
            <input
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.machine_code || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, machine_code: e.target.value }))}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Serial Number</label>
            <input
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.serial_number || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, serial_number: e.target.value }))}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-text-secondary mb-1">Machine Name</label>
            <input
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.machine_name || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, machine_name: e.target.value }))}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.category || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Zone</label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.zone || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, zone: e.target.value }))}
            >
              <option value="">Select zone</option>
              {ZONES.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Status</label>
            <select
              className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              value={editForm.status || ''}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-between mt-6 pt-4 border-t border-surface-border">
          <button
            onClick={() => setConfirmDecommission(true)}
            className="px-4 py-2 text-sm text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={editEquip.status === 'DECOMMISSIONED'}
          >
            Decommission
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button onClick={onSave} className="btn-primary">
              Save Changes
            </button>
          </div>
        </div>

        {/* Decommission confirmation overlay */}
        {confirmDecommission && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 rounded-2xl">
            <div className="bg-surface-elevated border border-surface-border rounded-xl p-5 mx-6 shadow-2xl text-center">
              <AlertOctagon className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-text-primary mb-1">Decommission Asset?</h4>
              <p className="text-xs text-text-secondary mb-4 max-w-xs">
                This will mark <span className="text-accent-blue font-mono">{editEquip.machine_code}</span> as <span className="text-rose-400">DECOMMISSIONED</span>. Ticket history will be preserved but the asset will no longer appear in active lists.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setConfirmDecommission(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onDecommission}
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors"
                >
                  Confirm Decommission
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// MAIN EQUIPMENT REGISTRY PAGE
// ---------------------------------------------------------------------------

export default function EquipmentRegistryPage() {
  const [equipment, setEquipment] = useState(INITIAL_EQUIPMENT);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on first client mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('equip-maint-equipment');
      if (saved) {
        setEquipment(JSON.parse(saved));
      }
    } catch { /* ignore corrupt data */ }
    setHydrated(true);
  }, []);

  // Fetch from API on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function fetchEquipment() {
      try {
        const res = await api.getEquipment({ limit: 100 });
        const mapped = (res.data || res).map(mapApiToUI);
        if (!cancelled) {
          setEquipment(mapped);
          localStorage.setItem('equip-maint-equipment', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('API unavailable, using local data:', err.message);
        if (!cancelled) setApiError('Backend unavailable — using cached data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchEquipment();
    return () => { cancelled = true; };
  }, []);

  // Sync to localStorage on every local change (only after initial hydration)
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem('equip-maint-equipment', JSON.stringify(equipment));
    }
  }, [equipment, hydrated]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modals
  const [showRegister, setShowRegister] = useState(false);
  const [drawerEquip, setDrawerEquip] = useState(null);
  const [editEquip, setEditEquip] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Filtered data
  const filteredEquipment = useMemo(() => {
    return equipment.filter((eq) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !eq.machine_code.toLowerCase().includes(q) &&
          !eq.machine_name.toLowerCase().includes(q) &&
          !(eq.serial_number && eq.serial_number.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (filterZone && eq.zone !== filterZone) return false;
      if (filterStatus && eq.status !== filterStatus) return false;
      if (filterCategory && eq.category !== filterCategory) return false;
      return true;
    });
  }, [equipment, searchQuery, filterZone, filterStatus, filterCategory]);

  // Quick stats
  const stats = useMemo(() => {
    return {
      total: filteredEquipment.length,
      operational: filteredEquipment.filter((e) => e.status === 'OPERATIONAL').length,
      down: filteredEquipment.filter((e) => e.status === 'DOWN').length,
      maintenance: filteredEquipment.filter((e) => e.status === 'MAINTENANCE').length,
    };
  }, [filteredEquipment]);

  const handleCreate = useCallback(async (newEquip) => {
    // Optimistic UI update
    setEquipment((prev) => [newEquip, ...prev]);

    try {
      await api.createEquipment({
        machine_code: newEquip.machine_code,
        machine_name: newEquip.machine_name,
        category: newEquip.category || null,
        serial_number: newEquip.serial_number || null,
        location_zone: newEquip.location_zone,
        installation_date: newEquip.installation_date || null,
      });
    } catch (err) {
      console.error('Failed to create equipment on server:', err.message);
    }
  }, []);

  const handleEditSave = useCallback(async () => {
    // Optimistic UI update
    setEquipment((prev) =>
      prev.map((e) => (e.id === editEquip.id ? { ...editForm } : e))
    );
    setEditEquip(null);
    setEditForm({});

    try {
      await api.updateEquipment(editEquip.id, {
        machine_code: editForm.machine_code,
        machine_name: editForm.machine_name,
        category: editForm.category || null,
        serial_number: editForm.serial_number || null,
        location_zone: editForm.zone,
        status: editForm.status,
      });
    } catch (err) {
      console.error('Failed to update equipment on server:', err.message);
    }
  }, [editEquip, editForm]);

  const handleEditOpen = useCallback((eq) => {
    setEditEquip(eq);
    setEditForm({ ...eq });
  }, []);

  const handleDecommission = useCallback(async (eq) => {
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === eq.id ? { ...e, status: 'DECOMMISSIONED' } : e
      )
    );
    setDrawerEquip(null);

    try {
      await api.deleteEquipment(eq.id);
    } catch (err) {
      console.error('Failed to decommission on server:', err.message);
    }
  }, []);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterZone('');
    setFilterStatus('');
    setFilterCategory('');
  };

  const hasActiveFilters = searchQuery || filterZone || filterStatus || filterCategory;

  return (
    <div className="space-y-5">
      {/* API status */}
      {apiError && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-xs">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          {apiError} Data is saved locally and will sync when the backend is available.
        </div>
      )}
      {loading && (
        <div className="text-text-muted text-xs py-1">Loading equipment data...</div>
      )}

      {/* ===== QUICK STATS BAR ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-blue-900/30"><Wrench className="w-5 h-5 text-accent-blue shrink-0" /></span>
          <div className="min-w-0">
            <p className="text-xs text-text-muted whitespace-nowrap">Total Assets</p>
            <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-emerald-900/30"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /></span>
          <div className="min-w-0">
            <p className="text-xs text-text-muted whitespace-nowrap">Operational</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.operational}</p>
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-rose-900/30"><AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" /></span>
          <div className="min-w-0">
            <p className="text-xs text-text-muted whitespace-nowrap">Down / Faulty</p>
            <p className="text-2xl font-bold text-rose-400">{stats.down}</p>
          </div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="p-2.5 rounded-lg bg-amber-900/30"><Clock className="w-5 h-5 text-amber-400 shrink-0" /></span>
          <div className="min-w-0">
            <p className="text-xs text-text-muted whitespace-nowrap">In Maintenance</p>
            <p className="text-2xl font-bold text-amber-400">{stats.maintenance}</p>
          </div>
        </div>
      </div>

      {/* ===== TOOLBAR FILTER BAR ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-4">
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full lg:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              placeholder="Search by code, name, or serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Zone filter */}
          <select
            className="bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-full lg:w-auto"
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
          >
            <option value="">All Zones</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-full lg:w-auto"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            className="bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 w-full lg:w-auto"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-accent-blue hover:text-blue-400 transition-colors whitespace-nowrap"
            >
              Clear filters
            </button>
          )}

          {/* Register button */}
          <button
            onClick={() => setShowRegister(true)}
            className="btn-primary flex items-center gap-1.5 ml-auto whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Register New Asset
          </button>
        </div>
      </div>

      {/* ===== MASTER EQUIPMENT TABLE ===== */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            Equipment Master List
          </h2>
          <span className="text-xs text-text-muted">
            {filteredEquipment.length} of {equipment.length} assets
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Code</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Name</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden md:table-cell">Category</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden sm:table-cell">Zone</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-3 lg:px-5 py-3 font-semibold hidden lg:table-cell">Serviced</th>
                <th className="text-center px-3 lg:px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredEquipment.map((eq) => (
                <tr
                  key={eq.id}
                  className={`hover:bg-surface-elevated/50 transition-colors cursor-pointer ${
                    eq.status === 'DOWN' ? 'bg-rose-950/10' : ''
                  } ${eq.status === 'DECOMMISSIONED' ? 'opacity-60' : ''}`}
                  onClick={() => setDrawerEquip(eq)}
                >
                  <td className="px-3 lg:px-5 py-3.5 font-mono text-xs text-accent-blue">{eq.machine_code}</td>
                  <td className="px-3 lg:px-5 py-3.5 font-medium text-text-primary text-xs lg:text-sm">{eq.machine_name}</td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary hidden md:table-cell">{eq.category || '—'}</td>
                  <td className="px-3 lg:px-5 py-3.5 hidden sm:table-cell">
                    <span className="flex items-center gap-1.5 text-text-secondary">
                      <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      {eq.zone}
                    </span>
                  </td>
                  <td className="px-3 lg:px-5 py-3.5">
                    <StatusBadge status={eq.status} />
                  </td>
                  <td className="px-3 lg:px-5 py-3.5 text-text-secondary hidden lg:table-cell">
                    {eq.last_serviced || 'No records'}
                  </td>
                  <td className="px-3 lg:px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDrawerEquip(eq)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                        title="View History"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditOpen(eq)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                        title="Edit Asset"
                        disabled={eq.status === 'DECOMMISSIONED'}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEquipment.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-text-muted py-16">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No equipment matches your filters.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-accent-blue text-xs mt-1 hover:underline"
                      >
                        Clear all filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        <div className="px-5 py-3 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
          <span>Showing {filteredEquipment.length} results</span>
        </div>
      </div>

      {/* ===== REGISTER MODAL ===== */}
      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)} onCreate={handleCreate} />
      )}

      {/* ===== EDIT MODAL ===== */}
      {editEquip && (
        <EditAssetModal
          editEquip={editEquip}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleEditSave}
          onDecommission={() => handleDecommission(editEquip)}
          onClose={() => setEditEquip(null)}
        />
      )}

      {/* ===== SLIDE-OVER DETAIL DRAWER ===== */}
      {drawerEquip && (
        <DetailDrawer equipment={drawerEquip} onClose={() => setDrawerEquip(null)} />
      )}
    </div>
  );
}
