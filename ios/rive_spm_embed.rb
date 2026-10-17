# CocoaPods never embeds dynamic frameworks a pod gets through `spm_dependency` (dyld "Library not
# loaded: @rpath/RiveRuntime.framework" at launch), so RiveRuntime is added to the frameworks CocoaPods
# embeds in apps using RNRive, which also makes it create the embed phase when no other pod is dynamic.
module RiveSPMEmbed
  # Xcode copies a binary target's framework into the shared products dir whether RNRive builds into its own
  # directory or, on react-native 0.87+, into that shared one.
  FRAMEWORK = '${PODS_CONFIGURATION_BUILD_DIR}/RiveRuntime.framework'
  EMBEDDED = %r{install_framework "[^"]*/RiveRuntime\.framework"|install_spm_framework "RiveRuntime"}

  def self.uses_rive?(aggregate_target)
    aggregate_target.pod_targets.any? { |pod| pod.pod_name == 'RNRive' }
  end

  # facebook/react-native#58781 makes `spm_dependency` embed package frameworks itself, but only into an
  # existing embed script.
  def self.react_native_embeds?
    defined?(::SPMManager) &&
      ::SPMManager.instance_method(:dependency).parameters.include?([:key, :embed_frameworks])
  end

  module AggregateTarget
    def framework_paths_by_config
      @rive_framework_paths_by_config ||= begin
        paths = super
        if RiveSPMEmbed.uses_rive?(self) && !(RiveSPMEmbed.react_native_embeds? && paths.values.any?(&:any?))
          rive = Pod::Xcode::FrameworkPaths.new(FRAMEWORK)
          paths = paths.transform_values do |list|
            list.any? { |path| path.source_path.end_with?('/RiveRuntime.framework') } ? list : list + [rive]
          end
        end
        paths
      end
    end
  end

  module Installer
    def perform_post_install_actions
      super
      aggregate_targets.each do |target|
        next if !RiveSPMEmbed.uses_rive?(target) || target.requires_host_target?
        path = target.embed_frameworks_script_path
        next if File.exist?(path) && File.read(path).match?(EMBEDDED)
        Pod::UI.warn "[RNRive] RiveRuntime.framework is not embedded in #{target.name} (expected in #{path}), " \
                     'so the app will crash at launch with dyld "Library not loaded: @rpath/RiveRuntime.framework". ' \
                     'Please report your CocoaPods and react-native versions at https://github.com/rive-app/rive-nitro-react-native/issues'
      end
    end
  end
end

Pod::AggregateTarget.prepend(RiveSPMEmbed::AggregateTarget) unless Pod::AggregateTarget.ancestors.include?(RiveSPMEmbed::AggregateTarget)
Pod::Installer.prepend(RiveSPMEmbed::Installer) unless Pod::Installer.ancestors.include?(RiveSPMEmbed::Installer)
