import { useState, useCallback, useEffect } from 'react';

export interface EventIntegrationHook {
  connected: boolean;
  lastEvent: { type: string; timestamp: Date } | null;
  connect: () => void;
  disconnect: () => void;
  sendEvent: (type: string, data: unknown) => void;
}

export function useEventIntegration(): EventIntegrationHook {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ type: string; timestamp: Date } | null>(null);

  const connect = useCallback(() => {
    setConnected(true);
    setLastEvent({
      type: 'connection.established',
      timestamp: new Date(),
    });
  }, []);

  const disconnect = useCallback(() => {
    setConnected(false);
    setLastEvent({
      type: 'connection.closed',
      timestamp: new Date(),
    });
  }, []);

  const sendEvent = useCallback((type: string, data: unknown) => {
    if (!connected) return;
    
    // In a real implementation, this would send the event to a server
    console.log('Sending event:', { type, data });
    
    setLastEvent({
      type,
      timestamp: new Date(),
    });
  }, [connected]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    lastEvent,
    connect,
    disconnect,
    sendEvent,
  };
}