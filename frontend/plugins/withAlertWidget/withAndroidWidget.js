const {
  withAndroidManifest,
  withProjectBuildGradle,
  withAppBuildGradle,
  withMainApplication,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_PROVIDER_CLASS = '.widget.AlertWidgetProvider';
const HOLD_ACTIVITY_CLASS = '.widget.WidgetHoldActivity';

function withAndroidWidget(config) {
  // Add widget dependencies to app build.gradle
  config = withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // Add dependencies if not already present
    if (!buildGradle.includes('okhttp')) {
      const dependenciesMatch = buildGradle.match(/dependencies\s*\{/);
      if (dependenciesMatch) {
        const insertIndex = dependenciesMatch.index + dependenciesMatch[0].length;
        const newDependencies = `
    // Widget dependencies
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'com.google.android.gms:play-services-location:21.0.1'
    implementation 'androidx.security:security-crypto:1.1.0-alpha06'
`;
        config.modResults.contents =
          buildGradle.slice(0, insertIndex) +
          newDependencies +
          buildGradle.slice(insertIndex);
      }
    }

    return config;
  });

  // Add widget receiver and activity to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const mainApplication = manifest.manifest.application[0];
    const packageName = config.android?.package || 'com.elboton.app';

    // Add widget provider receiver
    const widgetReceiver = {
      $: {
        'android:name': WIDGET_PROVIDER_CLASS,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
          ],
        },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/widget_alert_info',
          },
        },
      ],
    };

    // Check if receiver already exists
    const receiverExists = mainApplication.receiver?.some(
      (r) => r.$['android:name'] === WIDGET_PROVIDER_CLASS
    );

    if (!receiverExists) {
      mainApplication.receiver = mainApplication.receiver || [];
      mainApplication.receiver.push(widgetReceiver);
    }

    // Add hold activity
    const holdActivity = {
      $: {
        'android:name': HOLD_ACTIVITY_CLASS,
        'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        'android:exported': 'false',
        'android:taskAffinity': '',
        'android:excludeFromRecents': 'true',
      },
    };

    const activityExists = mainApplication.activity?.some(
      (a) => a.$['android:name'] === HOLD_ACTIVITY_CLASS
    );

    if (!activityExists) {
      mainApplication.activity = mainApplication.activity || [];
      mainApplication.activity.push(holdActivity);
    }

    return config;
  });

  // Copy Kotlin source files
  config = withProjectBuildGradle(config, async (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const androidDir = path.join(projectRoot, 'android');
    const sourceDir = path.join(__dirname, 'android');

    // Widget Kotlin files
    const widgetDir = path.join(
      androidDir,
      'app/src/main/java/com/elboton/app/widget'
    );

    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    const kotlinFiles = [
      'AlertWidgetProvider.kt',
      'WidgetHoldActivity.kt',
      'BackendApiClient.kt',
      'CredentialManager.kt',
      'LocationHelper.kt',
      'GeohashEncoder.kt',
    ];

    for (const file of kotlinFiles) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(widgetDir, file);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Native module files (SharedPreferencesModule)
    const nativeModuleDir = path.join(
      androidDir,
      'app/src/main/java/com/elboton/app'
    );

    const nativeModuleFiles = [
      'SharedPreferencesModule.kt',
      'SharedPreferencesPackage.kt',
    ];

    for (const file of nativeModuleFiles) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(nativeModuleDir, file);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Create res/xml directory for widget metadata
    const xmlDir = path.join(androidDir, 'app/src/main/res/xml');
    if (!fs.existsSync(xmlDir)) {
      fs.mkdirSync(xmlDir, { recursive: true });
    }

    // Create widget info XML
    const widgetInfoXml = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:minHeight="110dp"
    android:targetCellWidth="2"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:initialLayout="@layout/widget_alert_button"
    android:resizeMode="none"
    android:widgetCategory="home_screen"
    android:description="@string/widget_description"
    android:previewLayout="@layout/widget_alert_button" />
`;
    fs.writeFileSync(path.join(xmlDir, 'widget_alert_info.xml'), widgetInfoXml);

    // Create res/layout directory for widget layout
    const layoutDir = path.join(androidDir, 'app/src/main/res/layout');
    if (!fs.existsSync(layoutDir)) {
      fs.mkdirSync(layoutDir, { recursive: true });
    }

    // Create widget layout XML
    const widgetLayoutXml = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="8dp"
    android:background="@android:color/transparent">

    <ImageButton
        android:id="@+id/alert_button"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:layout_gravity="center"
        android:background="@drawable/widget_button_background"
        android:src="@drawable/widget_alert_icon"
        android:scaleType="centerInside"
        android:contentDescription="@string/widget_button_description" />

</FrameLayout>
`;
    fs.writeFileSync(path.join(layoutDir, 'widget_alert_button.xml'), widgetLayoutXml);

    // Create res/drawable directory for widget drawables
    const drawableDir = path.join(androidDir, 'app/src/main/res/drawable');
    if (!fs.existsSync(drawableDir)) {
      fs.mkdirSync(drawableDir, { recursive: true });
    }

    // Create button background drawable
    const buttonBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="oval">
    <solid android:color="#DC2626" />
    <stroke
        android:width="3dp"
        android:color="#991B1B" />
</shape>
`;
    fs.writeFileSync(
      path.join(drawableDir, 'widget_button_background.xml'),
      buttonBackgroundXml
    );

    // Create alert icon drawable (simple exclamation)
    const alertIconXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="48dp"
    android:height="48dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M12,2C6.48,2 2,6.48 2,12s4.48,10 10,10 10,-4.48 10,-10S17.52,2 12,2zM13,17h-2v-2h2v2zM13,13h-2L11,7h2v6z" />
</vector>
`;
    fs.writeFileSync(path.join(drawableDir, 'widget_alert_icon.xml'), alertIconXml);

    // Create/update strings.xml for widget strings
    const valuesDir = path.join(androidDir, 'app/src/main/res/values');
    const stringsPath = path.join(valuesDir, 'strings.xml');

    // Check if we need to add widget strings
    if (fs.existsSync(stringsPath)) {
      let stringsContent = fs.readFileSync(stringsPath, 'utf8');
      if (!stringsContent.includes('widget_description')) {
        // Add widget strings before closing </resources> tag
        const widgetStrings = `
    <string name="widget_description">Quick emergency alert button</string>
    <string name="widget_button_description">Hold to send emergency alert</string>
`;
        stringsContent = stringsContent.replace(
          '</resources>',
          widgetStrings + '</resources>'
        );
        fs.writeFileSync(stringsPath, stringsContent);
      }
    } else {
      // Create new strings.xml
      const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="widget_description">Quick emergency alert button</string>
    <string name="widget_button_description">Hold to send emergency alert</string>
</resources>
`;
      fs.writeFileSync(stringsPath, stringsXml);
    }

    return config;
  });

  // Register native module in MainApplication
  config = withMainApplication(config, (config) => {
    const mainApplication = config.modResults.contents;

    // Add import for SharedPreferencesPackage
    if (!mainApplication.includes('SharedPreferencesPackage')) {
      // Find the last import statement and add our import after it
      const importMatch = mainApplication.match(/import [^\n]+\n(?=\n|class|public)/);
      if (importMatch) {
        const insertIndex = importMatch.index + importMatch[0].length;
        const newImport = 'import com.elboton.app.SharedPreferencesPackage\n';
        config.modResults.contents =
          mainApplication.slice(0, insertIndex) +
          newImport +
          mainApplication.slice(insertIndex);
      }

      // Add package to getPackages()
      const updatedContent = config.modResults.contents;
      const getPackagesMatch = updatedContent.match(
        /override fun getPackages\(\): List<ReactPackage>\s*\{[^}]*return [^}]+\}/
      );

      if (getPackagesMatch) {
        // Look for PackageList().packages pattern
        if (updatedContent.includes('PackageList(this).packages')) {
          // Kotlin style with apply block or similar
          const packagesListMatch = updatedContent.match(
            /PackageList\(this\)\.packages/
          );
          if (packagesListMatch && !updatedContent.includes('SharedPreferencesPackage()')) {
            // Add to the packages list
            config.modResults.contents = updatedContent.replace(
              /PackageList\(this\)\.packages/,
              'PackageList(this).packages.apply { add(SharedPreferencesPackage()) }'
            );
          }
        }
      }
    }

    return config;
  });

  return config;
}

module.exports = withAndroidWidget;
