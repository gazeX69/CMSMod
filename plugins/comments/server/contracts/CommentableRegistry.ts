export interface CommentableValidator {
  isEnabled: (uuid: string) => Promise<boolean>;
  getTitle?: (uuid: string) => Promise<string>;
}

class CommentableRegistry {
  private validators = new Map<string, CommentableValidator>();

  register(type: string, validator: CommentableValidator) {
    this.validators.set(type.toLowerCase(), validator);
    console.log(`[comments] Registered commentable target type: ${type}`);
  }

  isRegistered(type: string): boolean {
    return this.validators.has(type.toLowerCase());
  }

  async validate(type: string, uuid: string): Promise<boolean> {
    const validator = this.validators.get(type.toLowerCase());
    if (!validator) {
      return false;
    }
    try {
      return await validator.isEnabled(uuid);
    } catch (err) {
      console.error(`[comments] Error validating target ${type}:${uuid}`, err);
      return false;
    }
  }

  async getTitle(type: string, uuid: string): Promise<string> {
    const validator = this.validators.get(type.toLowerCase());
    if (validator && validator.getTitle) {
      try {
        return await validator.getTitle(uuid);
      } catch (err) {
        // Fallback
      }
    }
    return `${type} (${uuid})`;
  }
}

export const commentableRegistry = new CommentableRegistry();
