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

# Set to '1' (or set $UseRiveExperimentalRuntime = true in Podfile) to enable the
# experimental Rive runtime backend. When disabled, the legacy backend is used.
use_rive_experimental_runtime = ENV['USE_RIVE_EXPERIMENTAL_RUNTIME'] == '1' || (defined?($UseRiveExperimentalRuntime) && $UseRiveExperimentalRuntime)

if use_rive_experimental_runtime
  Pod::UI.puts "@rive-app/react-native: Using experimental Rive runtime backend"
else
  Pod::UI.puts "@rive-app/react-native: Using legacy Rive runtime backend (iOS SDK #{rive_ios_version})"
end

# SPM-resolved dynamic frameworks aren't embedded by CocoaPods automatically.
# Hook into post_install to append RiveRuntime to every target's embed script
# so consumers don't need to add anything to their own Podfiles.
if defined?(Pod::Installer)
  module RiveSPMEmbedFix
    def run_podfile_post_install_hooks
      super
      aggregate_targets.each do |target|
        embed_script = File.join(
          sandbox.root,
          'Target Support Files',
          target.name,
          "#{target.name}-frameworks.sh"
        )
        next unless File.exist?(embed_script)
        content = File.read(embed_script)
        next if content.include?('RiveRuntime')
        content.sub!(
          /if \[ "\$\{COCOAPODS_PARALLEL_CODE_SIGN\}" == "true" \]; then\s+wait\s+fi/,
          "install_framework \"${PODS_XCFRAMEWORKS_BUILD_DIR}/RiveRuntime/RiveRuntime.framework\"\n" \
          "if [ \"${COCOAPODS_PARALLEL_CODE_SIGN}\" == \"true\" ]; then\n  wait\nfi"
        )
        File.write(embed_script, content)
        Pod::UI.puts "[RNRive] Added RiveRuntime.framework to embed script for #{target.name}"
      end
    end
  end

  Pod::Installer.prepend(RiveSPMEmbedFix)
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

  if use_rive_experimental_runtime
    s.exclude_files = ["ios/legacy/**"]
  else
    s.exclude_files = ["ios/new/**"]
  end

  s.public_header_files = ['ios/RCTSwiftLog.h']
  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  spm_dependency(s,
    url: 'https://github.com/rive-app/rive-ios.git',
    requirement: { kind: 'exactVersion', version: rive_ios_version },
    products: ['RiveRuntime']
  )

 install_modules_dependencies(s)

  if use_rive_experimental_runtime
    s.xcconfig = { 'OTHER_SWIFT_FLAGS' => '$(inherited) -DRIVE_EXPERIMENTAL_API' }
  end
end
