'use client';

import { useState } from 'react';
import { LogEntry } from '@/lib/types/api';
import { useAdmin } from '@/lib/context/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronUp, Trash2, Copy } from 'lucide-react';

export function LogPanel() {
  const { logs, isLogsVisible, setIsLogsVisible, clearLogs } = useAdmin();
  const [filter, setFilter] = useState('');
  const [height, setHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);

  const filteredLogs = logs.filter(
    log =>
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.source.toLowerCase().includes(filter.toLowerCase()) ||
      log.level.toLowerCase().includes(filter.toLowerCase())
  );

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newHeight = Math.max(100, window.innerHeight - e.clientY);
    setHeight(newHeight);
  };

  const copyToClipboard = (log: LogEntry) => {
    const text = `[${log.level.toUpperCase()}] ${log.source}: ${log.message}`;
    navigator.clipboard.writeText(text);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-destructive';
      case 'warn':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-foreground';
    }
  };

  if (!isLogsVisible) {
    return (
      <div className="fixed bottom-0 right-0 p-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsLogsVisible(true)}
          className="gap-2"
        >
          <ChevronUp className="h-4 w-4" />
          Logs ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex flex-col border-t border-border bg-background"
      style={{ height: `${height}px` }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="h-1 cursor-ns-resize bg-border hover:bg-primary transition-colors"
        onMouseDown={handleMouseDown}
      />

      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Logs</h3>
          <span className="text-xs text-muted-foreground">({filteredLogs.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter logs..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="h-8 w-32 text-xs"
          />
          <Button variant="ghost" size="sm" onClick={clearLogs} className="h-8 px-2">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsLogsVisible(false)}
            className="h-8 px-2"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {logs.length === 0 ? 'No logs yet' : 'No logs matching filter'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-2 px-4 py-1 hover:bg-accent transition-colors group"
              >
                <span className={`min-w-12 font-semibold ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="min-w-24 text-muted-foreground">{log.source}</span>
                <span className="flex-1 text-foreground break-all">{log.message}</span>
                <span className="text-muted-foreground text-xs min-w-20 text-right">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => copyToClipboard(log)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
