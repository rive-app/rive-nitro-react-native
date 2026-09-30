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
use_legacy = ['1', 'true'].include?(ENV['USE_RIVE_LEGACY']) || (defined?($UseRiveLegacy) && $UseRiveLegacy)

if use_legacy
  Pod::UI.puts "@rive-app/react-native: Using legacy Rive runtime backend (iOS SDK #{rive_ios_version})"
else
  Pod::UI.puts "@rive-app/react-native: Using experimental Rive runtime backend"
end

require_relative 'ios/rive_spm_embed'

Pod::Spec.new do |s|
  s.name         = "RNRive"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/rive-app/rive-nitro-react-native.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  if use_legacy
    s.exclude_files = ["ios/new/**"]
  else
    s.exclude_files = ["ios/legacy/**"]
  end

  s.public_header_files = ['ios/RCTSwiftLog.h']
  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  spm_dependency(s,
    url: 'https://github.com/rive-app/rive-ios.git',
    requirement: { kind: 'exactVersion', version: rive_ios_version },
    products: ['RiveRuntime']
  )
  # Xcode 26 archives collect xcframework signatures into one flat folder; RiveRuntime's is written
  # both at the app level and under this pod's build dir, and the duplicate fails the archive with
  # "RiveRuntime.xcframework-ios.signature ... already exists" (same fix as maplibre-react-native#1490).
  s.script_phase = {
    :name => '[RNRive] Remove duplicate RiveRuntime.xcframework signature',
    :script => 'rm -rf "${CONFIGURATION_BUILD_DIR}/RiveRuntime.xcframework-ios.signature"',
    :execution_position => :after_compile
  }

 install_modules_dependencies(s)

  unless use_legacy
  end
end
