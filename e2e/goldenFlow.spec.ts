import { expect, test, type Page } from '@playwright/test';

/**
 * The trail the whole product exists for, walked end to end in a browser:
 *
 *   requirement -> test case -> test run -> failed result -> defect -> release
 *
 * If this passes, the product does the thing it is for.
 */

const OWNER = {
  name: 'Abdun',
  email: 'owner@example.com',
  password: 'a-long-enough-passphrase',
};

async function registerOwner(page: Page) {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Set up TestBrain' })).toBeVisible();

  await page.getByLabel('Name').fill(OWNER.name);
  await page.getByLabel('Email').fill(OWNER.email);
  await page.getByLabel('Password').fill(OWNER.password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
}

test('a failed test becomes a defect, and the defect holds back the release', async ({ page }) => {
  await registerOwner(page);

  await test.step('create a project', async () => {
    await page.getByRole('button', { name: 'New project' }).click();
    await page.getByLabel('Name').fill('Checkout redesign');
    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page.getByRole('heading', { name: 'Checkout redesign' })).toBeVisible();
  });

  await test.step('write down what the product should do', async () => {
    await page.getByRole('link', { name: 'Requirements' }).click();
    await page.getByRole('button', { name: 'New requirement' }).click();
    await page.getByLabel('Title').fill('User can log in');
    await page.getByRole('button', { name: 'Create requirement' }).click();

    // Creating something takes you to it.
    await expect(page.getByLabel('Title')).toHaveValue('User can log in');
  });

  await test.step('write a test case, and give it a step', async () => {
    await page.getByRole('link', { name: 'Test cases' }).click();
    await page.getByRole('button', { name: 'New test case' }).click();
    await page.getByLabel('Title').fill('Login with valid credentials');
    await page.getByRole('button', { name: 'Create test case' }).click();

    await page.getByLabel('Verifies requirement').selectOption({ label: 'User can log in' });

    await page.getByRole('button', { name: 'Add step' }).click();
    await page.getByRole('textbox', { name: 'Action' }).fill('Open the login page');
    await page.getByRole('textbox', { name: 'Expected result' }).fill('The login form is shown');

    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByRole('status')).toHaveText('Saved.');
  });

  await test.step('run the test and watch it fail', async () => {
    await page.getByRole('link', { name: 'Test runs' }).click();
    await page.getByRole('button', { name: 'New test run' }).click();
    await page.getByLabel('Name').fill('Regression - v1.4.0');
    await page.getByRole('button', { name: 'Create test run' }).click();

    await page.getByLabel('Login with valid credentials').check();
    await page.getByRole('button', { name: 'Add to run' }).click();

    await page.getByRole('button', { name: 'Failed' }).click();

    await expect(page.getByText('Failed:').locator('xpath=following-sibling::dd')).toHaveText('1');
  });

  await test.step('report a defect from the failed test', async () => {
    await page.getByRole('link', { name: 'Report defect' }).click();

    // The link brought the test case and the run along with it.
    await expect(page.getByLabel('Found in test case')).toHaveValue(/.+/);
    await expect(page.getByLabel('Found in test run')).toHaveValue(/.+/);

    await page.getByLabel('Title').fill('Login shows a blank page');
    await page.getByLabel('Severity').selectOption('CRITICAL');
    await page.getByRole('button', { name: 'Report defect' }).click();

    await expect(page.getByText('Reported by Abdun')).toBeVisible();
  });

  await test.step('the release is held back by both problems', async () => {
    await page.getByRole('link', { name: 'Releases' }).click();
    await page.getByRole('button', { name: 'New release' }).click();
    await page.getByLabel('Name').fill('Autumn release');
    await page.getByLabel('Version').fill('v1.4.0');
    await page.getByRole('button', { name: 'Create release' }).click();

    await page.getByLabel(/Regression - v1\.4\.0/).check();
    await page.getByRole('button', { name: 'Save test runs' }).click();

    await expect(page.getByText('Not ready to release')).toBeVisible();
    await expect(page.getByText('1 critical defect is still unresolved')).toBeVisible();
    await expect(page.getByText('1 test is failing')).toBeVisible();
  });
});
