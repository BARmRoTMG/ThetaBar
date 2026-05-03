import { useEffect } from "react";
import { X, AlertCircle, User, Calendar, DollarSign, Globe, Hash, Clock } from "lucide-react";
import { getAlertStatus, RiskBadge } from "./AlertTable";
import "./AlertModal.css";

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="detail-row">
      <div className="detail-icon">
        <Icon size={14} />
      </div>
      <div className="detail-content">
        <span className="detail-label">{label}</span>
        <span className="detail-value">{value ?? "—"}</span>
      </div>
    </div>
  );
}

export default function AlertModal({ alert, users, currentUser, onAssign, onClose, onCloseAlert }) {
  const { label: statusLabel, cls: statusCls } = getAlertStatus(alert);
  const isClosed = alert.status === "closed";

  const assignedUser = users.find((u) => u.user_id === alert.assigned_to_user_id);

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  // Close on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-drawer" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-alert-icon">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="modal-alert-id">Alert #{alert.daily_alert_id}</div>
              <div className="modal-alert-trade">{alert.trade_id}</div>
            </div>
          </div>
          <div className="modal-header-right">
            <span className={`status-badge ${statusCls}`}>{statusLabel}</span>
            <RiskBadge level={alert.risk_level} />
            <button className="modal-close-btn" onClick={onClose} title="Close panel">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Summary */}
          <section className="modal-section">
            <h3 className="modal-section-title">Summary</h3>
            <p className="modal-summary">{alert.summary}</p>
          </section>

          {/* Customer */}
          <section className="modal-section">
            <h3 className="modal-section-title">Customer</h3>
            <DetailRow icon={User} label="Name" value={alert.customer_name} />
            <DetailRow icon={Hash} label="Customer ID" value={alert.customer_id} />
          </section>

          {/* Transaction */}
          <section className="modal-section">
            <h3 className="modal-section-title">Transaction</h3>
            <DetailRow icon={Hash} label="Trade ID" value={alert.trade_id} />
            <DetailRow
              icon={DollarSign}
              label="Amount"
              value={`$${Number(alert.amount).toLocaleString()}`}
            />
            <DetailRow icon={Globe} label="Country" value={alert.country} />
            <DetailRow
              icon={Calendar}
              label="Transaction Date"
              value={formatDate(alert.transaction_time)}
            />
          </section>

          {/* Assignment */}
          <section className="modal-section">
            <h3 className="modal-section-title">Assignment</h3>
            <DetailRow
              icon={Clock}
              label="Uploaded At"
              value={formatDate(alert.uploaded_at)}
            />
            <div className="detail-row">
              <div className="detail-icon"><User size={14} /></div>
              <div className="detail-content">
                <span className="detail-label">Assigned To</span>
                <div className="modal-assignee-row">
                  {assignedUser ? (
                    <>
                      <span className="modal-assignee-avatar">
                        {assignedUser.username.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="detail-value">{assignedUser.username}</span>
                      {assignedUser.user_id === currentUser.user_id && (
                        <span className="me-tag">me</span>
                      )}
                    </>
                  ) : (
                    <span className="detail-value muted">Unassigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Supervisor: pick any analyst */}
            {!isClosed && currentUser.role === "supervisor" && (
              <div className="modal-assign-options">
                {users.map((u) => {
                  const isActive = u.user_id === alert.assigned_to_user_id;
                  return (
                    <button
                      key={u.user_id}
                      className={`modal-assign-btn ${isActive ? "active" : ""}`}
                      onClick={() => onAssign(alert.daily_alert_id, u.user_id)}
                    >
                      <span className="option-avatar-sm">
                        {u.username.slice(0, 2).toUpperCase()}
                      </span>
                      {u.username}
                      {u.user_id === currentUser.user_id && (
                        <span className="me-tag">me</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Analyst: can only assign to themselves */}
            {!isClosed && currentUser.role !== "supervisor" && !alert.assigned_to_user_id && (
              <button
                className="modal-assign-btn"
                style={{ marginTop: 8 }}
                onClick={() => onAssign(alert.daily_alert_id, currentUser.user_id)}
              >
                <span className="option-avatar-sm">
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </span>
                Assign to Me
              </button>
            )}
          </section>
        </div>

        {/* Footer */}
        {!isClosed && (
          <div className="modal-footer">
            <button className="modal-dismiss-btn" onClick={onClose}>
              Dismiss
            </button>
            <button
              className="modal-close-alert-btn"
              onClick={() => onCloseAlert(alert.daily_alert_id)}
            >
              Close Alert
            </button>
          </div>
        )}

        {isClosed && (
          <div className="modal-footer closed-footer">
            <span className="closed-note">This alert has been closed.</span>
            <button className="modal-dismiss-btn" onClick={onClose}>
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
