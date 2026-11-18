import { parseCorsOrigins } from './origin.util';

describe('parseCorsOrigins', () => {
  it('uses the local web app as the default origin', () => {
    expect(parseCorsOrigins(undefined)).toEqual(['http://localhost:3001']);
  });

  it('normalizes and deduplicates configured origins', () => {
    expect(
      parseCorsOrigins(
        ' https://APP.example.com/,https://app.example.com,http://localhost:3001 ',
      ),
    ).toEqual(['https://app.example.com', 'http://localhost:3001']);
  });

  it.each([
    '*',
    'https://app.example.com/path',
    'https://user:password@app.example.com',
    'ftp://app.example.com',
  ])('rejects invalid CORS origin configuration: %s', (origin) => {
    expect(() => parseCorsOrigins(origin)).toThrow('Invalid CORS_ORIGIN entry');
  });
});
