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

Pod::UI.puts "@rive-app/react-native: Rive iOS SDK #{rive_ios_version}"

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

  s.public_header_files = ['ios/RCTSwiftLog.h']
  load 'nitrogen/generated/ios/RNRive+autolinking.rb'
  add_nitrogen_files(s)

  spm_dependency(s,
    url: 'https://github.com/rive-app/rive-ios.git',
    requirement: { kind: 'exactVersion', version: rive_ios_version },
    products: ['RiveRuntime']
  )

 install_modules_dependencies(s)
end
