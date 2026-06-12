import crypto from 'crypto';
import type { PluginEventEnvelope } from '@modern-cms/plugin-sdk';

type EventHandler<TPayload = unknown> = (event: PluginEventEnvelope<TPayload>) => void | Promise<void>;

interface OwnedHandler {
  id: string;
  owner: string;
  eventName: string;
  handler: EventHandler;
  failures: number;
  lastDurationMs: number;
  lastError?: string;
}

export class PluginEventBus {
  private handlers = new Map<string, Map<string, OwnedHandler>>();

  on<TPayload = unknown>(owner: string, eventName: string, handler: EventHandler<TPayload>) {
    const subscription: OwnedHandler = {
      id: crypto.randomUUID(),
      owner,
      eventName,
      handler: handler as EventHandler,
      failures: 0,
      lastDurationMs: 0,
    };
    const handlers = this.handlers.get(eventName) || new Map<string, OwnedHandler>();
    handlers.set(subscription.id, subscription);
    this.handlers.set(eventName, handlers);
    return { dispose: () => handlers.delete(subscription.id) };
  }

  async emit<TPayload = unknown>(eventName: string, payload: TPayload, source = 'platform', version = 1) {
    JSON.stringify(payload);
    const envelope: PluginEventEnvelope<TPayload> = {
      eventId: crypto.randomUUID(),
      event: eventName,
      version,
      timestamp: new Date().toISOString(),
      source,
      payload,
    };
    const handlers = Array.from(this.handlers.get(eventName)?.values() || []);
    await Promise.all(handlers.map(async (subscription) => {
      const startedAt = Date.now();
      try {
        await subscription.handler(envelope);
        subscription.lastError = undefined;
      } catch (error) {
        subscription.failures += 1;
        subscription.lastError = error instanceof Error ? error.message : String(error);
      } finally {
        subscription.lastDurationMs = Date.now() - startedAt;
      }
    }));
    return { eventId: envelope.eventId, listeners: handlers.length, failures: handlers.filter((handler) => handler.lastError).length };
  }

  unregisterOwner(owner: string) {
    for (const handlers of this.handlers.values()) {
      for (const [id, subscription] of handlers) {
        if (subscription.owner === owner) handlers.delete(id);
      }
    }
  }

  diagnostics() {
    return Array.from(this.handlers.values()).flatMap((handlers) => Array.from(handlers.values())).map(({ handler: _handler, ...item }) => item);
  }

  clearPluginRuntimeHandlers() {
    this.handlers.clear();
  }
}

export const pluginEventBus = new PluginEventBus();
