import { Archive, FolderOpen, Inbox } from "lucide-react";
import "./EmptyState.css";

const CONFIG = {
  mine: {
    icon: Inbox,
    heading: "No alerts assigned to you",
    body: "Use Get Next Alert in the toolbar to receive your next alert.",
  },
  closed: {
    icon: Archive,
    heading: "No closed alerts yet",
    body: "Alerts that have been closed will appear here.",
  },
  default: {
    icon: FolderOpen,
    heading: "No alerts in this queue",
    body: "There are no alerts here right now. Check back later.",
  },
};

export default function EmptyState({ queue }) {
  const { icon: Icon, heading, body } = CONFIG[queue] ?? CONFIG.default;

  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={46} />
      </div>
      <h2>{heading}</h2>
      <p>{body}</p>
    </div>
  );
}
