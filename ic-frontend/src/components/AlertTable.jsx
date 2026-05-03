import { AlertCircle } from "lucide-react";
import "./AlertTable.css";

function RiskBadge({ level }) {
  return (
    <span className={`risk-badge risk-${level.toLowerCase()}`}>
      <AlertCircle size={12} />
      {level}
    </span>
  );
}

function AlertRow({ alert, onAssign }) {
  const date = alert.transaction_time
    ? new Date(alert.transaction_time).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

  return (
    <tr className="alert-row">
      <td>
        <span className="cell-primary">#{alert.daily_alert_id}</span>
        <span className="cell-sub">{alert.trade_id}</span>
      </td>
      <td>
        <span className="cell-primary">{alert.customer_name}</span>
        <span className="cell-sub">{alert.customer_id}</span>
      </td>
      <td>
        <RiskBadge level={alert.risk_level} />
      </td>
      <td className="summary-cell">
        <span className="cell-primary summary-text">{alert.summary}</span>
        <span className="cell-sub">{date}</span>
      </td>
      <td className="amount-cell">${Number(alert.amount).toLocaleString()}</td>
      <td>{alert.country}</td>
      <td>
        {alert.assigned_to ? (
          <span className="cell-primary">{alert.assigned_to}</span>
        ) : (
          <span className="cell-sub">—</span>
        )}
      </td>
      <td>
        {!alert.assigned_to_user_id ? (
          <button
            className="assign-btn"
            onClick={() => onAssign(alert.daily_alert_id)}
          >
            Assign
          </button>
        ) : (
          <span className="assigned-chip">Assigned</span>
        )}
      </td>
    </tr>
  );
}

export default function AlertTable({ alerts, onAssign }) {
  return (
    <div className="table-wrapper">
      <table className="alert-table">
        <thead>
          <tr>
            <th>Alert</th>
            <th>Customer</th>
            <th>Risk</th>
            <th>Summary</th>
            <th>Amount</th>
            <th>Country</th>
            <th>Assigned To</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <AlertRow
              key={alert.daily_alert_id}
              alert={alert}
              onAssign={onAssign}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
