import { useEffect, useState } from "react";
import { AlertTriangle, Inbox, List, LogOut, UserCheck } from "lucide-react";
import "./App.css";

const API_BASE = "http://localhost:8000";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("ic_token") || "");
  const [loginForm, setLoginForm] = useState({
    username: "analyst1",
    password: "admin123",
  });
  const [queue, setQueue] = useState("unassigned");
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  async function login(event) {
    event.preventDefault();
    setError("");

    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginForm),
    });

    if (!response.ok) {
      setError("Invalid username or password");
      return;
    }

    const data = await response.json();
    setUser(data.user);
    setToken(data.access_token);
    localStorage.setItem("ic_token", data.access_token);
  }

  async function loadMe() {
    if (!token) return;

    const response = await fetch(`${API_BASE}/me`, {
      headers: authHeaders,
    });

    if (!response.ok) {
      logout();
      return;
    }

    const data = await response.json();
    setUser(data);
  }

  async function loadAlerts() {
    if (!token || !user) return;

    let endpoint = "/alerts/unassigned";

    if (queue === "mine") endpoint = "/alerts/mine";
    if (queue === "all") endpoint = "/alerts/all";

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: authHeaders,
    });

    if (!response.ok) {
      setError("Failed to load alerts");
      return;
    }

    const data = await response.json();
    setAlerts(data);
  }

  async function assignAlert(dailyAlertId) {
    const response = await fetch(`${API_BASE}/alerts/assign`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ daily_alert_id: dailyAlertId }),
    });

    if (!response.ok) {
      setError("Alert is already assigned or unavailable");
      await loadAlerts();
      return;
    }

    await loadAlerts();
  }

  function logout() {
    localStorage.removeItem("ic_token");
    setToken("");
    setUser(null);
    setAlerts([]);
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [queue, user]);

  if (!user) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <h1>Investigation Center</h1>
          <p>Daily uploaded bank alert investigation workspace</p>

          <label>Username</label>
          <input
            value={loginForm.username}
            onChange={(e) =>
              setLoginForm({ ...loginForm, username: e.target.value })
            }
          />

          <label>Password</label>
          <input
            type="password"
            value={loginForm.password}
            onChange={(e) =>
              setLoginForm({ ...loginForm, password: e.target.value })
            }
          />

          {error && <div className="error">{error}</div>}

          <button type="submit">Login</button>

          <small>Demo users: analyst1 / admin123, analyst2 / admin123</small>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Investigation Center</h1>
          <p>Showing uploaded daily alerts only</p>
        </div>

        <div className="user-box">
          <span>
            Logged in as <b>{user.username}</b>
          </span>
          <button onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <nav className="queue-nav">
        <button
          className={queue === "unassigned" ? "active" : ""}
          onClick={() => setQueue("unassigned")}
        >
          <Inbox size={18} />
          UnAssigned
        </button>

        <button
          className={queue === "mine" ? "active" : ""}
          onClick={() => setQueue("mine")}
        >
          <UserCheck size={18} />
          Assigned to Me
        </button>

        <button
          className={queue === "all" ? "active" : ""}
          onClick={() => setQueue("all")}
        >
          <List size={18} />
          All Alerts
        </button>
      </nav>

      {error && <div className="error banner">{error}</div>}

      <section className="alerts">
        {alerts.length === 0 && (
          <div className="empty">No alerts in this queue.</div>
        )}

        {alerts.map((alert) => (
          <article className="alert-card" key={alert.daily_alert_id}>
            <div className="alert-header">
              <div>
                <h2>{alert.trade_id}</h2>
                <p>
                  {alert.customer_name} — {alert.customer_id}
                </p>
              </div>

              <span className={`risk ${String(alert.risk_level).toLowerCase()}`}>
                <AlertTriangle size={16} />
                {alert.risk_level}
              </span>
            </div>

            <p className="summary">{alert.summary}</p>

            <div className="alert-grid">
              <div>
                <b>Transaction Time:</b> {alert.transaction_time}
              </div>
              <div>
                <b>Amount:</b> ${Number(alert.amount).toLocaleString()}
              </div>
              <div>
                <b>Country:</b> {alert.country}
              </div>
              <div>
                <b>Uploaded:</b> {alert.uploaded_at}
              </div>
              <div>
                <b>Assigned To:</b> {alert.assigned_to}
              </div>
            </div>

            {!alert.assigned_to_user_id && (
              <button
                className="assign-button"
                onClick={() => assignAlert(alert.daily_alert_id)}
              >
                Assign to me
              </button>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

export default App;