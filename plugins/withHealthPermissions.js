const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Declares the Health Connect read permissions in AndroidManifest.xml. Health Connect only
 * offers permissions the manifest declares, so anything missing here can't be granted.
 * Keep this list in step with READ_TYPES in src/sources/healthConnect.ts.
 */
const HEALTH_PERMISSIONS = [
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_RESTING_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_SLEEP',
  'android.permission.health.READ_STEPS',
  'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
  'android.permission.health.READ_DISTANCE',
  'android.permission.health.READ_WEIGHT',
  'android.permission.health.READ_VO2_MAX',
  'android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND',
  'android.permission.health.READ_HEALTH_DATA_HISTORY',
];

module.exports = function withHealthPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] ?? [];
    const existing = new Set(manifest['uses-permission'].map((p) => p.$['android:name']));
    for (const name of HEALTH_PERMISSIONS) {
      if (!existing.has(name)) manifest['uses-permission'].push({ $: { 'android:name': name } });
    }
    // Lets the app check whether the Health Connect provider is installed (Android 13 and below).
    manifest.queries = manifest.queries ?? [];
    const hasQuery = manifest.queries.some((q) => (q.package ?? []).some((p) => p.$['android:name'] === 'com.google.android.apps.healthdata'));
    if (!hasQuery) manifest.queries.push({ package: [{ $: { 'android:name': 'com.google.android.apps.healthdata' } }] });
    return config;
  });
};
