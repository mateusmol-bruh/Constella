const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');
module.exports = (config, { enabled = false } = {}) =>
  withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.$['android:usesCleartextTraffic'] = String(enabled);
    AndroidConfig.Permissions.addPermission(c.modResults, 'android.permission.INTERNET');
    return c;
  });
