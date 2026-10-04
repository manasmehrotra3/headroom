const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * Removes the push notification entitlement (`aps-environment`) that expo-notifications always
 * adds on iOS.
 *
 * Headroom only schedules local notifications (the morning digest, rest timers), which need no
 * entitlement at all. Remote push does, and it is a capability a free Apple ID's personal team
 * can't sign, so leaving it in would stop the app installing on an iPhone without a paid
 * developer account.
 *
 * Order matters: config plugins that change the same file run last-registered first. This one
 * must be listed *before* expo-notifications in app.json so it runs after it and sees the key.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
