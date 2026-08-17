import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Key manager for provider API keys. Keys are encrypted at rest with
 * AES-256-GCM using a secret derived from ENCRYPTION_SECRET. Keys are only
 * decrypted in memory for the duration of an API call and are never logged
 * or returned by API routes.
 */
export class KeyManager {
  private readonly secret: string;

  constructor(secret: string = process.env.ENCRYPTION_SECRET ?? '') {
    if (secret.length < 32) {
      throw new Error(
        'ENCRYPTION_SECRET must be set (32+ chars). Generate one with: openssl rand -hex 32',
      );
    }
    this.secret = secret;
  }

  private deriveKey(): Buffer {
    return createHash('sha256').update(this.secret).digest();
  }

  /**
   * Encrypts a plaintext API key. Returns a `iv.tag.ciphertext` base64 payload.
   */
  encrypt(plainKey: string): string {
    const key = this.deriveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
  }

  /**
   * Decrypts a key that was encrypted with {@link encrypt}. Throws when the
   * payload is malformed or the secret has changed (GCM auth failure).
   */
  decrypt(payload: string): string {
    const parts = payload.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key payload');
    }
    const [ivB64, tagB64, dataB64] = parts;
    const key = this.deriveKey();
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]);
    return plain.toString('utf8');
  }

  /**
   * Returns the last 4 characters of the plaintext key for display, or
   * "****" for keys shorter than 4 characters.
   */
  hint(plainKey: string): string {
    const trimmed = plainKey.trim();
    return trimmed.length > 4 ? trimmed.slice(-4) : '****';
  }
}

/**
 * Lazy singleton that defers secret validation until the first actual use,
 * so importing this module never throws at load time.
 */
export class LazyKeyManager {
  private instance: KeyManager | null = null;

  private get(): KeyManager {
    if (!this.instance) {
      this.instance = new KeyManager();
    }
    return this.instance;
  }

  encrypt(plainKey: string): string {
    return this.get().encrypt(plainKey);
  }

  decrypt(payload: string): string {
    return this.get().decrypt(payload);
  }

  hint(plainKey: string): string {
    return this.get().hint(plainKey);
  }
}

export const keyManager = new LazyKeyManager();

export function encryptKey(plainKey: string): string {
  return keyManager.encrypt(plainKey);
}

export function decryptKey(payload: string): string {
  return keyManager.decrypt(payload);
}

export function keyHint(plainKey: string): string {
  return keyManager.hint(plainKey);
}
