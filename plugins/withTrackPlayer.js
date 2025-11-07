const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to add TrackPlayer service to AndroidManifest.xml
 */
const withTrackPlayer = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];

    // Check if service already exists
    const serviceExists = application.service?.some(
      (service) => service.$['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
    );

    if (!serviceExists) {
      // Add service if it doesn't exist
      if (!application.service) {
        application.service = [];
      }

      application.service.push({
        $: {
          'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
          'android:foregroundServiceType': 'mediaPlayback',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'androidx.media3.session.MediaSessionService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withTrackPlayer;
