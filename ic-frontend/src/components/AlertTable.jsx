import { useEffect, useRef, useState } from "react";
import { AlertCircle, ChevronDown, User, Check } from "lucide-react";
import "./AlertTable.css";

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getAlertStatus(alert) {
  if (alert.status === "closed") return { label: "Closed", cls: "status-closed" };
  if (alert.assigned_to_user_id) return { label: "Under Review", cls: "status-review" };
  return { label: "New", cls: "status-new" };
}

export function RiskBadge({ level }) {
  return (
    <span className={`risk-badge risk-${level.toLowerCase()}`}>
      <AlertCircle size={11} />
      {level}
    </span>
  );
}

function StatusBadge({ alert }) {
  const { label, cls } = getAlertStatus(alert);
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

// ── Assignee Dropdown ──────────────────────────────────────────────────────────

function AssigneeDisplay({ assignedUser }) {
  return (
    <div className="assignee-display">
      {assignedUser ? (
        <>
          <span className="assignee-avatar filled">
            {assignedUser.username.slice(0, 2).toUpperCase()}
          </span>
          <span className="assignee-name">{assignedUser.username}</span>
        </>
      ) : (
        <>
          <span className="assignee-avatar empty"><User size={13} /></span>
          <span className="assignee-name muted">Unassigned</span>
        </>
      )}
    </div>
  );
}

function AssigneeDropdown({ alert, users, currentUser, onAssign }) {
  const isSupervisor = currentUser.role === "supervisor";
  const isClosed = alert.status === "closed";
  const assignedUser = users.find((u) => u.user_id === alert.assigned_to_user_id);

  // Analysts: "Assign to Me" button when unassigned, read-only name when assigned
  if (!isSupervisor) {
    if (isClosed || alert.assigned_to_user_id) {
      return <AssigneeDisplay assignedUser={assignedUser} />;
    }
    return (
      <button
        className="assign-me-btn"
        onClick={(e) => {
          e.stopPropagation();
          onAssign(alert.daily_alert_id, currentUser.user_id);
        }}
      >
        Assign to Me
      </button>
    );
  }

  // Supervisor: full dropdown
  return <SupervisorDropdown alert={alert} users={users} currentUser={currentUser} onAssign={onAssign} assignedUser={assignedUser} />;
}

function SupervisorDropdown({ alert, users, currentUser, onAssign, assignedUser }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelect(e, userId) {
    e.stopPropagation();
    onAssign(alert.daily_alert_id, userId);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="assignee-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className="assignee-trigger"
        onClick={() => setOpen((o) => !o)}
        title="Change assignee"
      >
        {assignedUser ? (
          <span className="assignee-avatar filled">
            {assignedUser.username.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <span className="assignee-avatar empty"><User size={13} /></span>
        )}
        <span className="assignee-name">
          {assignedUser ? assignedUser.username : "Unassigned"}
        </span>
        <ChevronDown size={12} className="assignee-chevron" />
      </button>

      {open && (
        <div className="assignee-menu">
          <div className="assignee-search">
            <input
              placeholder="Search analyst..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="assignee-options">
            {filtered.map((u) => {
              const isMe = u.user_id === currentUser.user_id;
              const isCurrent = u.user_id === alert.assigned_to_user_id;
              return (
                <button
                  key={u.user_id}
                  className={`assignee-option ${isCurrent ? "selected" : ""}`}
                  onClick={(e) => handleSelect(e, u.user_id)}
                >
                  <span className="option-avatar">
                    {u.username.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="option-name">
                    {u.username}
                    {isMe && <span className="me-tag">me</span>}
                  </span>
                  {isCurrent && <Check size={13} className="option-check" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="assignee-empty">No users found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alert Item ────────────────────────────────────────────────────────────────

function AlertItem({ alert, users, currentUser, onSelect, onAssign }) {
  const uploadedDate = alert.uploaded_at
    ? new Date(alert.uploaded_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <div
      className={`alert-item ${alert.status === "closed" ? "is-closed" : ""}`}
      onClick={() => onSelect(alert)}
    >
      <div className="alert-icon-col">
        <AlertCircle size={17} />
      </div>

      <div className="alert-body-col">
        <div className="alert-top-row">
          <span className="alert-id">#{alert.daily_alert_id}</span>
          <span className="alert-sep">·</span>
          <span className="alert-date">{uploadedDate}</span>
          <div className="alert-top-spacer" />
          <StatusBadge alert={alert} />
        </div>

        <div className="alert-title">{alert.summary}</div>

        <div className="alert-bottom-row">
          <div className="alert-chips">
            <span>{alert.customer_name}</span>
            <span className="chip-sep">·</span>
            <span>ID: {alert.customer_id}</span>
            <span className="chip-sep">·</span>
            <span>Trade: {alert.trade_id}</span>
            <span className="chip-sep">·</span>
            <span>${Number(alert.amount).toLocaleString()}</span>
            <span className="chip-sep">·</span>
            <span>{alert.country}</span>
          </div>

          <div className="alert-right-actions">
            <AssigneeDropdown
              alert={alert}
              users={users}
              currentUser={currentUser}
              onAssign={onAssign}
            />
            <RiskBadge level={alert.risk_level} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alert Table ────────────────────────────────────────────────────────────────

export default function AlertTable({ alerts, users, currentUser, onSelect, onAssign }) {
  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <AlertItem
          key={alert.daily_alert_id}
          alert={alert}
          users={users}
          currentUser={currentUser}
          onSelect={onSelect}
          onAssign={onAssign}
        />
      ))}
    </div>
  );
}
