export interface EventMetrics {
  published_events: number;
  handled_events: number;
  failed_events: number;
  active_subscribers: number;
  average_processing_time: number;
  error_rate: number;
  timestamp: Date;
}

export interface EventData {
  id: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: Date;
  source: string;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  callback: (event: EventData) => void;
  active: boolean;
}