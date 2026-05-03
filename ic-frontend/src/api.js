const API_BASE = `http://${window.location.hostname}:8000`;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid username or password");
  return res.json();
}

export async function fetchMe(token) {
  const res = await fetch(`${API_BASE}/me`, { headers: headers(token) });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

export async function fetchUsers(token) {
  const res = await fetch(`${API_BASE}/users`, { headers: headers(token) });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

const QUEUE_ENDPOINT = {
  unassigned: "/alerts/unassigned",
  mine: "/alerts/mine",
  all: "/alerts/all",
};

export async function fetchAlerts(token, queue) {
  const res = await fetch(`${API_BASE}${QUEUE_ENDPOINT[queue]}`, {
    headers: headers(token),
  });
  if (!res.ok) throw new Error("Failed to load alerts");
  return res.json();
}

export async function assignAlert(token, dailyAlertId, userId = null) {
  const res = await fetch(`${API_BASE}/alerts/assign`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ daily_alert_id: dailyAlertId, user_id: userId }),
  });
  if (!res.ok) throw new Error("Failed to assign alert");
  return res.json();
}

export async function closeAlert(token, alertId) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/close`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error("Failed to close alert");
  return res.json();
}

export async function getNextAlert(token) {
  const res = await fetch(`${API_BASE}/alerts/get-next`, {
    method: "POST",
    headers: headers(token),
  });
  if (!res.ok) throw new Error("No alerts available");
  return res.json();
}
