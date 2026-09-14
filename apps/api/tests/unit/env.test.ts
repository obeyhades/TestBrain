import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const validEnv = {
  DATABASE_URL: 'postgresql://testbrain:testbrain@localhost:5432/testbrain',
  SESSION_SECRET: 'a'.repeat(32),
  APP_URL: 'http://localhost:3000',
};

describe('loadEnv', () => {
  it('returns the parsed configuration when every variable is valid', () => {
    const env = loadEnv({ ...validEnv, NODE_ENV: 'test', PORT: '5000' });

    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(5000);
    expect(env.APP_URL).toBe('http://localhost:3000');
  });

  it('defaults NODE_ENV to development and PORT to 4000', () => {
    const env = loadEnv({ ...validEnv });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
  });

  it('throws when DATABASE_URL is missing', () => {
    expect(() =>
      loadEnv({ SESSION_SECRET: validEnv.SESSION_SECRET, APP_URL: validEnv.APP_URL }),
    ).toThrow(/DATABASE_URL/);
  });

  it('throws when SESSION_SECRET is too short to be safe', () => {
    expect(() => loadEnv({ ...validEnv, SESSION_SECRET: 'short' })).toThrow(
      /at least 32 characters/,
    );
  });

  it('throws when APP_URL is not a URL', () => {
    expect(() => loadEnv({ ...validEnv, APP_URL: 'localhost' })).toThrow(/APP_URL/);
  });
});
