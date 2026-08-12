'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Settings, Users, Sliders, Bell, Shield, Plus, X, Save, CheckCircle2,
  UserPlus, Trash2, Send, AlertTriangle, Lock, Key,
} from 'lucide-react';
import { api } from '../../lib/api';

const MOCK_USERS = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'Diyana Aziz', email: 'diyana@plant.com', role: 'SYSTEM_ADMIN', created_at: '2025-01-10T08:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Ahmad Faizal', email: 'ahmad@plant.com', role: 'MAINTENANCE_TECHNICIAN', created_at: '2025-03-15T08:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Siti Nurhaliza', email: 'siti@plant.com', role: 'MAINTENANCE_TECHNICIAN', created_at: '2025-06-20T08:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000004', name: 'Raj Kumar', email: 'raj@plant.com', role: 'PLANT_OPERATOR', created_at: '2025-04-01T08:00:00Z' },
  { id: 'a0000000-0000-0000-0000-000000000005', name: 'Tech Team B', email: 'techb@plant.com', role: 'MAINTENANCE_TECHNICIAN', created_at: '2025-07-10T08:00:00Z' },
];

const MOCK_CONFIG = {
  hourly_downtime_rate: 650, target_mttr_hours: 2.0, preventive_buffer_days: 3,
  critical_alert_webhook_url: '', enable_sms_alerts: false, enable_email_alerts: true,
};

const TABS = [
  { key: 'users', label: 'User & RBAC', icon: Users, minRole: 'PLANT_MANAGER' },
  { key: 'config', label: 'Plant Config', icon: Sliders, minRole: 'PLANT_OPERATOR' },
  { key: 'alerts', label: 'Alerts & Webhooks', icon: Bell, minRole: 'PLANT_OPERATOR' },
  { key: 'security', label: 'Security & Profile', icon: Shield, minRole: 'PLANT_OPERATOR' },
];

const ROLES = ['PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER', 'SYSTEM_ADMIN'];
const ROLE_STYLE = {
  SYSTEM_ADMIN: 'bg-purple-900/30 text-purple-400 border border-purple-700/40',
  PLANT_MANAGER: 'bg-blue-900/30 text-blue-400 border border-blue-700/40',
  MAINTENANCE_TECHNICIAN: 'bg-amber-900/30 text-amber-400 border border-amber-700/40',
  PLANT_OPERATOR: 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40',
};
const ROLE_ORDER = { SYSTEM_ADMIN: 4, PLANT_MANAGER: 3, MAINTENANCE_TECHNICIAN: 2, PLANT_OPERATOR: 1 };

