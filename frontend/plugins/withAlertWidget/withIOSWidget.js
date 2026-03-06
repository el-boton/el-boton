const {
  withXcodeProject,
  withEntitlementsPlist,
  withInfoPlist,
  IOSConfig,
} = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const WIDGET_NAME = 'ElBotonWidget';
const WIDGET_BUNDLE_ID_SUFFIX = '.widget';

function withIOSWidget(config, props) {
  const { appGroupIdentifier, deploymentTarget } = props;

  // Add App Groups entitlement to main app
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [appGroupIdentifier];
    return config;
  });

  // Add widget extension to Xcode project
  config = withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults;
    const asPbxRef = (value, comment) => ({ value, comment });

    // Validate xcode project structure exists
    if (!xcodeProject?.hash?.project?.objects) {
      console.warn('[withIOSWidget] Xcode project structure not ready, skipping widget setup');
      return config;
    }

    const bundleIdentifier = config.ios?.bundleIdentifier || 'com.elboton.app';
    const widgetBundleId = bundleIdentifier + WIDGET_BUNDLE_ID_SUFFIX;
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;

    // Create widget extension directory
    const widgetDir = path.join(platformProjectRoot, WIDGET_NAME);
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true });
    }

    // Copy Swift source files for widget
    const sourceDir = path.join(__dirname, 'ios');
    const swiftFiles = [
      'ElBotonWidget.swift',
      'ElBotonWidgetBundle.swift',
      'AlertIntent.swift',
      'SharedCredentials.swift',
      'BackendAPIClient.swift',
      'LocationManager.swift',
      'Geohash.swift',
    ];

    for (const file of swiftFiles) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(widgetDir, file);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Copy native module files to main app for RN credential sync
    const appName = config.modRequest.projectName || 'ElBoton';
    const mainAppDir = path.join(platformProjectRoot, appName);
    if (!fs.existsSync(mainAppDir)) {
      fs.mkdirSync(mainAppDir, { recursive: true });
    }

    const nativeModuleFiles = [
      'SharedKeychainModule.swift',
      'SharedKeychainModule.m',
    ];

    for (const file of nativeModuleFiles) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(mainAppDir, file);
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Create widget Info.plist
    const widgetInfoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>El Boton</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
        <key>NSExtensionPointIdentifier</key>
        <string>com.apple.widgetkit-extension</string>
    </dict>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>El Boton needs your location to send help to the right place when you trigger an alert.</string>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, 'Info.plist'), widgetInfoPlist);

    // Create widget entitlements
    const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${appGroupIdentifier}</string>
    </array>
