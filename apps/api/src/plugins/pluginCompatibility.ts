export const PLATFORM_VERSION = '0.1.0';

function parse(version: string) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return match.slice(1).map(Number) as [number, number, number];
}

export function isPluginCompatible(range: string | undefined, platformVersion = PLATFORM_VERSION) {
  if (!range || range === '*') return true;
  const current = parse(platformVersion);
  const expected = parse(range.startsWith('^') ? range.slice(1) : range);
  if (!current || !expected) return false;
  if (!range.startsWith('^')) return current.every((value, index) => value === expected[index]);
  if (expected[0] === 0) return current[0] === 0 && current[1] === expected[1] && current[2] >= expected[2];
  return current[0] === expected[0] && (current[1] > expected[1] || (current[1] === expected[1] && current[2] >= expected[2]));
}

export function assertPluginCompatible(pluginKey: string, range: string | undefined) {
  if (!isPluginCompatible(range)) throw new Error(`Plugin ${pluginKey} requires platform ${range || 'unknown'}, current platform is ${PLATFORM_VERSION}`);
}
