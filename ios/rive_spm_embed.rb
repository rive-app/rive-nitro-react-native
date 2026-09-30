# CocoaPods never embeds dynamic frameworks a pod gets through `spm_dependency` (dyld "Library not
# loaded: @rpath/RiveRuntime.framework" at launch), so add RiveRuntime to the app's embed script
# unless something already embeds it. Runs after user-project integration, which rewrites the
# embed xcfilelists after the Podfile's post_install hooks.
module RiveSPMEmbed
  FRAMEWORK = '${PODS_CONFIGURATION_BUILD_DIR}/RNRive/RiveRuntime.framework'
  INSTALL_LINE = %(install_framework "#{FRAMEWORK}")
  # A react-native whose spm_dependency embeds package frameworks calls
  # `install_spm_frameworks "${PODS_CONFIGURATION_BUILD_DIR}/RNRive" ...`.
  ALREADY_EMBEDDED = %r{install_framework "[^"]*/RiveRuntime\.framework"|install_spm_frameworks "\$\{PODS_CONFIGURATION_BUILD_DIR\}/RNRive"}
  PARALLEL_SIGN_WAIT = /^if \[ "\$\{COCOAPODS_PARALLEL_CODE_SIGN\}" == "true" \]; then$/

  def perform_post_install_actions
    super
    aggregate_targets.each do |target|
      next unless target.pod_targets.any? { |pod| pod.pod_name == 'RNRive' }
      rive_embed_patch_script(target.embed_frameworks_script_path, target.name)
      target.user_build_configurations.each_key do |config|
        rive_embed_append_line(target.embed_frameworks_script_input_files_path(config),
                               "#{FRAMEWORK}/RiveRuntime", '/RiveRuntime.framework/RiveRuntime')
        rive_embed_append_line(target.embed_frameworks_script_output_files_path(config),
                               '${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}/RiveRuntime.framework', '/RiveRuntime.framework')
      end
    end
  end

  private

  def rive_embed_patch_script(path, target_name)
    return unless File.exist?(path)
    content = File.read(path)
    return if content.match?(ALREADY_EMBEDDED)
    unless content.match?(PARALLEL_SIGN_WAIT)
      Pod::UI.warn "[RNRive] Could not add RiveRuntime.framework to #{path}; the app will fail to launch. " \
                   'Please report this at https://github.com/rive-app/rive-nitro-react-native/issues'
      return
    end
    File.write(path, content.sub(PARALLEL_SIGN_WAIT) { "#{INSTALL_LINE}\n#{$&}" })
    Pod::UI.puts "[RNRive] Embedding RiveRuntime.framework (Swift Package) in #{target_name}"
  end

  def rive_embed_append_line(path, line, suffix)
    return unless File.exist?(path)
    lines = File.read(path).split("\n")
    return if lines.any? { |existing| existing.end_with?(suffix) }
    File.write(path, (lines + [line]).join("\n"))
  end
end

Pod::Installer.prepend(RiveSPMEmbed) unless Pod::Installer.ancestors.include?(RiveSPMEmbed)
