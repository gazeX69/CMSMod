export interface PluginEventEnvelope<TPayload = unknown> {
  event: string;
  timestamp: string;
  source: string;
  payload: TPayload;
}

type EventHandler<TPayload = unknown> = (event: PluginEventEnvelope<TPayload>) => void | Promise<void>;

export class PluginEventBus {
  private handlers = new Map<string, Set<EventHandler>>();

  on<TPayload = unknown>(eventName: string, handler: EventHandler<TPayload>) {
    const handlers = this.handlers.get(eventName) || new Set<EventHandler>();
    handlers.add(handler as EventHandler);
    this.handlers.set(eventName, handlers);

    return () => handlers.delete(handler as EventHandler);
  }

  async emit<TPayload = unknown>(eventName: string, payload: TPayload, source = 'platform') {
    const envelope: PluginEventEnvelope<TPayload> = {
      event: eventName,
      timestamp: new Date().toISOString(),
      source,
      payload,
    };
    const handlers = Array.from(this.handlers.get(eventName) || []);
    await Promise.all(handlers.map((handler) => handler(envelope)));
  }

  clearPluginRuntimeHandlers() {
    this.handlers.clear();
  }
}

export const pluginEventBus = new PluginEventBus();
