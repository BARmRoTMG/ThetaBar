import { useEffect, useMemo, useState } from "react";
import { Files, FolderOpen, Inbox } from "lucide-react";
import LoginPage from "./components/LoginPage";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import AlertTable from "./components/AlertTable";
import AlertModal from "./components/AlertModal";
import EmptyState from "./components/EmptyState";
import {
  loginUser,
  fetchMe,
  fetchUsers,
  fetchAlerts,
  assignAlert,
  closeAlert,
  getNextAlert,
} from "./api";
import "./App.css";

const VIEWS = [
  { id: "unassigned", label: "Unassigned", icon: Inbox },
  { id: "mine", label: "Assigned to Me", icon: FolderOpen },
  { id: "all", label: "All Alerts", icon: Files },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("ic_token") || "");
  const [users, setUsers] = useState([]);
  const [activeView, setActiveView] = useState("unassigned");
  const [reloadKey, setReloadKey] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");

  async function handleLogin(username, password) {
    setError("");
    try {
      const data = await loginUser(username, password);
      setUser(data.user);
      setToken(data.access_token);
      localStorage.setItem("ic_token", data.access_token);
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadAlerts(view = activeView) {
    if (!user || !token) return;
    try {
      const data = await fetchAlerts(token, view);
      setAlerts(data);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAssign(dailyAlertId, userId = null) {
    setError("");
    try {
      await assignAlert(token, dailyAlertId, userId);
      await loadAlerts();
      // Keep modal in sync if it's open for this alert
      setSelectedAlert((prev) =>
        prev?.daily_alert_id === dailyAlertId ? null : prev
      );
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCloseAlert(alertId) {
    setError("");
    try {
      await closeAlert(token, alertId);
      setSelectedAlert(null);
      await loadAlerts();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleGetNext() {
    setError("");
    try {
      await getNextAlert(token);
      setActiveView("mine");
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(e.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("ic_token");
    setToken("");
    setUser(null);
    setAlerts([]);
    setUsers([]);
  }

  useEffect(() => {
    if (!token) return;
    fetchMe(token).then(setUser).catch(handleLogout);
  }, []);

  useEffect(() => {
    if (!user || !token) return;
    fetchUsers(token).then(setUsers).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) loadAlerts(activeView);
  }, [user, activeView, reloadKey]);

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return alerts;
    return alerts.filter((a) =>
      [
        a.daily_alert_id,
        a.customer_name,
        a.customer_id,
        a.trade_id,
        a.risk_level,
        a.summary,
        a.country,
        a.assigned_to,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [alerts, search]);

  if (!user) {
    return <LoginPage onLogin={handleLogin} error={error} />;
  }

  return (
    <div className={`shell ${sidebarCollapsed ? "collapsed" : ""}`}>
      <Topbar
        user={user}
        search={search}
        onSearchChange={setSearch}
        onGetNext={handleGetNext}
        onLogout={handleLogout}
      />
      <Sidebar
        views={VIEWS}
        activeView={activeView}
        collapsed={sidebarCollapsed}
        onSelect={setActiveView}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />
      <main className="main-content">
        <div className="page-header">
          <h1>{VIEWS.find((v) => v.id === activeView)?.label}</h1>
          <span className="alert-count">{filteredAlerts.length} alerts</span>
        </div>

        {error && (
          <div className="error-banner" onClick={() => setError("")}>
            {error} &mdash; click to dismiss
          </div>
        )}

        {filteredAlerts.length === 0 ? (
          <EmptyState queue={activeView} />
        ) : (
          <AlertTable
            alerts={filteredAlerts}
            users={users}
            currentUser={user}
            onSelect={setSelectedAlert}
            onAssign={handleAssign}
          />
        )}
      </main>

      {selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          users={users}
          currentUser={user}
          onAssign={handleAssign}
          onClose={() => setSelectedAlert(null)}
          onCloseAlert={handleCloseAlert}
        />
      )}
    </div>
  );
}
