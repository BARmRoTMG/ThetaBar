const API_BASE = `http://${window.location.hostname}:8000`;

export function sendLog(level, message, details = null) {
  fetch(`${API_BASE}/frontend-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, message, source: "frontend", details }),
  }).catch(() => {/* swallow — logging must never crash the app */});
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(url, options = {}, errorMessage = "API error") {
  const res = await fetch(url, options);
  if (!res.ok) {
    sendLog("error", errorMessage, `status=${res.status} url=${url}`);
    throw new Error(`${errorMessage} (${res.status})`);
  }
  return res.json();
}

export async function loginUser(username, password) {
  return apiFetch(
    `${API_BASE}/login`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) },
    "Login failed"
  );
}

export async function fetchMe(token) {
  return apiFetch(`${API_BASE}/me`, { headers: headers(token) }, "Unauthorized");
}

export async function fetchUsers(token) {
  return apiFetch(`${API_BASE}/users`, { headers: headers(token) }, "Failed to load users");
}

const QUEUE_ENDPOINT = {
  unassigned: "/alerts/unassigned",
  mine: "/alerts/mine",
  all: "/alerts/all",
  closed: "/alerts/closed",
};

export async function fetchAlerts(token, queue) {
  return apiFetch(
    `${API_BASE}${QUEUE_ENDPOINT[queue]}`,
    { headers: headers(token) },
    `Failed to load alerts (queue=${queue})`
  );
}

export async function assignAlert(token, dailyAlertId, userId = null) {
  return apiFetch(
    `${API_BASE}/alerts/assign`,
    { method: "POST", headers: headers(token), body: JSON.stringify({ daily_alert_id: dailyAlertId, user_id: userId }) },
    `Failed to assign alert id=${dailyAlertId}`
  );
}

export async function closeAlert(token, alertId) {
  return apiFetch(
    `${API_BASE}/alerts/${alertId}/close`,
    { method: "POST", headers: headers(token) },
    `Failed to close alert id=${alertId}`
  );
}

export async function getNextAlert(token) {
  return apiFetch(
    `${API_BASE}/alerts/get-next`,
    { method: "POST", headers: headers(token) },
    "No alerts available"
  );
}
