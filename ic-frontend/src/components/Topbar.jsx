import { Bell, Search, LogOut } from "lucide-react";
import "./Topbar.css";

export default function Topbar({ user, search, onSearchChange, onGetNext, onLogout }) {
  const initials = user.username.slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">◆</div>
        <span className="brand-name">Investigation Center</span>
      </div>

      <div className="search-bar">
        <Search size={15} />
        <input
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="top-right">
        <button className="get-next-btn" onClick={onGetNext}>
          Get Next Alert
        </button>
        <button className="icon-btn" title="Notifications">
          <Bell size={17} />
        </button>
        <div className="avatar" title={user.username}>{initials}</div>
        <button className="icon-btn" title="Sign out" onClick={onLogout}>
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
}
