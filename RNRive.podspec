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

# Set to '1' (or set $UseRiveNewAPI = true in Podfile) to enable the
# experimental Rive runtime backend. When disabled, the legacy backend is used.
use_rive_new_api = ENV['USE_RIVE_NEW_API'] == '1' || (defined?($UseRiveNewAPI) && $UseRiveNewAPI)

if use_rive_new_api
  Pod::UI.puts "@rive-app/react-native: Using experimental Rive runtime backend"
else
  Pod::UI.puts "@rive-app/react-native: Using legacy Rive runtime backend (iOS SDK #{rive_ios_version})"
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

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  if use_rive_new_api
    s.exclude_files = ["ios/legacy/**"]
  else
    s.exclude_files = ["ios/new/**"]
  end

  s.public_header_files = ['ios/RCTSwiftLog.h']
  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'RiveRuntime', rive_ios_version

 install_modules_dependencies(s)

  if use_rive_new_api
    s.xcconfig = { 'OTHER_SWIFT_FLAGS' => '$(inherited) -DRIVE_EXPERIMENTAL_API' }
  end
end
