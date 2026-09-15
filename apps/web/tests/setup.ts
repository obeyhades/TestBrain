import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only unmounts between tests by itself when Vitest is running with
// global hooks. This project imports describe/it/expect explicitly instead, so the
// cleanup is registered here: without it each test renders on top of the last one
// and queries start finding two of everything.
afterEach(cleanup);
