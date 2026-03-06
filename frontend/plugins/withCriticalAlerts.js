const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Expo config plugin to enable Critical Alerts capability.
 *
 * Critical Alerts allow notifications to bypass Do Not Disturb and ring even when muted.
 * Requires Apple entitlement approval (com.elboton.app is approved).
 */
function withCriticalAlerts(config) {
  // Add Critical Alerts entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.usernotifications.critical-alerts'] = true;
    return config;
  });

  // Add background mode for critical alerts (remote-notification already added)
  config = withInfoPlist(config, (config) => {
    // Ensure UIBackgroundModes includes remote-notification
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    if (!backgroundModes.includes('remote-notification')) {
      backgroundModes.push('remote-notification');
    }
    config.modResults.UIBackgroundModes = backgroundModes;
    return config;
  });

  return config;
}

module.exports = withCriticalAlerts;
