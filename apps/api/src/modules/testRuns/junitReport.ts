import { XMLParser } from 'fast-xml-parser';

export type ParsedTestResult = {
  /** The test's name as the tool that ran it reported it. */
  name: string;
  status: 'PASSED' | 'FAILED' | 'BLOCKED';
  /** The failure message, or why it was skipped. */
  message: string | null;
};

/**
 * Reads a JUnit XML report, the format nearly every test runner can write
 * (Playwright, Jest, Vitest, pytest, JUnit itself...).
 *
 * Only three things are read from it: each test's name, whether it failed or was
 * skipped, and the message that came with that. Timings, suites and properties
 * are ignored on purpose. A skipped test becomes BLOCKED: it was in the plan and
 * could not be checked, which is exactly what blocked means here.
 */
export function parseJUnitReport(xml: string): ParsedTestResult[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    // Always arrays, whether there is one or many, so the code below does not
    // have to care about the difference.
    isArray: (name) => ['testsuite', 'testcase', 'failure', 'error', 'skipped'].includes(name),
  });

  let document: unknown;

  try {
    document = parser.parse(xml);
  } catch {
    throw new JUnitReportError('The file is not well-formed XML');
  }

  const suites = collectSuites(document);

  if (suites.length === 0) {
    throw new JUnitReportError('No <testsuite> elements found. Is this a JUnit XML report?');
  }

  return suites.flatMap((suite) => asArray(suite['testcase']).map(toResult));
}

export class JUnitReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JUnitReportError';
  }
}

type XmlNode = Record<string, unknown>;

function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null;
}

/**
 * An element with only text inside, or nothing at all, comes back from the parser
 * as a bare string rather than an object. `<failure>boom</failure>` and
 * `<skipped/>` both do this. They are turned into nodes here so nothing else has
 * to know.
 */
function asNode(value: unknown): XmlNode | null {
  if (isNode(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return { '#text': value };
  }

  return null;
}

function asArray(value: unknown): XmlNode[] {
  const values = Array.isArray(value) ? value : [value];

  return values.map(asNode).filter((node): node is XmlNode => node !== null);
}

/**
 * A report is either <testsuites> wrapping <testsuite>s, or a single <testsuite>
 * at the top. Suites can also nest. This walks all of it.
 */
function collectSuites(document: unknown): XmlNode[] {
  if (!isNode(document)) {
    return [];
  }

  const found: XmlNode[] = [];

  const roots = [
    ...asArray(document['testsuite']),
    ...asArray(document['testsuites']).flatMap((wrapper) => asArray(wrapper['testsuite'])),
  ];

  for (const suite of roots) {
    found.push(suite);
    found.push(...collectSuites({ testsuite: suite['testsuite'] }));
  }

  return found;
}

function toResult(testcase: XmlNode): ParsedTestResult {
  const name = String(testcase['name'] ?? '').trim();

  const failure = asArray(testcase['failure'])[0] ?? asArray(testcase['error'])[0];
  const skipped = asArray(testcase['skipped'])[0];

  if (failure !== undefined) {
    return { name, status: 'FAILED', message: messageOf(failure) };
  }

  if (skipped !== undefined) {
    return { name, status: 'BLOCKED', message: messageOf(skipped) };
  }

  return { name, status: 'PASSED', message: null };
}

/** The message attribute if there is one, otherwise the element's text. */
function messageOf(element: XmlNode | undefined): string | null {
  if (element === undefined) {
    return null;
  }

  const fromAttribute = element['message'];

  if (typeof fromAttribute === 'string' && fromAttribute.trim() !== '') {
    return fromAttribute.trim();
  }

  const text = element['#text'];

  if (typeof text === 'string' && text.trim() !== '') {
    return text.trim().split('\n')[0] ?? null;
  }

  return null;
}
