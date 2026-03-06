const { withPlugins } = require('@expo/config-plugins');
const withIOSWidget = require('./withIOSWidget');
const withAndroidWidget = require('./withAndroidWidget');

/**
 * Expo config plugin to add home screen widget support for iOS and Android.
 *
 * iOS: Adds WidgetKit extension with interactive button (iOS 17+)
 * Android: Adds AppWidgetProvider with hold-to-alert activity
 */
function withAlertWidget(config, props = {}) {
  const {
    appGroupIdentifier = 'group.com.elboton.app',
    iosDeploymentTarget = '17.0',
  } = props;

  // Apply iOS widget modifications
  config = withIOSWidget(config, {
    appGroupIdentifier,
    deploymentTarget: iosDeploymentTarget,
  });

  // Apply Android widget modifications
  config = withAndroidWidget(config);

  return config;
}

module.exports = withAlertWidget;
