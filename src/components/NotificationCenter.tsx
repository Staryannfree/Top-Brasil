import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const MOCK_NOTIFICATIONS = [
  { id: '1', text: '🚨 Novo lead: Marcos (Google Ads)', time: 'Agora' },
  { id: '2', text: '⏰ João Silva: SLA 48h estourado', time: '2h atrás' },
  { id: '3', text: '💰 Comissão de R$ 300 desbloqueada!', time: '5h atrás' },
];

export function NotificationCenter() {
  const [unread, setUnread] = useState(3);

  return (
    <Popover onOpenChange={(open) => open && setUnread(0)}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="text-sm font-semibold text-foreground">Notificações</h4>
        </div>
        <ScrollArea className="max-h-64">
          {MOCK_NOTIFICATIONS.map((n) => (
            <div key={n.id} className="px-3 py-2.5 border-b last:border-0 hover:bg-muted/50 transition-colors">
              <p className="text-sm text-foreground">{n.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
            </div>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
