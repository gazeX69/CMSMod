import { eq, like } from 'drizzle-orm';
import { db } from '../database/client.js';
import { settings } from '../database/schema.js';
import { pluginEventBus } from '../plugins/pluginEventBus.js';

export async function getSetting(key: string, defaultValue?: string) {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

  if (rows.length > 0) return rows[0].value;
  if (defaultValue === undefined) return null;

  await setSetting(key, defaultValue, {
    group: key.split('.')[0] || 'general',
    type: 'string',
    isPublic: true,
  });

  return defaultValue;
}

export async function getSettingWithFallback(key: string, defaultValue: string, legacyKeys: string[] = []) {
  const value = await getSetting(key);
  if (value !== null) return value;

  for (const legacyKey of legacyKeys) {
    const legacyValue = await getSetting(legacyKey);
    if (legacyValue !== null) {
      await setSetting(key, legacyValue, {
        group: key.split('.')[0] || 'general',
      });
      return legacyValue;
    }
  }

  return getSetting(key, defaultValue);
}

export async function setSetting(
  key: string,
  value: string,
  options: {
    description?: string | null;
    group?: string;
    type?: string;
    isPublic?: boolean;
    source?: string;
  } = {}
) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  const group = options.group || existing[0]?.group || key.split('.')[0] || 'general';

  if (existing.length > 0) {
    await db
      .update(settings)
      .set({
        value,
        description: options.description ?? existing[0].description,
        group,
        type: options.type || existing[0].type,
        isPublic: options.isPublic ?? existing[0].isPublic,
        updatedAt: new Date(),
      })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({
      key,
      value,
      description: options.description || null,
      group,
      type: options.type || 'string',
      isPublic: options.isPublic ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await pluginEventBus.emit('settings.updated', { key, group }, options.source || 'settings-system');
}

export async function getPublicSettings() {
  return db.select().from(settings).where(eq(settings.isPublic, true));
}

export async function getSettingsByScope(scope: string) {
  return db.select().from(settings).where(like(settings.key, `${scope}.%`));
}

export function createSettingsSdk(source: string) {
  return {
    get: (key: string, defaultValue?: string) => getSetting(key, defaultValue),
    getWithFallback: (key: string, defaultValue: string, legacyKeys: string[] = []) =>
      getSettingWithFallback(key, defaultValue, legacyKeys),
    set: (key: string, value: string, options: Parameters<typeof setSetting>[2] = {}) =>
      setSetting(key, value, { ...options, source }),
    getPublic: getPublicSettings,
    getByScope: getSettingsByScope,
  };
}
