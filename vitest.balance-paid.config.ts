import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  test: { environment: 'node', include: ['tests/unit/balance-paid-*.test.ts', 'tests/unit/balance-paid-*.test.tsx', 'tests/unit/ledger-chapter-save-refresh.test.tsx'] },
  resolve: { alias: [
    { find: './payment-projection-source.server', replacement: path.join(root, 'tests/fixtures/payment-source-empty.ts') },
    { find: '@', replacement: path.join(root, 'src') },
  ] },
});