</dict>
</plist>`;
    fs.writeFileSync(path.join(widgetDir, `${WIDGET_NAME}.entitlements`), widgetEntitlements);

    // Add widget target to Xcode project
    const targetUuid = xcodeProject.generateUuid();
    const productUuid = xcodeProject.generateUuid();
    const buildConfigListUuid = xcodeProject.generateUuid();
    const debugBuildConfigUuid = xcodeProject.generateUuid();
    const releaseBuildConfigUuid = xcodeProject.generateUuid();

    // Add PBXGroup for widget files
    const widgetGroupUuid = xcodeProject.generateUuid();

    // Ensure PBXGroup exists
    if (!xcodeProject.hash.project.objects.PBXGroup) {
      xcodeProject.hash.project.objects.PBXGroup = {};
    }

    const mainGroupUuid = Object.keys(xcodeProject.hash.project.objects.PBXGroup).find(
      (key) => {
        const group = xcodeProject.hash.project.objects.PBXGroup[key];
        return group && typeof group === 'object' && group.name === undefined && group.path === undefined;
      }
    );

    // Create file references for Swift files
    const fileRefs = {};
    const buildFiles = {};

    // Ensure required object types exist
    if (!xcodeProject.hash.project.objects.PBXFileReference) {
      xcodeProject.hash.project.objects.PBXFileReference = {};
    }
    if (!xcodeProject.hash.project.objects.PBXBuildFile) {
      xcodeProject.hash.project.objects.PBXBuildFile = {};
    }
    if (!xcodeProject.hash.project.objects.XCBuildConfiguration) {
      xcodeProject.hash.project.objects.XCBuildConfiguration = {};
    }
    if (!xcodeProject.hash.project.objects.XCConfigurationList) {
      xcodeProject.hash.project.objects.XCConfigurationList = {};
    }

    for (const file of swiftFiles) {
      const fileRefUuid = xcodeProject.generateUuid();
      const buildFileUuid = xcodeProject.generateUuid();
      fileRefs[file] = fileRefUuid;
      buildFiles[file] = buildFileUuid;

      xcodeProject.hash.project.objects.PBXFileReference[fileRefUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'sourcecode.swift',
        path: file,
        sourceTree: '"<group>"',
      };
      xcodeProject.hash.project.objects.PBXFileReference[fileRefUuid + '_comment'] = file;
    }

    // Add Info.plist file reference
    const infoPlistRefUuid = xcodeProject.generateUuid();
    xcodeProject.hash.project.objects.PBXFileReference[infoPlistRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.xml',
      path: 'Info.plist',
      sourceTree: '"<group>"',
    };
    xcodeProject.hash.project.objects.PBXFileReference[infoPlistRefUuid + '_comment'] = 'Info.plist';

    // Add entitlements file reference
    const entitlementsRefUuid = xcodeProject.generateUuid();
    xcodeProject.hash.project.objects.PBXFileReference[entitlementsRefUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'text.plist.entitlements',
      path: `${WIDGET_NAME}.entitlements`,
      sourceTree: '"<group>"',
    };
    xcodeProject.hash.project.objects.PBXFileReference[entitlementsRefUuid + '_comment'] = `${WIDGET_NAME}.entitlements`;

    // Create widget group
    xcodeProject.hash.project.objects.PBXGroup[widgetGroupUuid] = {
      isa: 'PBXGroup',
      children: [
        ...swiftFiles.map((file) => asPbxRef(fileRefs[file], file)),
        asPbxRef(infoPlistRefUuid, 'Info.plist'),
        asPbxRef(entitlementsRefUuid, `${WIDGET_NAME}.entitlements`),
      ],
      path: WIDGET_NAME,
      sourceTree: '"<group>"',
    };
    xcodeProject.hash.project.objects.PBXGroup[widgetGroupUuid + '_comment'] = WIDGET_NAME;

    // Add widget group to main group
    if (mainGroupUuid) {
      const mainGroup = xcodeProject.hash.project.objects.PBXGroup[mainGroupUuid];
      if (mainGroup && typeof mainGroup === 'object') {
        if (!Array.isArray(mainGroup.children)) {
          mainGroup.children = [];
        }
        mainGroup.children.push(asPbxRef(widgetGroupUuid, WIDGET_NAME));
      }
    }

    // Create PBXBuildFile entries for source files
    const sourcesBuildPhaseUuid = xcodeProject.generateUuid();
    const sourceBuildFileUuids = [];

    for (const file of swiftFiles) {
      const buildFileUuid = buildFiles[file];
      xcodeProject.hash.project.objects.PBXBuildFile[buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: fileRefs[file],
      };
      xcodeProject.hash.project.objects.PBXBuildFile[buildFileUuid + '_comment'] = `${file} in Sources`;
      sourceBuildFileUuids.push(asPbxRef(buildFileUuid, `${file} in Sources`));
    }

    // Create Sources build phase
    xcodeProject.hash.project.objects.PBXSourcesBuildPhase = xcodeProject.hash.project.objects.PBXSourcesBuildPhase || {};
    xcodeProject.hash.project.objects.PBXSourcesBuildPhase[sourcesBuildPhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: sourceBuildFileUuids,
      runOnlyForDeploymentPostprocessing: 0,
    };
    xcodeProject.hash.project.objects.PBXSourcesBuildPhase[sourcesBuildPhaseUuid + '_comment'] = 'Sources';

    // Create Frameworks build phase
    const frameworksBuildPhaseUuid = xcodeProject.generateUuid();
    xcodeProject.hash.project.objects.PBXFrameworksBuildPhase = xcodeProject.hash.project.objects.PBXFrameworksBuildPhase || {};
    xcodeProject.hash.project.objects.PBXFrameworksBuildPhase[frameworksBuildPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    xcodeProject.hash.project.objects.PBXFrameworksBuildPhase[frameworksBuildPhaseUuid + '_comment'] = 'Frameworks';

    // Create Resources build phase
    const resourcesBuildPhaseUuid = xcodeProject.generateUuid();
    xcodeProject.hash.project.objects.PBXResourcesBuildPhase = xcodeProject.hash.project.objects.PBXResourcesBuildPhase || {};
    xcodeProject.hash.project.objects.PBXResourcesBuildPhase[resourcesBuildPhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    xcodeProject.hash.project.objects.PBXResourcesBuildPhase[resourcesBuildPhaseUuid + '_comment'] = 'Resources';

    // Create build configurations for widget
    const commonBuildSettings = {
      ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
      ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: 'WidgetBackground',
      CLANG_ANALYZER_NONNULL: 'YES',
      CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
      CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
      CLANG_ENABLE_OBJC_WEAK: 'YES',
      CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
      CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: 'YES',
      CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
      CODE_SIGN_ENTITLEMENTS: `${WIDGET_NAME}/${WIDGET_NAME}.entitlements`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: '1',
      GENERATE_INFOPLIST_FILE: 'YES',
      INFOPLIST_FILE: `${WIDGET_NAME}/Info.plist`,
      INFOPLIST_KEY_CFBundleDisplayName: '"El Boton"',
      INFOPLIST_KEY_NSHumanReadableCopyright: '""',
      IPHONEOS_DEPLOYMENT_TARGET: deploymentTarget,
      LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
      MARKETING_VERSION: '1.0',
      PRODUCT_BUNDLE_IDENTIFIER: widgetBundleId,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SKIP_INSTALL: 'YES',
      SWIFT_EMIT_LOC_STRINGS: 'YES',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1"',
    };

    xcodeProject.hash.project.objects.XCBuildConfiguration[debugBuildConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
        DEBUG_INFORMATION_FORMAT: 'dwarf',
        MTL_ENABLE_DEBUG_INFO: 'INCLUDE_SOURCE',
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: 'DEBUG',
        SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
      },
      name: 'Debug',
    };
    xcodeProject.hash.project.objects.XCBuildConfiguration[debugBuildConfigUuid + '_comment'] = 'Debug';

    xcodeProject.hash.project.objects.XCBuildConfiguration[releaseBuildConfigUuid] = {
      isa: 'XCBuildConfiguration',
      buildSettings: {
        ...commonBuildSettings,
        COPY_PHASE_STRIP: 'NO',
        DEBUG_INFORMATION_FORMAT: '"dwarf-with-dsym"',
        SWIFT_OPTIMIZATION_LEVEL: '"-O"',
      },
      name: 'Release',
    };
    xcodeProject.hash.project.objects.XCBuildConfiguration[releaseBuildConfigUuid + '_comment'] = 'Release';

    // Create build configuration list
    xcodeProject.hash.project.objects.XCConfigurationList[buildConfigListUuid] = {
      isa: 'XCConfigurationList',
      buildConfigurations: [
        asPbxRef(debugBuildConfigUuid, 'Debug'),
        asPbxRef(releaseBuildConfigUuid, 'Release'),
      ],
      defaultConfigurationIsVisible: 0,
      defaultConfigurationName: 'Release',
    };
    xcodeProject.hash.project.objects.XCConfigurationList[buildConfigListUuid + '_comment'] = `Build configuration list for PBXNativeTarget "${WIDGET_NAME}"`;

    // Create product reference
    xcodeProject.hash.project.objects.PBXFileReference[productUuid] = {
      isa: 'PBXFileReference',
      explicitFileType: '"wrapper.app-extension"',
      includeInIndex: 0,
      path: `${WIDGET_NAME}.appex`,
      sourceTree: 'BUILT_PRODUCTS_DIR',
    };
    xcodeProject.hash.project.objects.PBXFileReference[productUuid + '_comment'] = `${WIDGET_NAME}.appex`;

    // Create native target
    xcodeProject.hash.project.objects.PBXNativeTarget = xcodeProject.hash.project.objects.PBXNativeTarget || {};
    xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid] = {
      isa: 'PBXNativeTarget',
      buildConfigurationList: buildConfigListUuid,
      buildPhases: [
        asPbxRef(sourcesBuildPhaseUuid, 'Sources'),
        asPbxRef(frameworksBuildPhaseUuid, 'Frameworks'),
        asPbxRef(resourcesBuildPhaseUuid, 'Resources'),
      ],
      buildRules: [],
      dependencies: [],
      name: WIDGET_NAME,
      productName: WIDGET_NAME,
      productReference: productUuid,
      productType: '"com.apple.product-type.app-extension"',
    };
    xcodeProject.hash.project.objects.PBXNativeTarget[targetUuid + '_comment'] = WIDGET_NAME;

    // Add target to project
    const pbxProject = xcodeProject.hash.project.objects.PBXProject || {};
    const projectUuid = Object.keys(pbxProject)[0];
    if (projectUuid && pbxProject[projectUuid]) {
      const project = pbxProject[projectUuid];
      if (project && Array.isArray(project.targets)) {
        project.targets.push(asPbxRef(targetUuid, WIDGET_NAME));
      }
    }

    // Add product to Products group
    const productsGroupUuid = Object.keys(xcodeProject.hash.project.objects.PBXGroup).find(
      (key) => {
        const group = xcodeProject.hash.project.objects.PBXGroup[key];
        return group && typeof group === 'object' && group.name === 'Products';
      }
    );
    if (productsGroupUuid) {
      const productsGroup = xcodeProject.hash.project.objects.PBXGroup[productsGroupUuid];
      if (productsGroup && Array.isArray(productsGroup.children)) {
        productsGroup.children.push(asPbxRef(productUuid, `${WIDGET_NAME}.appex`));
      }
    }

    // Add widget as dependency to main target
    const pbxNativeTarget = xcodeProject.hash.project.objects.PBXNativeTarget || {};
    const mainTargetUuid = Object.keys(pbxNativeTarget).find(
      (key) => {
        if (key.includes('_comment')) return false;
        const target = pbxNativeTarget[key];
        return target && typeof target === 'object' && target.productType === '"com.apple.product-type.application"';
      }
    );

    if (mainTargetUuid) {
      // Create target dependency
      const dependencyUuid = xcodeProject.generateUuid();
      const containerProxyUuid = xcodeProject.generateUuid();

      xcodeProject.hash.project.objects.PBXContainerItemProxy = xcodeProject.hash.project.objects.PBXContainerItemProxy || {};
      xcodeProject.hash.project.objects.PBXContainerItemProxy[containerProxyUuid] = {
        isa: 'PBXContainerItemProxy',
        containerPortal: projectUuid,
        proxyType: 1,
        remoteGlobalIDString: targetUuid,
        remoteInfo: WIDGET_NAME,
      };
      xcodeProject.hash.project.objects.PBXContainerItemProxy[containerProxyUuid + '_comment'] = 'PBXContainerItemProxy';

      xcodeProject.hash.project.objects.PBXTargetDependency = xcodeProject.hash.project.objects.PBXTargetDependency || {};
      xcodeProject.hash.project.objects.PBXTargetDependency[dependencyUuid] = {
        isa: 'PBXTargetDependency',
        target: targetUuid,
        targetProxy: containerProxyUuid,
      };
      xcodeProject.hash.project.objects.PBXTargetDependency[dependencyUuid + '_comment'] = 'PBXTargetDependency';

      const mainTarget = xcodeProject.hash.project.objects.PBXNativeTarget[mainTargetUuid];
      if (mainTarget && Array.isArray(mainTarget.dependencies)) {
        mainTarget.dependencies.push(asPbxRef(dependencyUuid, 'PBXTargetDependency'));
      }

      // Add copy files build phase to embed widget
      const copyFilesBuildPhaseUuid = xcodeProject.generateUuid();
      const embedBuildFileUuid = xcodeProject.generateUuid();

      xcodeProject.hash.project.objects.PBXBuildFile[embedBuildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: productUuid,
        settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
      };
      xcodeProject.hash.project.objects.PBXBuildFile[embedBuildFileUuid + '_comment'] = `${WIDGET_NAME}.appex in Embed Foundation Extensions`;

      xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase = xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase || {};
      xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase[copyFilesBuildPhaseUuid] = {
        isa: 'PBXCopyFilesBuildPhase',
        buildActionMask: 2147483647,
        dstPath: '""',
        dstSubfolderSpec: 13,
        files: [
          asPbxRef(
            embedBuildFileUuid,
            `${WIDGET_NAME}.appex in Embed Foundation Extensions`
          ),
        ],
        name: '"Embed Foundation Extensions"',
        runOnlyForDeploymentPostprocessing: 0,
      };
      xcodeProject.hash.project.objects.PBXCopyFilesBuildPhase[copyFilesBuildPhaseUuid + '_comment'] = 'Embed Foundation Extensions';

      if (mainTarget && Array.isArray(mainTarget.buildPhases)) {
        mainTarget.buildPhases.push(
          asPbxRef(copyFilesBuildPhaseUuid, 'Embed Foundation Extensions')
        );
      }
    }

    return config;
  });

  return config;
}

module.exports = withIOSWidget;
