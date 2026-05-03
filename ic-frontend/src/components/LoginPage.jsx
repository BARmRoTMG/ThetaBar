import { useState } from "react";
import "./LoginPage.css";

export default function LoginPage({ onLogin, error }) {
  const [form, setForm] = useState({ username: "analyst1", password: "admin123" });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onLogin(form.username, form.password);
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">◆</div>

        <div className="login-heading">
          <h1>Investigation Center</h1>
          <p>Bank alert investigation workspace</p>
        </div>

        <div className="login-fields">
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            autoComplete="username"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="login-error">{error}</div>}

        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
