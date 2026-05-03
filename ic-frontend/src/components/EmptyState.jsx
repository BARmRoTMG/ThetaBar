import { Inbox, FolderOpen } from "lucide-react";
import "./EmptyState.css";

export default function EmptyState({ queue }) {
  const isMine = queue === "mine";

  return (
    <div className="empty-state">
      <div className="empty-icon">
        {isMine ? <Inbox size={46} /> : <FolderOpen size={46} />}
      </div>
      <h2>{isMine ? "No alerts assigned to you" : "No alerts in this queue"}</h2>
      <p>
        {isMine
          ? "Use Get Next Alert in the toolbar to receive your next alert."
          : "There are no alerts here right now. Check back later."}
      </p>
    </div>
  );
}