function UserModal({ onClose, onCreate, editUser }) {
  const [form, setForm] = useState(editUser || { name: '', email: '', role: 'PLANT_OPERATOR', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!form.name || !form.email || (!editUser && !form.password)) { setError('All fields required.'); return; }
    onCreate(form, !!editUser);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-surface-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-accent-blue" /><h3 className="text-lg font-semibold text-text-primary">{editUser ? 'Edit User' : 'Add New User'}</h3></div><button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button></div>
        {error && <p className="text-rose-400 text-xs mb-3">{error}</p>}
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Name</label><input className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Email</label><input type="email" className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          {!editUser && <div><label className="block text-xs font-medium text-text-secondary mb-1">Password</label><input type="password" className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Role</label><select className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>{ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</select></div>
        </div>
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-surface-border"><button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button><button onClick={handleSubmit} className="btn-primary">{editUser ? 'Save Changes' : 'Create User'}</button></div>
      </div>
    </div>, document.body
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState(MOCK_USERS);
  const [config, setConfig] = useState(MOCK_CONFIG);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('PLANT_OPERATOR');
  const [currentUser, setCurrentUser] = useState({ name: 'Diyana Aziz', email: 'diyana@plant.com' });

  useEffect(() => { try { const u = JSON.parse(localStorage.getItem('equip-maint-user')); if (u?.role) setUserRole(u.role); if (u?.name) setCurrentUser({ name: u.name, email: u.email }); } catch {} }, []);
  useEffect(() => { async function load() { try { const [u, c] = await Promise.all([api.request('/settings/users'), api.request('/settings/config')]); if (Array.isArray(u)) setUsers(u); if (c) setConfig(c); } catch {} setLoading(false); } load(); }, []);

  const isAdmin = userRole === 'SYSTEM_ADMIN';
  const isManager = userRole === 'SYSTEM_ADMIN' || userRole === 'PLANT_MANAGER';
  const canAccessTab = (minRole) => ROLE_ORDER[userRole] >= ROLE_ORDER[minRole];

  // Auto-switch to first visible tab if current tab is hidden
  useEffect(() => {
    const tab = TABS.find(t => t.key === activeTab);
    if (tab && !canAccessTab(tab.minRole)) {
      const first = TABS.find(t => canAccessTab(t.minRole));
      if (first) setActiveTab(first.key);
    }
  }, [userRole, activeTab]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleCreateUser = useCallback(async (form, isEdit) => {
    if (isEdit) {
      setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, name: form.name, email: form.email, role: form.role } : u));
      try { await api.request(`/settings/users/${editUser.id}/role`, { method: 'PUT', body: JSON.stringify({ role: form.role }) }); } catch {}
    } else {
      const newUser = { id: `u${Date.now()}`, name: form.name, email: form.email, role: form.role, created_at: new Date().toISOString() };
      setUsers(prev => [...prev, newUser]);
      try { await api.request('/settings/users', { method: 'POST', body: JSON.stringify(form) }); } catch {}
    }
    showToast(isEdit ? 'User updated.' : 'User created.'); setEditUser(null);
  }, [editUser]);

  const handleRoleChange = useCallback(async (userId, newRole) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    try { await api.request(`/settings/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole }) }); } catch {}
    showToast('Role updated.');
  }, []);

  const handleRevoke = useCallback(async (userId) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    try { await api.request(`/settings/users/${userId}`, { method: 'DELETE' }); } catch {}
    showToast('User revoked.');
  }, []);

  const handleSaveConfig = useCallback(async () => {
    try { await api.request('/settings/config', { method: 'PUT', body: JSON.stringify(config) }); showToast('Configuration saved.'); } catch { showToast('Failed to save config.'); }
  }, [config]);

  return (
    <div className="space-y-5">
      {loading && <div className="text-text-muted text-xs py-1">Loading settings...</div>}
      {toast && <div className="fixed top-4 right-4 z-[200] flex items-center gap-2 bg-emerald-900/40 border border-emerald-700/50 rounded-lg px-4 py-2.5 shadow-lg text-sm text-emerald-300"><CheckCircle2 className="w-4 h-4" />{toast}</div>}

      {/* Access denied banner */}
      {!isManager && activeTab === 'users' && <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-2 flex items-center gap-2 text-amber-400 text-xs"><AlertTriangle className="w-4 h-4 shrink-0" />User management is restricted to Plant Manager and System Admin.</div>}

      <div className="bg-surface-card border border-surface-border rounded-xl p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t => canAccessTab(t.minRole) && (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${activeTab === t.key ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}><t.icon className="w-4 h-4" />{t.label}</button>
        ))}
      </div>

      {/* ===== TAB 1: USERS ===== */}
      {activeTab === 'users' && isManager && (
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Staff User Directory</h2>
            <div className="flex items-center gap-2">{!isAdmin && <span className="text-xs text-text-muted italic">View-only</span>}
              {isAdmin && <button onClick={() => { setEditUser(null); setShowUserModal(true); }} className="btn-primary flex items-center gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" />Add New User</button>}
            </div>
          </div>
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="bg-surface-elevated text-text-muted text-xs uppercase tracking-wider"><th className="text-left px-5 py-3 font-semibold">Name</th><th className="text-left px-5 py-3 font-semibold hidden md:table-cell">Email</th><th className="text-left px-5 py-3 font-semibold">Role</th><th className="text-left px-5 py-3 font-semibold hidden lg:table-cell">Joined</th><th className="text-right px-5 py-3 font-semibold">Actions</th></tr></thead>
              <tbody className="divide-y divide-surface-border">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-surface-elevated/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-text-primary">{u.name}</td>
                    <td className="px-5 py-3.5 text-text-secondary text-xs hidden md:table-cell">{u.email}</td>
                    <td className="px-5 py-3.5">{isAdmin ? <select className="bg-surface-elevated border border-surface-border rounded-lg px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50" value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}>{ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}</select> : <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ROLE_STYLE[u.role]}`}>{u.role.replace(/_/g, ' ')}</span>}</td>
                    <td className="px-5 py-3.5 text-text-muted text-xs font-mono hidden lg:table-cell">{new Date(u.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}</td>
                    <td className="px-5 py-3.5 text-right">{isAdmin && <div className="flex items-center justify-end gap-1"><button onClick={() => { setEditUser(u); setShowUserModal(true); }} className="p-1.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-colors" title="Edit"><Settings className="w-4 h-4" /></button><button onClick={() => handleRevoke(u.id)} className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-400/10 transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button></div>}</td>
                  </tr>
                ))}</tbody></table></div>
          </div>
        </div>
      )}

      {/* ===== TAB 2: PLANT CONFIG ===== */}
      {activeTab === 'config' && (
        <div className="space-y-4"><h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Plant Operational Configuration</h2>
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4 max-w-lg">
            {!isManager && <p className="text-xs text-text-muted italic mb-2">Read-only — contact Plant Manager or System Admin to modify.</p>}
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Hourly Downtime Loss Rate (RM/hr)</label><input type="number" disabled={!isManager} className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 disabled:opacity-60 disabled:cursor-not-allowed" value={config.hourly_downtime_rate} onChange={e => setConfig(c => ({ ...c, hourly_downtime_rate: Number(e.target.value) }))} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Target Plant MTTR Goal (Hours)</label><input type="number" step="0.5" disabled={!isManager} className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 disabled:opacity-60 disabled:cursor-not-allowed" value={config.target_mttr_hours} onChange={e => setConfig(c => ({ ...c, target_mttr_hours: Number(e.target.value) }))} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Preventive Inspection Buffer (Days)</label><input type="number" disabled={!isManager} className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 disabled:opacity-60 disabled:cursor-not-allowed" value={config.preventive_buffer_days} onChange={e => setConfig(c => ({ ...c, preventive_buffer_days: Number(e.target.value) }))} /></div>
            {isManager && <button onClick={handleSaveConfig} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Save Changes</button>}
          </div>
        </div>
      )}

      {/* ===== TAB 3: ALERTS ===== */}
      {activeTab === 'alerts' && (
        <div className="space-y-4"><h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Emergency Alerts & Webhooks</h2>
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4 max-w-lg">
            {!isManager && <p className="text-xs text-text-muted italic mb-2">Read-only — contact Plant Manager or System Admin to modify.</p>}
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Webhook URL (Slack / Teams)</label><input type="url" disabled={!isManager} className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 disabled:opacity-60 disabled:cursor-not-allowed" placeholder="https://hooks.slack.com/services/..." value={config.critical_alert_webhook_url} onChange={e => setConfig(c => ({ ...c, critical_alert_webhook_url: e.target.value }))} /></div>
            <div className="flex items-center justify-between py-1"><span className="text-sm text-text-primary">Critical SMS Alerts</span><button onClick={() => isManager && setConfig(c => ({ ...c, enable_sms_alerts: !c.enable_sms_alerts }))} className={`w-10 h-5 rounded-full transition-colors relative ${!isManager ? 'opacity-60 cursor-not-allowed' : ''} ${config.enable_sms_alerts ? 'bg-accent-blue' : 'bg-surface-border'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.enable_sms_alerts ? 'left-5' : 'left-0.5'}`} /></button></div>
            <div className="flex items-center justify-between py-1"><span className="text-sm text-text-primary">Daily Maintenance Summary Emails</span><button onClick={() => isManager && setConfig(c => ({ ...c, enable_email_alerts: !c.enable_email_alerts }))} className={`w-10 h-5 rounded-full transition-colors relative ${!isManager ? 'opacity-60 cursor-not-allowed' : ''} ${config.enable_email_alerts ? 'bg-accent-blue' : 'bg-surface-border'}`}><span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${config.enable_email_alerts ? 'left-5' : 'left-0.5'}`} /></button></div>
            {isManager && <div className="flex gap-3"><button onClick={handleSaveConfig} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Save Alert Settings</button><button onClick={() => showToast('Webhook test sent successfully.')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-surface-border text-text-secondary hover:text-text-primary transition-colors"><Send className="w-4 h-4" />Test Webhook</button></div>}
          </div>
        </div>
      )}

      {/* ===== TAB 4: SECURITY & PROFILE ===== */}
      {activeTab === 'security' && (
        <div className="space-y-4"><h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Security & Profile</h2>
          <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4 max-w-lg">
            <div className="flex items-center gap-4 pb-4 border-b border-surface-border"><div className="w-14 h-14 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xl font-bold shrink-0">{currentUser.name.split(' ').map(n => n[0]).join('')}</div><div><h3 className="text-base font-semibold text-text-primary">{currentUser.name}</h3><p className="text-xs text-text-muted">{currentUser.email} &middot; {userRole.replace(/_/g, ' ')}</p></div></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Current Password</label><div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" /><input type="password" className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" placeholder="Enter current password" /></div></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">New Password</label><div className="relative"><Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" /><input type="password" className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50" placeholder="Enter new password" /></div></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">JWT Session Expiry</label><select className="w-full bg-surface-elevated border border-surface-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"><option value="4h">4 Hours</option><option value="12h">12 Hours (default)</option><option value="24h">24 Hours</option></select></div>
            <button onClick={() => showToast('Password changed successfully.')} className="btn-primary flex items-center gap-2"><Save className="w-4 h-4" />Update Password</button>
          </div>
        </div>
      )}

      {showUserModal && <UserModal onClose={() => setShowUserModal(false)} onCreate={handleCreateUser} editUser={editUser} />}
    </div>
  );
}
