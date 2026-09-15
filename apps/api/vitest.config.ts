import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    // The integration tests share one database and empty it between tests, so two
    // files running at the same time would delete each other's rows. Running files
    // one after another keeps the suite deterministic; it is the whole reason this
    // setting is here, and the cost at this size is a couple of seconds.
    fileParallelism: false,
  },
});
