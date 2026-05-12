require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

rive_ios_version = nil

if ENV['RIVE_RUNTIME_IOS_VERSION']
  rive_ios_version = ENV['RIVE_RUNTIME_IOS_VERSION']
end

if !rive_ios_version && defined?($RiveRuntimeIOSVersion)
  rive_ios_version = $RiveRuntimeIOSVersion
end

if !rive_ios_version && defined?(Pod::Config) && Pod::Config.respond_to?(:instance)
  podfile_properties_path = File.join(Pod::Config.instance.installation_root, 'Podfile.properties.json')
  if File.exist?(podfile_properties_path)
    podfile_properties = JSON.parse(File.read(podfile_properties_path)) rescue {}
    rive_ios_version = podfile_properties['RiveRuntimeIOSVersion'] if podfile_properties['RiveRuntimeIOSVersion']
  end
end

if !rive_ios_version && package['runtimeVersions'] && package['runtimeVersions']['ios']
  rive_ios_version = package['runtimeVersions']['ios']
end

if !rive_ios_version
  raise "Internal Error: Failed to determine Rive iOS SDK version. Please ensure package.json contains 'runtimeVersions.ios'"
end

# The experimental runtime backend is used by default. Set USE_RIVE_LEGACY=1
# (or $UseRiveLegacy = true in Podfile) to fall back to the legacy backend.
use_legacy = ENV['USE_RIVE_LEGACY'] == '1' || (defined?($UseRiveLegacy) && $UseRiveLegacy)

if use_legacy
  Pod::UI.puts "@rive-app/react-native: Using legacy Rive runtime backend (iOS SDK #{rive_ios_version})"
else
  Pod::UI.puts "@rive-app/react-native: Using experimental Rive runtime backend"
end

Pod::Spec.new do |s|
  s.name         = "RNRive"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/rive-app/rive-nitro-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}", "cpp/**/*.{hpp,cpp}"

  if use_legacy
    s.exclude_files = ["ios/new/**"]
  else
    s.exclude_files = ["ios/legacy/**"]
  end

  s.public_header_files = ['ios/RCTSwiftLog.h']
  s.private_header_files = ['cpp/**/*.hpp']

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"$(PODS_TARGET_SRCROOT)/cpp"'
  }

  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'RiveRuntime', rive_ios_version

 install_modules_dependencies(s)

  unless use_legacy
    s.xcconfig = { 'OTHER_SWIFT_FLAGS' => '$(inherited) -DRIVE_EXPERIMENTAL_API' }
  end
end
