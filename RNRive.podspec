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

use_rive_spm = ENV['USE_RIVE_SPM'] == '1' || (defined?($UseRiveSPM) && $UseRiveSPM)

if !use_rive_spm && !rive_ios_version
  raise "Internal Error: Failed to determine Rive iOS SDK version. Please ensure package.json contains 'runtimeVersions.ios'"
end

if use_rive_spm
  Pod::UI.puts "@rive-app/react-native: Using RiveRuntime via Swift Package Manager"
else
  Pod::UI.puts "@rive-app/react-native: Rive iOS SDK #{rive_ios_version}"
end

# Xcode 26 workaround: strip .Swift Clang submodule from RiveRuntime's prebuilt
# modulemaps to prevent ODR conflicts with locally-compiled Swift C++ interop.
# See: https://github.com/rive-app/rive-nitro-react-native/issues/173
if defined?(Pod::Installer)
  module RiveXcode26SwiftModuleFix
    def run_podfile_pre_install_hooks
      rive_dir = File.join(sandbox.root.to_s, 'RiveRuntime')
      if Dir.exist?(rive_dir)
        Dir.glob(File.join(rive_dir, '**', 'module.modulemap')).each do |path|
          content = File.read(path)
          next unless content.include?('RiveRuntime.Swift')
          cleaned = content.gsub(/\nmodule RiveRuntime\.Swift \{[^}]*\}\n?/m, "\n")
          File.write(path, cleaned)
        end
      end
      super
    end
  end

  Pod::Installer.prepend(RiveXcode26SwiftModuleFix)
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

  if use_rive_spm
    s.exclude_files = ["ios/legacy/**"]
  else
    s.exclude_files = ["ios/new/**"]
  end

  s.public_header_files = ['ios/RCTSwiftLog.h']
  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  if use_rive_spm
    spm_dependency(s,
      url: 'https://github.com/rive-app/rive-ios.git',
      requirement: {kind: 'upToNextMajorVersion', minimumVersion: '6.15.0'},
      products: ['RiveRuntime']
    )
  else
    s.dependency "RiveRuntime", rive_ios_version
  end

 install_modules_dependencies(s)

  if use_rive_spm
    s.xcconfig = { 'OTHER_SWIFT_FLAGS' => '$(inherited) -DRIVE_EXPERIMENTAL_API' }
  end
end
