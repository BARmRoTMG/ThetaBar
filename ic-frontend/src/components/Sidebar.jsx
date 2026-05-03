import { ChevronLeft, ChevronRight } from "lucide-react";
import "./Sidebar.css";

export default function Sidebar({ views, activeView, collapsed, onSelect, onToggle }) {
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button
        className="collapse-btn"
        onClick={onToggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {!collapsed && <p className="sidebar-section-label">Queues</p>}

      <nav className="sidebar-nav">
        {views.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              className={`sidebar-item ${activeView === view.id ? "active" : ""}`}
              onClick={() => onSelect(view.id)}
              title={view.label}
            >
              <Icon size={18} />
              {!collapsed && <span>{view.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
