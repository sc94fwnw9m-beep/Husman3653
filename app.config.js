const { withGradleProperties } = require('expo/config-plugins');

// Enable R8 only for native Android release builds.
module.exports = ({ config }) =>
  withGradleProperties(config, (androidConfig) => {
    const properties = {
      'android.enableMinifyInReleaseBuilds': 'true',
      'android.enableShrinkResourcesInReleaseBuilds': 'true',
    };

    for (const [key, value] of Object.entries(properties)) {
      androidConfig.modResults = androidConfig.modResults.filter(
        (entry) => entry.type !== 'property' || entry.key !== key
      );
      androidConfig.modResults.push({ type: 'property', key, value });
    }

    return androidConfig;
  });
