import { describe, expect, it, vi } from 'vitest';
import { decryptKey, encryptKey, KeyManager } from '@/lib/providers/key-manager';

describe('KeyManager', () => {
  const manager = new KeyManager('a'.repeat(64));

  it('encrypts and decrypts a key', () => {
    const encrypted = manager.encrypt('sk-test-1234567890abcdef');
    expect(encrypted).not.toContain('sk-test');
    expect(encrypted.split('.')).toHaveLength(3);
    expect(manager.decrypt(encrypted)).toBe('sk-test-1234567890abcdef');
  });

  it('produces unique ciphertext per encryption (random IV)', () => {
    const a = manager.encrypt('same-key');
    const b = manager.encrypt('same-key');
    expect(a).not.toBe(b);
  });

  it('fails to decrypt with a different secret', () => {
    const encrypted = new KeyManager('b'.repeat(64)).encrypt('secret-key');
    expect(() => manager.decrypt(encrypted)).toThrow();
  });

  it('rejects a payload with the wrong shape', () => {
    expect(() => manager.decrypt('not-a-valid-payload')).toThrow();
  });

  it('throws when constructed without a secret', () => {
    expect(() => new KeyManager('')).toThrow(/ENCRYPTION_SECRET/);
  });

  it('extracts a hint from the plaintext key', () => {
    expect(manager.hint('sk-abcdef1234')).toBe('1234');
    expect(manager.hint('ab')).toBe('****');
  });

  it('round-trips through the module-level helpers', () => {
    vi.stubEnv('ENCRYPTION_SECRET', 'c'.repeat(64));
    const enc = encryptKey('mod-level-key');
    expect(decryptKey(enc)).toBe('mod-level-key');
    vi.unstubAllEnvs();
  });
});
