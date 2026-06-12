type SlotResolver = (targetUuid: string) => Promise<string>;

class ThemeSlotRegistry {
  private resolvers = new Map<string, SlotResolver>();

  register(slotName: string, resolver: SlotResolver) {
    this.resolvers.set(slotName, resolver);
    console.log(`[ThemeSlotRegistry] Registered resolver for slot: ${slotName}`);
    return { dispose: () => { if (this.resolvers.get(slotName) === resolver) this.resolvers.delete(slotName); } };
  }

  has(slotName: string): boolean {
    return this.resolvers.has(slotName);
  }

  async resolve(slotName: string, targetUuid: string): Promise<string> {
    const resolver = this.resolvers.get(slotName);
    if (!resolver) return '';
    try {
      return await resolver(targetUuid);
    } catch (err) {
      console.error(`[ThemeSlotRegistry] Error resolving slot ${slotName} for target ${targetUuid}`, err);
      return '';
    }
  }

  async resolveAll(targetUuid: string): Promise<Record<string, string>> {
    const values: Record<string, string> = {};
    for (const slotName of this.resolvers.keys()) values[slotName] = await this.resolve(slotName, targetUuid);
    return values;
  }
}

export const themeSlotRegistry = new ThemeSlotRegistry();
