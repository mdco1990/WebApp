// Event-driven integration with backend events
export class EventIntegration {
  private static eventSource: EventSource | null = null;
  private static listeners: Map<string, ((data: unknown) => void)[]> = new Map();

  static connect(userId: number) {
    if (this.eventSource) {
      this.disconnect();
    }

    this.eventSource = new EventSource(`/api/v1/events/stream?user_id=${userId}`);
    
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleEvent(data);
      } catch {
        // Error parsing event data
      }
    };

    this.eventSource.onerror = (_error) => {
      // EventSource error - attempting to reconnect after 5 seconds
      setTimeout(() => this.connect(userId), 5000);
    };
  }

  static disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  static subscribe(eventType: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  static unsubscribe(eventType: string, callback: (data: unknown) => void) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private static handleEvent(eventData: unknown) {
    const event = eventData as { type: string; data: unknown };
    const { type, data } = event;
    const callbacks = this.listeners.get(type);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch {
          // Error in event handler
        }
      });
    }
  }
}