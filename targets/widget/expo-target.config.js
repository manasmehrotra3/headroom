/**
 * The iOS home and lock screen widget: steps against your goal and the latest VO2 max, the same
 * two numbers as the Android widget. Generated into the Xcode project by @bacons/apple-targets on
 * every `expo prebuild`, so edit the files in this folder, never the copies under ios/.
 *
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: 'widget',
  name: 'HeadroomWidget',
  displayName: 'Headroom',
  bundleIdentifier: '.widget',
  // iOS 17 brings the widget background API and the lock screen gauge styles used here.
  deploymentTarget: '17.0',
  colors: {
    $accent: '#4ADE80',
    $widgetBackground: '#0B0A10',
  },
  entitlements: {
    // The same App Group as the app, which is how the app hands the widget its numbers.
    'com.apple.security.application-groups': config.ios.entitlements['com.apple.security.application-groups'],
  },
});
