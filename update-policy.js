export function compareVersions(a, b) {
  if (!/^\d+\.\d+\.\d+$/.test(a || '') || !/^\d+\.\d+\.\d+$/.test(b || '')) return null;
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function updatePolicy(installed, release, seen) {
  if (!release?.published || compareVersions(release.available_version, installed) !== 1) return null;
  const required = compareVersions(release.minimum_version, installed) === 1
    && compareVersions(release.minimum_version, release.available_version) !== 1;
  if (!required && seen === release.available_version) return null;
  return { version: release.available_version, required };
}
