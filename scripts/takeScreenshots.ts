import { chromium } from '@playwright/test';

/**
 * Fills a running instance with a believable project and photographs it.
 *
 * A script rather than a handful of manual screenshots, so the pictures in the
 * README can be regenerated after a change instead of quietly going stale.
 *
 *   npm run db:up
 *   npm run dev
 *   npm run screenshots
 */

const APP_URL = process.env['APP_URL'] ?? 'http://localhost:3000';
const API = `${APP_URL}/api`;

const OWNER = {
  name: 'Ada Lindqvist',
  email: 'ada@example.com',
  password: 'a-long-enough-passphrase',
};

let cookie = '';

type Identified = { id: string };

async function call<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie === '' ? {} : { cookie }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const setCookie = response.headers.get('set-cookie');

  if (setCookie !== null) {
    cookie = setCookie.split(';')[0] ?? '';
  }

  if (!response.ok) {
    throw new Error(`${method} ${path} answered ${response.status}: ${await response.text()}`);
  }

  return (response.status === 204 ? null : await response.json()) as T;
}

async function signIn(): Promise<void> {
  try {
    await call<unknown>('/auth/register', 'POST', OWNER);
  } catch {
    // Already set up, which is fine: sign in instead.
    await call<unknown>('/auth/login', 'POST', { email: OWNER.email, password: OWNER.password });
  }
}

async function seed(): Promise<{
  projectId: string;
  runId: string;
  releaseId: string;
  testCaseId: string;
}> {
  const { project } = await call<{ project: Identified }>('/projects', 'POST', {
    name: 'Checkout redesign',
    description: 'Rebuilding the payment flow for the 1.4 release',
  });

  const requirementTitles = [
    'A customer can pay with a saved card',
    'A failed payment explains what went wrong',
    'Order confirmation is sent within a minute',
  ];

  const requirements = [];
  for (const title of requirementTitles) {
    const { requirement } = await call<{ requirement: Identified }>(
      `/projects/${project.id}/requirements`,
      'POST',
      {
        title,
        status: 'APPROVED',
      },
    );
    requirements.push(requirement);
  }

  const testCaseSpecs = [
    { title: 'Pay with a saved card', priority: 'CRITICAL' },
    { title: 'Declined card shows a reason', priority: 'HIGH' },
    { title: 'Confirmation email arrives', priority: 'MEDIUM' },
    { title: 'Checkout works offline', priority: 'LOW' },
    { title: 'Guest checkout', priority: 'HIGH' },
  ];

  const testCases = [];
  for (const [index, spec] of testCaseSpecs.entries()) {
    const { testCase } = await call<{ testCase: Identified }>(
      `/projects/${project.id}/test-cases`,
      'POST',
      {
        ...spec,
        preconditions: 'A customer account exists with one saved card.',
        requirementId: requirements[index % requirements.length]?.id ?? null,
        steps: [
          { action: 'Open the checkout page', expectedResult: 'The saved card is offered' },
          {
            action: 'Choose the saved card and confirm',
            expectedResult: 'The payment is accepted',
          },
          { action: 'Wait for the confirmation', expectedResult: 'An order number is shown' },
        ],
      },
    );
    testCases.push(testCase);
  }

  const { testRun } = await call<{ testRun: Identified }>(
    `/projects/${project.id}/test-runs`,
    'POST',
    {
      name: 'Regression - v1.4.0',
    },
  );

  await call<unknown>(`/projects/${project.id}/test-runs/${testRun.id}/test-cases`, 'POST', {
    testCaseIds: testCases.map((testCase) => testCase.id),
  });

  const outcomes = ['PASSED', 'PASSED', 'PASSED', 'FAILED', 'BLOCKED'] as const;

  for (const [index, testCase] of testCases.entries()) {
    await call<unknown>(
      `/projects/${project.id}/test-runs/${testRun.id}/results/${testCase.id}`,
      'PUT',
      {
        status: outcomes[index],
        ...(outcomes[index] === 'FAILED' ? { notes: 'Blank screen with no network' } : {}),
        ...(outcomes[index] === 'BLOCKED' ? { notes: 'Waiting for a test account' } : {}),
      },
    );
  }

  await call<unknown>(`/projects/${project.id}/defects`, 'POST', {
    title: 'Checkout shows a blank screen when offline',
    severity: 'CRITICAL',
    stepsToReproduce: '1. Put the device in aeroplane mode\n2. Open checkout',
    expectedResult: 'A cached view with a warning',
    actualResult: 'A blank white screen',
    environment: 'Firefox 140, Windows 11',
    testCaseId: testCases[3]?.id ?? null,
    testRunId: testRun.id,
  });

  const { release } = await call<{ release: Identified }>(
    `/projects/${project.id}/releases`,
    'POST',
    {
      name: 'Autumn release',
      version: 'v1.4.0',
      description: 'Checkout redesign and the payment fixes that go with it',
      status: 'IN_TESTING',
      targetDate: '2026-10-01',
    },
  );

  await call<unknown>(`/projects/${project.id}/releases/${release.id}/test-runs`, 'PUT', {
    testRunIds: [testRun.id],
  });

  return {
    projectId: project.id,
    runId: testRun.id,
    releaseId: release.id,
    testCaseId: testCases[0]?.id ?? '',
  };
}

async function main(): Promise<void> {
  await signIn();
  const ids = await seed();

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
  });

  await page.goto(`${APP_URL}/login`);
  await page.getByLabel('Email').fill(OWNER.email);
  await page.getByLabel('Password').fill(OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('heading', { name: 'Projects' }).waitFor();

  const shots: [string, string][] = [
    ['projects', '/projects'],
    ['test-cases', `/projects/${ids.projectId}/test-cases`],
    ['test-case', `/projects/${ids.projectId}/test-cases/${ids.testCaseId}`],
    ['test-run', `/projects/${ids.projectId}/test-runs/${ids.runId}`],
    ['release', `/projects/${ids.projectId}/releases/${ids.releaseId}`],
  ];

  for (const [name, path] of shots) {
    await page.goto(`${APP_URL}${path}`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
    console.log(`docs/screenshots/${name}.png`);
  }

  await browser.close();
}

// Not top-level await: the repository root is CommonJS, so this file is loaded as
// CommonJS and top-level await is not available there.
main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
