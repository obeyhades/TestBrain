import { describe, expect, it } from 'vitest';
import { JUnitReportError, parseJUnitReport } from '../../src/modules/testRuns/junitReport.js';

describe('parseJUnitReport', () => {
  it('reads a report the way Playwright writes one', () => {
    const results = parseJUnitReport(`<?xml version="1.0" encoding="UTF-8"?>
      <testsuites id="" name="" tests="3" failures="1" skipped="1" time="4.2">
        <testsuite name="checkout.spec.ts" tests="3" failures="1" skipped="1">
          <testcase name="Pay with a saved card" classname="checkout.spec.ts" time="1.1"/>
          <testcase name="Declined card shows a reason" classname="checkout.spec.ts" time="0.9">
            <failure message="expect(locator).toBeVisible() failed" type="FAILURE">
              Error: expect(locator).toBeVisible() failed
                at checkout.spec.ts:24:5
            </failure>
          </testcase>
          <testcase name="Guest checkout" classname="checkout.spec.ts" time="0">
            <skipped/>
          </testcase>
        </testsuite>
      </testsuites>`);

    expect(results).toEqual([
      { name: 'Pay with a saved card', status: 'PASSED', message: null },
      {
        name: 'Declined card shows a reason',
        status: 'FAILED',
        message: 'expect(locator).toBeVisible() failed',
      },
      { name: 'Guest checkout', status: 'BLOCKED', message: null },
    ]);
  });

  it('accepts a single <testsuite> at the top, without a <testsuites> wrapper', () => {
    const results = parseJUnitReport(`
      <testsuite name="pytest" tests="1">
        <testcase name="test_login" classname="tests.test_auth"/>
      </testsuite>`);

    expect(results).toEqual([{ name: 'test_login', status: 'PASSED', message: null }]);
  });

  it('walks suites nested inside suites', () => {
    const results = parseJUnitReport(`
      <testsuites>
        <testsuite name="outer">
          <testcase name="in the outer suite"/>
          <testsuite name="inner">
            <testcase name="in the inner suite"/>
          </testsuite>
        </testsuite>
      </testsuites>`);

    expect(results.map((result) => result.name)).toEqual([
      'in the outer suite',
      'in the inner suite',
    ]);
  });

  it('treats an <error> the same as a <failure>', () => {
    const results = parseJUnitReport(`
      <testsuite>
        <testcase name="crashes">
          <error message="TypeError: cannot read properties of undefined"/>
        </testcase>
      </testsuite>`);

    expect(results[0]).toEqual({
      name: 'crashes',
      status: 'FAILED',
      message: 'TypeError: cannot read properties of undefined',
    });
  });

  it('falls back to the first line of the failure text when there is no message attribute', () => {
    const results = parseJUnitReport(`
      <testsuite>
        <testcase name="no attribute">
          <failure>AssertionError: expected 200 to be 404
            at api.test.ts:10:3</failure>
        </testcase>
      </testsuite>`);

    expect(results[0]?.message).toBe('AssertionError: expected 200 to be 404');
  });

  it('keeps the reason a test was skipped', () => {
    const results = parseJUnitReport(`
      <testsuite>
        <testcase name="needs a real device">
          <skipped message="no device attached"/>
        </testcase>
      </testsuite>`);

    expect(results[0]).toEqual({
      name: 'needs a real device',
      status: 'BLOCKED',
      message: 'no device attached',
    });
  });

  it('handles a suite with no test cases at all', () => {
    expect(parseJUnitReport('<testsuite name="empty" tests="0"/>')).toEqual([]);
  });

  it('refuses something that is not XML', () => {
    expect(() => parseJUnitReport('{"not": "xml"}')).toThrow(JUnitReportError);
  });

  it('refuses XML that has no test suites in it', () => {
    expect(() => parseJUnitReport('<html><body>hello</body></html>')).toThrow(
      /No <testsuite> elements found/,
    );
  });
});
