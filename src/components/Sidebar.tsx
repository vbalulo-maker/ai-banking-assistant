import RecentConversations from './RecentConversations';
import type { ScenarioId } from './ScenarioNav';

interface SidebarProps {
  open: boolean;
  activeConversationId: string;
  onSelect: (scenario: ScenarioId, conversationId: string) => void;
  refreshKey: number;
}

export default function Sidebar({
  open,
  activeConversationId,
  onSelect,
  refreshKey,
}: SidebarProps) {
  return (
    <aside
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      aria-hidden={!open}
    >
      <div className="sidebar__inner">
        <RecentConversations
          activeConversationId={activeConversationId}
          onSelect={onSelect}
          refreshKey={refreshKey}
        />
      </div>
    </aside>
  );
}