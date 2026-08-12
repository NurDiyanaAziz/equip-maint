# EQUIP-MAINT — Full System Architecture & Interview Guide

Shop Floor Equipment Maintenance & Defect Tracker
Enterprise-grade manufacturing web system

---

## TABLE OF CONTENTS

1. [System Architecture (3-Tier)](#1-system-architecture-3-tier)
2. [Database Schema](#2-database-schema-5-tables)
3. [Authentication & RBAC Flow](#3-authentication--rbac-flow)
4. [Module Walkthroughs](#4-module-by-module-walkthrough)
   - [Dashboard](#module-1-dashboard-dashboard)
   - [Equipment Registry](#module-2-equipment-registry-equipment)
   - [Defect Tickets](#module-3-defect-tickets-tickets)
   - [Preventive Maintenance](#module-4-preventive-maintenance-preventive)
   - [Reports & Analytics](#module-5-reports--analytics-reports)
   - [Settings & Administration](#module-6-settings--administration-settings)
5. [Key Architectural Patterns](#5-key-architectural-patterns)
6. [Interview Sample Q&A](#6-interview-sample-qa)
7. [Tech Stack Summary](#7-tech-stack-summary)

---

## 1. SYSTEM ARCHITECTURE (3-Tier)

```
[Browser / Next.js]  ──fetch──>  [Express API :4000]  ──SQL──>  [Supabase PostgreSQL]
     Frontend                         Backend                          Database
   React + Tailwind               Node + Express                PostgreSQL (hosted)
```

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | Next.js 14 App Router, React 18, Tailwind CSS (dark theme), Recharts, Lucide Icons | Renders dashboard, handles user interactions, calls API, localStorage caching |
| **Backend** | Express.js with `pg` pool, JWT (jsonwebtoken), Zod validation, bcrypt password hashing | RESTful API with 30+ endpoints, auth middleware, business logic, SQL transactions |
| **Database** | PostgreSQL via Supabase (SSL connection with `rejectUnauthorized: false`) | 5 normalized tables, 6 relation indexes, parameterized queries, `DATE_TRUNC`/`EXTRACT(EPOCH)` aggregations |

### Data Flow

```
User Action → Next.js Component → api.js → fetch() with JWT header
  → Express Route → Zod Validation → authenticate() middleware
  → authorize(roles) middleware → Controller → pool.query($1, $2)
  → Supabase PostgreSQL → JSON response → React state update → Re-render UI
```

---

## 2. DATABASE SCHEMA (5 Tables)

```
users ──1:N──> maintenance_tickets ──N:1──> equipment
                 │                                  │
                 │                                  └──── 1:N ───> preventive_schedules
                 │
          plant_config (singleton, id=1)
```

### Table Details

| Table | Purpose | Key Columns | Constraints |
|-------|---------|-------------|-------------|
| `users` | Staff directory with RBAC | `id UUID PK`, `name`, `email UNIQUE`, `password_hash` (bcrypt), `role`, `created_at` | `role CHECK` (4 values) |
| `equipment` | Plant machinery master data | `id UUID PK`, `machine_code UNIQUE`, `machine_name`, `category`, `serial_number`, `location_zone`, `installation_date`, `status` | `status CHECK` (OPERATIONAL, MAINTENANCE, DOWN, DECOMMISSIONED) |
| `maintenance_tickets` | Defect lifecycle tracking | `equipment_id FK`, `reported_by_user_id FK`, `assigned_technician_id FK`, `priority`, `issue_description`, `ticket_status`, `created_at`, `resolved_at`, `downtime_hours` | FK cascade on equipment delete, SET NULL on user delete |
| `preventive_schedules` | Recurring inspection tasks | `equipment_id FK`, `task_name`, `frequency_days`, `last_serviced_date`, `next_service_due`, `assigned_technician_id FK` | `frequency_days > 0` CHECK, FK cascade |
| `plant_config` | Global singleton settings | `id = 1 CHECK`, `hourly_downtime_rate` (RM/hr), `target_mttr_hours`, `preventive_buffer_days`, `critical_alert_webhook_url`, `enable_sms_alerts`, `enable_email_alerts` | `id = 1` enforced |

### Production Indexes

```sql
-- Equipment
CREATE INDEX idx_equipment_machine_code  ON equipment (machine_code);
CREATE INDEX idx_equipment_status         ON equipment (status);
CREATE INDEX idx_equipment_location_zone  ON equipment (location_zone);
CREATE INDEX idx_equipment_category       ON equipment (category);
CREATE INDEX idx_equipment_serial_number  ON equipment (serial_number);

-- Tickets
CREATE INDEX idx_tickets_equipment_id   ON maintenance_tickets (equipment_id);
CREATE INDEX idx_tickets_priority       ON maintenance_tickets (priority);
CREATE INDEX idx_tickets_ticket_status  ON maintenance_tickets (ticket_status);
CREATE INDEX idx_tickets_created_at     ON maintenance_tickets (created_at);

-- Preventive
CREATE INDEX idx_preventive_next_due      ON preventive_schedules (next_service_due);
CREATE INDEX idx_preventive_equip_id      ON preventive_schedules (equipment_id);
CREATE INDEX idx_preventive_assigned_tech ON preventive_schedules (assigned_technician_id);
```

### Seed Data Summary

| Table | Records |
|-------|---------|
| users | 5 (Diyana Aziz - SYSTEM_ADMIN, 2 technicians, 1 operator, 1 team) |
| equipment | 8 machines across 4 zones, 7 categories |
| maintenance_tickets | 12 (8 resolved with downtime, 2 IN_PROGRESS, 2 OPEN) |
| preventive_schedules | 12 recurring tasks (7d to 365d intervals) |
| plant_config | 1 (RM 650/hr, 2.0h MTTR target, 3-day buffer) |

---

## 3. AUTHENTICATION & RBAC FLOW

### Login Flow

```
1. User visits /login → enters email + password
2. POST /api/users/login
   → bcrypt.compare(password, user.password_hash)
   → jwt.sign({ id, name, email, role }, JWT_SECRET, { expiresIn: '12h' })
3. Response: { token: "eyJ...", user: { id, name, email, role } }
4. Frontend stores:
   localStorage.setItem('equip-maint-token', token)
   localStorage.setItem('equip-maint-user', JSON.stringify(user))
5. Every subsequent API call:
   headers: { Authorization: `Bearer ${token}` }
6. Express middleware:
   authenticate() → jwt.verify(token, JWT_SECRET) → req.user = decoded
   authorize('SYSTEM_ADMIN') → checks req.user.role in allowed roles
7. Layout reads user from localStorage → displays name/role/initials in header
8. Logout → clears localStorage → redirects to /login
```

### RBAC Roles (4 Levels)

| Role | Permissions |
|------|------------|
| **SYSTEM_ADMIN** | Full access — user CRUD, all config, all reports, all modules |
| **PLANT_MANAGER** | View users (read-only), edit plant config, edit alert settings, view all reports, assign/resolve tickets |
| **MAINTENANCE_TECHNICIAN** | Assign tickets, resolve tickets, complete preventive tasks, escalate defects, view equipment, view reports |
| **PLANT_OPERATOR** | Log defect tickets, view dashboard, view equipment, view own profile |

### Security Design

- **Dual-layer enforcement**: Backend JWT middleware rejects unauthorized API calls (403). Frontend hides/disables UI controls for unauthorized roles. Even if someone manipulates the DOM, the server rejects the request.
- **bcrypt**: 10 salt rounds for password hashing
- **JWT**: 12-hour expiry, signed with environment variable secret
- **SQL injection prevention**: All queries use parameterized `$1, $2` placeholders — zero string concatenation
- **Row locking**: `SELECT ... FOR UPDATE` in ticket transactions prevents race conditions

---

## 4. MODULE-BY-MODULE WALKTHROUGH

### MODULE 1: DASHBOARD (`/dashboard`)

**Purpose**: Executive overview — at-a-glance plant health monitoring

**API Calls**: `GET /api/equipment/stats`, `GET /api/equipment/preventive/upcoming`

**UI Components**:
| Component | Description |
|-----------|-------------|
| 4 KPI Cards | Total Machinery (42), Operational (38, green), Down/Faulty (4, red pulse), Avg MTTR (2.4h, blue) |
| Preventive Schedule Widget | 4 upcoming tasks this week with overdue highlighting |
| Downtime Chart (Recharts) | Multi-bar chart — monthly downtime by machine category (6-month trend) |
| Live Defect Alerts Feed | CRITICAL/HIGH/MEDIUM tickets with assigned tech, color-coded severity |
| Equipment & Tickets Table | 8 machines with status badges, Report Defect / Resolve Ticket buttons, defect report modal |

**Key Patterns**:
- Color-coded icon badges (`bg-rose-900/30`, `bg-emerald-900/30`)
- Recharts `ResponsiveContainer` with `BarChart` for mobile support
- Interactive defect reporting with modal form and optimistic state updates

**Interview talking point**: *"The dashboard aggregates equipment status from PostgreSQL and visualizes 6-month downtime trends via Recharts. The live alerts feed uses conditional styling — CRITICAL tickets get a red pulse animation — giving plant managers instant situational awareness."*

---

### MODULE 2: EQUIPMENT REGISTRY (`/equipment`)

**Purpose**: Master data management — full CRUD for all plant machinery

**Backend Endpoints**:

| Method | Route | Purpose | Access |
|--------|-------|---------|--------|
| `GET` | `/api/equipment?search=&zone=&status=&category=&page=&limit=` | Paginated, filtered, searched list | All roles |
| `GET` | `/api/equipment/:id` | Single machine + ticket history + preventive schedules | All roles |
| `POST` | `/api/equipment` | Register new asset (Zod validated) | PLANT_MANAGER, SYSTEM_ADMIN, MAINTENANCE_TECHNICIAN |
| `PUT` | `/api/equipment/:id` | Update specs, zone, status | PLANT_MANAGER, SYSTEM_ADMIN, MAINTENANCE_TECHNICIAN |
| `DELETE` | `/api/equipment/:id` | Soft-delete → `DECOMMISSIONED` | PLANT_MANAGER, SYSTEM_ADMIN |
| `GET` | `/api/equipment/stats` | KPI counts (total/operational/down/maintenance/MTTR) | All roles |
| `GET` | `/api/equipment/categories` | Distinct category list for filter dropdowns | All roles |
| `GET` | `/api/equipment/preventive/upcoming` | Tasks due within 7 days | All roles |

**Frontend Features**:
| Feature | Implementation |
|---------|---------------|
| Quick Stats Bar | 4 cards: Total Assets, Operational, Down/Faulty, In Maintenance |
| Filter Toolbar | Search input + Zone/Status/Category dropdowns + Clear filters + Register button |
| Master Table | 7 columns (responsive hiding: Category → md, Zone → sm, Serviced → lg) |
| Status Badges | Emerald (OPERATIONAL), Amber (MAINTENANCE), Rose pulse (DOWN), Slate (DECOMMISSIONED) |
| Register Modal | React Portal with Zod-style validation, equipment picker, dark date input with `[color-scheme:dark]` |
| Edit Modal | Pre-populated form, status change dropdown, Decommission button with **confirmation overlay** |
| Detail Drawer | React Portal slide-over — metadata grid + ticket history table (horizontally scrollable) |
| API Integration | API-first with localStorage fallback, optimistic UI on create/edit/decommission |

**Interview talking point**: *"The equipment registry uses optimistic UI updates — the user sees changes immediately while the API call happens in background. Soft-deletion (DECOMMISSIONED status) preserves historical ticket integrity for audit compliance. The detail drawer uses React Portal to escape the main DOM stacking context."*

---

### MODULE 3: DEFECT TICKETS (`/tickets`)

**Purpose**: Digital replacement for paper defect logs — complete repair lifecycle

**Backend — Critical SQL Transactions**:

```
CREATE TICKET (POST /api/tickets):
  BEGIN
  → INSERT INTO maintenance_tickets (..., status='OPEN')
  → UPDATE equipment SET status = 'DOWN'
  → COMMIT

RESOLVE TICKET (PATCH /api/tickets/:id/resolve):
  BEGIN
  → SELECT ... FOR UPDATE (row lock)
  → UPDATE maintenance_tickets SET
      ticket_status = 'RESOLVED',
      resolved_at = NOW(),
      downtime_hours = ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 2)
  → UPDATE equipment SET status = 'OPERATIONAL'
  → COMMIT

ASSIGN TICKET (PATCH /api/tickets/:id/assign):
  → UPDATE SET assigned_technician_id = $1, ticket_status = 'IN_PROGRESS'
  → UPDATE equipment SET status = 'MAINTENANCE' (if not already DOWN)
```

**Backend Endpoints**:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/tickets?search=&status=&priority=&equipment_id=&page=&limit=` | Filtered list with JOINs (equipment name, reporter, tech) |
| `GET` | `/api/tickets/:id` | Single ticket with equipment specs |
| `POST` | `/api/tickets` | Create ticket (transaction) |
| `PATCH` | `/api/tickets/:id/assign` | Assign tech + set IN_PROGRESS |
| `PATCH` | `/api/tickets/:id/resolve` | Resolve + compute downtime (transaction) |
| `GET` | `/api/tickets/stats` | KPI counts (open_total, critical, in_progress, resolved_today) |
| `GET` | `/api/tickets/technicians` | MAINTENANCE_TECHNICIAN list for dropdown |

**Frontend Features**:
| Feature | Implementation |
|---------|---------------|
| 4 KPI Cards | Open Tickets (blue), Critical Faults (red pulse), In-Progress (amber), Resolved Today (emerald) |
| Status Tabs | All / Open / In Progress / Resolved — segmented button bar |
| Priority Filter | CRITICAL / HIGH / MEDIUM / LOW dropdown |
| Search | By ticket ID, machine code, or issue description |
| Master Table | 9 columns (responsive: Zone → sm, Reported → md, Tech → lg, Date → xl) |
| Priority Badges | LOW=slate, MEDIUM=amber, HIGH=orange, CRITICAL=red pulse animation |
| Log Ticket Modal | React Portal — equipment picker (fetched live), priority, issue description with 10-char validation |
| Detail Drawer | React Portal — full timeline, equipment specs, assign technician form, **resolve confirmation prompt** |
| Assign Flow | Dropdown → Select Tech → Confirm Assign → status changes to IN_PROGRESS |
| Resolve Flow | Click Resolve → Confirmation: "Machine will be restored to OPERATIONAL" → Confirm → downtime finalized |

**Interview talking point**: *"The defect ticket module replaces paper logs with a transactional workflow. When a ticket resolves, SQL computes exact downtime hours entirely on the database server — no client-side clock manipulation possible. Downtime cost is calculated at RM 650/hour — reflecting operator labor, machine overhead, lost production, and potential contract penalties in Malaysian manufacturing."*

---

### MODULE 4: PREVENTIVE MAINTENANCE (`/preventive`)

**Purpose**: Scheduled inspection management to prevent unplanned breakdowns

**Dynamic Status Computation (SQL)**:
```sql
CASE
  WHEN ps.next_service_due < CURRENT_DATE THEN 'OVERDUE'
  WHEN ps.next_service_due <= CURRENT_DATE + INTERVAL '3 days' THEN 'DUE_SOON'
  ELSE 'UPCOMING'
END AS computed_status
```

**Backend Endpoints**:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/preventive?status=&search=&equipment_id=&page=&limit=` | List with JOINs + dynamic status |
| `GET` | `/api/preventive/:id` | Single schedule + equipment data |
| `POST` | `/api/preventive` | Create schedule — `next_service_due = last_serviced + frequency_days * INTERVAL '1 day'` |
| `PATCH` | `/api/preventive/:id/complete` | Roll dates: `last_serviced = TODAY, next = TODAY + frequency` |
| `POST` | `/api/preventive/:id/escalate-defect` | **Transaction**: complete task + INSERT maintenance_ticket + SET equipment DOWN |
| `GET` | `/api/preventive/stats` | Total, overdue, due_this_week, completion_rate |

**Frontend Features**:
| Feature | Implementation |
|---------|---------------|
| 4 KPI Cards | Total Schedules, Overdue (red pulse), Due This Week (amber), On-Time Completion % |
| Status Tabs | All / Overdue / Due Soon / Upcoming |
| Search | By task name or equipment code |
| Master Table | 9 columns (responsive: Equipment → md, Zone → sm, Freq/Last/Tech → lg) |
| Status Badges | OVERDUE=rose pulse, DUE_SOON=amber, UPCOMING=emerald |
| Schedule Modal | React Portal — equipment picker, task name, interval dropdown (7d-365d), dark date picker, technician assignment |
| Detail Drawer | React Portal — equipment specs, frequency, dates, "Complete Task" with **confirmation + rollover date preview**, "Log Defect" escalation form |

**Complete Task Flow**:
```
Click "Complete Task" → Confirmation shows next due date preview
  → Confirm → last_serviced = TODAY, next_service_due rolls forward
```

**Escalate Defect Flow**:
```
Click "Log Defect" → Describe fault (min 10 chars)
  → Escalate → Transaction: task completed + ticket OPEN + equipment DOWN
```

**Interview talking point**: *"Preventive maintenance is the proactive half of the system. The dynamic computed_status in SQL means the dashboard always reflects real-time overdue tasks without any cron jobs. The escalate-defect transaction creates an unbroken audit trail — when a routine inspection finds a fault, it becomes a tracked defect ticket automatically, with zero data entry duplication."*

---

### MODULE 5: REPORTS & ANALYTICS (`/reports`)

**Purpose**: Executive analytics with live PostgreSQL data + CSV export for Excel

**Backend — 6 Aggregation Endpoints**:

| Method | Route | SQL Technique |
|--------|-------|---------------|
| `GET` | `/api/reports/kpis?range=30d` | `SUM(downtime_hours) * 650` for cost, previous period comparison, `AVG(downtime_hours)` for MTTR |
| `GET` | `/api/reports/downtime-by-category?range=30d` | `GROUP BY e.category`, `SUM(downtime_hours)`, `COUNT(mt.id)` |
| `GET` | `/api/reports/downtime-trends?range=1y` | `DATE_TRUNC('month', DATE(created_at))` — monthly/weekly aggregation |
| `GET` | `/api/reports/technician-performance?range=30d` | `AVG(mt.downtime_hours)` per tech, filtered to RESOLVED tickets |
| `GET` | `/api/reports/priority-distribution?range=30d` | `GROUP BY priority`, `COUNT(*)` |
| `GET` | `/api/reports/worst-offenders?range=30d&limit=0` | All equipment ranked by downtime; `limit=0` = no limit (full CSV export) |

**Frontend — 4 Recharts Visualizations**:

| Chart | Type | Data | Visual |
|-------|------|------|--------|
| Downtime by Category | Horizontal Bar | `{ category, total_downtime_hours }` from API | Blue bars, sorted descending |
| Monthly Trend | Line Chart | `{ period, downtime_hours }` time-series | Solid blue line + red dashed target line (5h) |
| Priority Distribution | Donut Chart | `{ priority, count }` from API | Red=CRITICAL, Orange=HIGH, Amber=MEDIUM, Blue=LOW |
| Technician MTTR | Horizontal Bar | `{ technician_name, avg_mttr_hours }` from API | Emerald bars |

**Additional Features**:
| Feature | Implementation |
|---------|---------------|
| Date Range Selector | 7d / 30d / 90d / Year — toggles ALL charts and tables simultaneously |
| 4 KPI Cards | Downtime Cost (RM, with % change vs previous period), Avg MTTR, Unplanned Downtime, PM Compliance |
| Worst Offenders Table | Top 5 in UI with Health Risk Rating (CRITICAL/HIGH/MODERATE/LOW) |
| CSV Export (Toolbar) | Full dataset of ALL equipment → Blob download via `URL.createObjectURL` |
| CSV Export (Table) | Same full dataset for offline Excel analysis |
| Dark Tooltips | Recharts custom tooltip: `bg-slate-900`, `border-slate-800`, white text |
| SSR Safety | `mounted` state flag — Recharts renders only after client hydration |
| API Fallback | Empty API data falls back to rich mock data for demo/offline |

**Interview talking point**: *"The reports module transforms raw ticket data into boardroom-ready analytics. SQL DATE_TRUNC aggregates monthly trends server-side. The RM 650/hr cost multiplier is stored in plant_config — changing it instantly recalculates all financial metrics. CSV export operates client-side via Blob API — no server roundtrip needed for the file download. The frontend fetches all equipment data (limit=0) for the CSV file while displaying only top 5 in the UI for readability."*

---

### MODULE 6: SETTINGS & ADMINISTRATION (`/settings`)

**Purpose**: Role-based user management, plant configuration, security

**Backend Endpoints**:

| Method | Route | Access | Purpose |
|--------|-------|--------|---------|
| `GET` | `/api/settings/users` | SYSTEM_ADMIN | List all staff with roles |
| `POST` | `/api/settings/users` | SYSTEM_ADMIN | Create new user (bcrypt hashed) |
| `PUT` | `/api/settings/users/:id/role` | SYSTEM_ADMIN | Update user role |
| `DELETE` | `/api/settings/users/:id` | SYSTEM_ADMIN | Remove user (prevents deleting last user) |
| `GET` | `/api/settings/config` | SYSTEM_ADMIN, PLANT_MANAGER | Get plant configuration |
| `PUT` | `/api/settings/config` | SYSTEM_ADMIN, PLANT_MANAGER | Update config (rate, MTTR, buffer, webhooks) |

**Dual-Layer Role Gating**:

| Layer | Mechanism |
|-------|-----------|
| **Backend** | `authorize('SYSTEM_ADMIN')` on user CRUD; `authorize('SYSTEM_ADMIN', 'PLANT_MANAGER')` on config |
| **Frontend** | Tabs filtered by role (`ROLE_ORDER` comparison), inputs `disabled`, role dropdowns become static colored badges, Save buttons conditionally rendered, italic "Read-only" notices |

**4 Tabbed Sections**:

| Tab | Visible To | Editable By | Features |
|-----|-----------|-------------|----------|
| User & RBAC | PLANT_MANAGER+ | SYSTEM_ADMIN only | Staff table with role dropdowns (color-coded), Add New User modal (Portal), Edit/Revoke actions |
| Plant Config | All roles | SYSTEM_ADMIN, PLANT_MANAGER | RM/hr rate, Target MTTR, Preventive buffer days — Save with toast notification |
| Alerts & Webhooks | All roles | SYSTEM_ADMIN, PLANT_MANAGER | Slack/Teams webhook URL, SMS/Email toggle switches (CSS animated), Test Webhook button |
| Security & Profile | All roles | Self | Dynamic profile card (name, email, initials from localStorage), password change form, JWT session expiry selector |

**Role-Based Access Matrix**:

| Role | User Mgmt | Config | Alerts | Profile |
|------|:--:|:--:|:--:|:--:|
| SYSTEM_ADMIN | Full CRUD | Edit | Edit | Edit |
| PLANT_MANAGER | View only | Edit | Edit | Password change |
| MAINTENANCE_TECHNICIAN | Hidden | Read-only | Read-only | Password change |
| PLANT_OPERATOR | Hidden | Read-only | Read-only | Password change |

**Interview talking point**: *"Security is defense-in-depth. Backend JWT middleware rejects unauthorized API calls regardless of frontend state. The frontend provides a smooth UX — a technician sees disabled inputs with italic 'Read-only' notices instead of confusing error messages. Role levels are compared numerically via ROLE_ORDER mapping, making tab visibility logic clean and extensible."*

---

## 5. KEY ARCHITECTURAL PATTERNS

| Pattern | Implementation | Why |
|---------|---------------|-----|
| **React Portals** | `createPortal(..., document.body)` with `z-[100]+` on all modals/drawers | Escapes parent `overflow:hidden` and z-index stacking traps |
| **Optimistic UI** | State updated immediately, API call async in background | User never waits for server response |
| **Offline resilience** | localStorage cache + API fetch on mount; falls back to mock data + amber warning banner | System works without backend connectivity |
| **SSR safety** | `useState(seedData)` + `useEffect` hydration from localStorage | Avoids React hydration mismatch errors in Next.js |
| **SQL transactions** | `BEGIN`/`COMMIT`/`ROLLBACK` with `FOR UPDATE` row locking | Prevents race conditions on ticket create/resolve/escalate |
| **Parameterized queries** | All SQL uses `$1, $2` placeholders — zero concatenation | SQL injection-proof |
| **Zod validation** | `safeParse()` on route level before controller executes | Catches malformed requests before they hit the database |
| **Dynamic SQL status** | `computed_status` via `CASE WHEN` in PostgreSQL | Real-time overdue/due-soon/upcoming without cron jobs |
| **DATE_TRUNC aggregation** | `DATE_TRUNC('month', created_at)` in reports | Server-side time-series aggregation |
| **EXTRACT(EPOCH) downtime** | `EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0` | Accurate downtime calculation on database server clock |
| **Responsive mobile** | `hidden sm:table-cell`, `hidden md:table-cell` column hiding, hamburger sidebar overlay, `p-4 lg:p-6` adaptive padding | Full mobile support without separate views |
| **Dark theme system** | Custom Tailwind `surface`/`accent`/`text` color palette, `bg-surface-card`, `bg-surface-elevated`, `border-surface-border` | Consistent dark-mode aesthetic across all modules |
| **CSV export** | `Blob` + `URL.createObjectURL` + programmatic `<a>` click | Client-side export, no server dependency |
| **API fallback chain** | API → localStorage → mock data | Graceful degradation |

---

## 6. INTERVIEW SAMPLE Q&A

### Q1: "How do you prevent concurrent ticket resolution conflicts?"

*"We use PostgreSQL `FOR UPDATE` row-level locking inside a transaction. When a technician resolves a ticket, the row is locked — no other process can modify it until the transaction commits. If the ticket is already resolved when the lock is acquired, the controller returns a 400 error before any writes occur. This is the same pattern used in financial systems for double-spend prevention."*

---

### Q2: "How does the downtime cost calculation work?"

*"Two-layer approach. First, downtime hours are computed entirely on the database server using SQL: `ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 2)`. This uses the database server's clock, which is authoritative and immune to client-side manipulation. Second, financial loss multiplies downtime hours by a configurable rate stored in `plant_config.hourly_downtime_rate` — default RM 650/hr. This rate reflects operator labor (RM 25-40/hr), machine overhead (utilities, consumables), lost production throughput value, and potential contract penalty costs — realistic for Malaysian semiconductor, automotive, or F&B manufacturing plants. Changing the rate in Settings instantly recalculates all reports."*

---

### Q3: "What happens if the backend goes down?"

*"Three-tier graceful degradation. First, the frontend tries the API call. If it fails, it reads from localStorage which caches the last known state. If localStorage is empty, it renders built-in seed/mock data. A non-intrusive amber banner informs the user they're viewing cached data. Critically, all user actions — create equipment, log defect, resolve ticket — update the UI optimistically first. The API call is fire-and-forget. Even if the backend is completely down, the user can continue working and data syncs when it recovers. The worst case is that some server-side validations are deferred, but the user's workflow is never blocked."*

---

### Q4: "How do you handle role-based access?"

*"Dual enforcement. On the backend, Express middleware extracts the role from the JWT payload and `authorize(...roles)` checks against allowed roles before any controller code executes. Unauthorized requests get a 403 before touching the database. On the frontend, tabs, buttons, and input fields are conditionally rendered or disabled based on `ROLE_ORDER` numeric comparison. A PLANT_OPERATOR sees disabled inputs with italic 'Read-only — contact Plant Manager' notices. Even if someone bypasses the frontend via DevTools or curl, the API rejects the request. This is defense-in-depth — the UI layer provides UX, the API layer provides security.*"

---

### Q5: "Why React Portals instead of regular modals?"

*"Regular React components rendered inside the page tree inherit the parent's CSS stacking context and `overflow:hidden`. In our app, the main content area has `overflow-y-auto` for scrollable content. If a modal or slide-over drawer is rendered inside that container, it gets clipped or can't reach `z-index` above sibling elements. `createPortal(..., document.body)` renders the component directly to `<body>`, completely outside the component tree. With `z-[100]` (backdrop) and `z-[110]` (drawer), they sit above everything including the header, sidebar, and any other overlay. This is the standard pattern in production React apps for modals, tooltips, and dropdowns.*"

---

### Q6: "How do you handle mobile responsiveness?"

*"Progressive enhancement. The sidebar becomes a hidden overlay triggered by a hamburger button on screens below `lg` breakpoint. Table columns hide at breakpoints: Zone at `sm`, Category at `md`, Last Serviced/Date at `lg`, etc. — ensuring the core data (code, name, status, actions) is always visible. Content padding reduces from `p-6` to `p-4` on mobile. The date range selector, filter toolbar, and KPI cards all stack vertically on small screens. Drawer panels go full-width (`w-full sm:max-w-lg`). No separate mobile views needed — it's all one component with responsive Tailwind classes."*

---

### Q7: "How do you avoid Next.js hydration errors?"

*"Next.js App Router renders components on the server first, then hydrates on the client. If the server renders one thing and the client renders another, React throws a hydration mismatch error. Our two main sources of mismatch are localStorage and Recharts. For localStorage, we initialize state with the static seed data — same on server and client. The actual localStorage read happens in a `useEffect` after mount. For Recharts, we use a `mounted` state flag — charts only render after `useEffect(() => setMounted(true), [])` confirms we're on the client. A `loading` state shows a brief loading message before charts appear."*

---

### Q8: "Explain the CSV export implementation."

*"Pure client-side. The `exportCSV` function takes an array of objects, extracts headers from the keys, builds a CSV string with proper double-quote escaping, creates a `Blob` with MIME type `text/csv`, generates an object URL via `URL.createObjectURL(blob)`, programmatically creates an `<a>` element, sets `href` and `download` attributes, triggers `click()`, then revokes the URL. No server roundtrip, no library dependency — just standard browser APIs. The reports page fetches ALL equipment data (limit=0) for the full CSV export while displaying only top 5 in the UI table."*

---

### Q9: "What's the difference between soft-delete and hard-delete, and why did you choose soft-delete for equipment?"

*"Soft-delete sets `equipment.status = 'DECOMMISSIONED'` instead of removing the row. This preserves referential integrity — all historical maintenance tickets and preventive schedules still have valid foreign keys pointing to the equipment. If we hard-deleted, those records would be orphaned or cascade-deleted. Soft-deletion also leaves an audit trail — you can see that a machine existed and when it was decommissioned. This is critical for ISO 9001 and regulatory compliance in manufacturing. The equipment is hidden from active lists (we filter `WHERE status != 'DECOMMISSIONED'`) but remains in the database for historical reports."*

---

### Q10: "Walk me through a complete defect resolution lifecycle."

*"1. A PLANT_OPERATOR notices the Autoclave Unit 02 pressure valve malfunctioning. They open the Dashboard or Tickets page, click 'Report Defect', select AST-002 from the equipment picker, describe the fault, set priority to CRITICAL, and submit. 2. The system creates a maintenance_tickets row with status OPEN and simultaneously sets equipment.status = DOWN inside a PostgreSQL transaction. 3. The ticket appears in the live alerts feed with a red 'CRITICAL' badge and pulse animation. 4. A MAINTENANCE_TECHNICIAN opens the ticket detail drawer, clicks 'Assign Technician', selects themselves from the dropdown, and confirms. The ticket status changes to IN_PROGRESS. 5. After repairing the valve, the technician clicks 'Resolve Ticket', sees a confirmation dialog showing the machine will return to OPERATIONAL and downtime (say, 11.8 hours) will be recorded. They confirm. 6. The backend runs a transaction: computes downtime via database clock, sets RESOLVED status, restores equipment to OPERATIONAL. 7. The 11.8 hours of downtime × RM 650/hr = RM 7,670 appears in the Reports module under worst offenders and financial KPIs. The entire lifecycle is auditable with timestamps at every state transition."*

---

## 7. TECH STACK SUMMARY

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14 | App Router, SSR, file-based routing |
| React | 18 | Components, hooks, portals |
| Tailwind CSS | 3 | Utility-first CSS, dark theme |
| Recharts | 2 | Bar, Line, Pie, Donut charts |
| Lucide React | latest | 20+ icons used across all modules |

### Backend

| Technology | Purpose |
|-----------|---------|
| Express.js | REST API framework |
| `pg` (node-postgres) | PostgreSQL connection pool |
| `jsonwebtoken` | JWT auth (12h expiry) |
| `bcrypt` | Password hashing (10 rounds) |
| `zod` | Request validation |
| `cors` | Cross-origin for frontend |
| `dotenv` | Environment variables |

### Database

| Technology | Purpose |
|-----------|---------|
| PostgreSQL 15 | Relational database |
| Supabase | Hosted PostgreSQL with SSL |
| uuid-ossp extension | UUID primary keys |
| 11 production indexes | Query performance |

### Project Structure

```
equip-maint/
├── database/
│   ├── schema.sql                  # Full DDL + seed data
│   ├── migration_v2.sql            # Equipment schema extension
│   └── migration_v3.sql            # Preventive schema extension
├── server/
│   ├── src/
│   │   ├── index.js                # Express entry point (6 route modules)
│   │   ├── config/db.js            # Supabase PG pool (SSL)
│   │   ├── controllers/
│   │   │   ├── equipmentController.js   # 8 endpoints
│   │   │   ├── ticketController.js     # 7 endpoints
│   │   │   ├── userController.js       # 2 endpoints
│   │   │   ├── preventiveController.js # 6 endpoints
│   │   │   ├── reportController.js     # 6 endpoints
│   │   │   └── settingController.js    # 6 endpoints
│   │   ├── routes/                 # 6 route files with Zod + RBAC
│   │   ├── middleware/auth.js      # JWT authenticate + authorize
│   │   └── utils/validators.js     # Zod schemas (10+)
│   └── .env                        # DATABASE_URL, JWT_SECRET
├── frontend/
│   ├── lib/api.js                  # API client (20+ methods)
│   ├── app/
│   │   ├── layout.jsx              # Root layout (sidebar + header + auth)
│   │   ├── login/page.jsx          # Login page
│   │   ├── page.jsx                # Redirect to /dashboard
│   │   ├── dashboard/page.jsx      # KPI cards + charts + alerts
│   │   ├── equipment/page.jsx      # CRUD + filters + drawer
│   │   ├── tickets/page.jsx        # Ticket lifecycle + modals
│   │   ├── preventive/page.jsx     # Schedule management + escalate
│   │   ├── reports/page.jsx        # 4 charts + CSV export
│   │   ├── settings/page.jsx       # 4 tabs + RBAC gating
│   │   └── globals.css             # Tailwind + dark theme
│   ├── tailwind.config.js          # Custom color palette
│   └── .env.local                  # NEXT_PUBLIC_API_URL
└── COST_SAVINGS_SUMMARY.md         # Business value summary
```

---

## COST-SAVINGS & VALUE PROPOSITION

### 1. Minimises Production Downtime with Real-Time Visibility

Every minute a machine sits idle costs the plant thousands in lost throughput. EQUIP-MAINT digitises the entire defect lifecycle — from operator report to technician resolution — slashing Mean Time To Repair from an industry average of 4+ hours to under 2.5 hours. Instant push alerts ensure the right technician is dispatched the moment a fault is logged. The result is measurable reduction in unplanned downtime.

### 2. Replaces Paper Maintenance Logs with a Single Source of Truth

Paper defect logs are illegible, easily lost, and impossible to analyse. EQUIP-MAINT replaces fragmented records with a normalised PostgreSQL database capturing every ticket, repair action, and downtime metric. This creates an auditable, searchable asset history enabling trend analysis across equipment categories, root-cause identification of recurring faults, and evidence-based capital replacement decisions.

### 3. Optimises Preventive Maintenance Scheduling & Extends Asset Lifespan

Reactive maintenance costs 3-5x more than planned preventive work. EQUIP-MAINT's scheduling engine tracks service intervals per machine and surfaces upcoming/overdue tasks. By ensuring inspections are never missed, the system extends Mean Time Between Failures, reduces spare parts consumption, and delays costly capital equipment replacement cycles. Plants adopting structured preventive programs typically see a 25-30% reduction in total maintenance spend.

---

*Document generated for interview preparation — EQUIP-MAINT v1.0*
