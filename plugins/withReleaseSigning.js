const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Signs release APKs with your personal key so updates install over the top without losing data.
 *
 * Reads four values from ~/.gradle/gradle.properties (outside this repo, never committed):
 *   HEADROOM_STORE_FILE=/Users/<you>/keys/headroom-release.jks
 *   HEADROOM_STORE_PASSWORD=...
 *   HEADROOM_KEY_ALIAS=headroom
 *   HEADROOM_KEY_PASSWORD=...
 *
 * Without them, release builds fall back to the debug key. That's fine for an emulator,
 * but never install a debug-signed build on your phone: Android refuses updates signed
 * with a different key, and the only way out is uninstalling (which deletes your data).
 */
module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    let gradle = config.modResults.contents;
    if (gradle.includes('HEADROOM_STORE_FILE')) return config;

    const withSigningConfig = gradle.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        release {
            if (project.hasProperty('HEADROOM_STORE_FILE')) {
                storeFile file(HEADROOM_STORE_FILE)
                storePassword HEADROOM_STORE_PASSWORD
                keyAlias HEADROOM_KEY_ALIAS
                keyPassword HEADROOM_KEY_PASSWORD
            }
        }`,
    );

    // The template's release build type signs with the debug key; point it at ours.
    const withReleaseBuildType = withSigningConfig.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig project.hasProperty('HEADROOM_STORE_FILE') ? signingConfigs.release : signingConfigs.debug",
    );

    if (withSigningConfig === gradle || withReleaseBuildType === withSigningConfig) {
      throw new Error('withReleaseSigning: android/app/build.gradle layout changed; update plugins/withReleaseSigning.js');
    }

    config.modResults.contents = withReleaseBuildType;
    return config;
  });
};
