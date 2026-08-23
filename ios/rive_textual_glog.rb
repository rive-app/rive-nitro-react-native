# NitroModules 0.37.x exposes `ReactProp.hpp` in its modulemap, which reaches
# `<glog/logging.h>` through React's `RawValue.h`. glog 0.3.5 includes headers
# from inside `namespace google`, which is illegal once glog is imported as a
# module, so every target that builds the NitroModules module fails to compile.
# Same class of breakage as mrousavy/nitro#1520, whose fix (0.37.1) covered
# only the `cxxreact` half. Nothing in React Native `@import`s glog, so drop
# its modulemap and let every target include it textually. Remove once Nitro
# keeps React's renderer headers out of its public modulemap.
def rive_use_textual_glog(installer)
  support_files = File.join(installer.sandbox.root, 'Target Support Files')
  Dir.glob(File.join(support_files, '*', '*.xcconfig')).each do |xcconfig|
    contents = File.read(xcconfig)
    patched = contents.gsub(
      /\s*(-Xcc\s+)?-fmodule-map-file="\$\{PODS_ROOT\}\/Headers\/Public\/glog\/glog\.modulemap"/, ''
    )
    File.write(xcconfig, patched) if patched != contents
  end
end

# The break happens while the NitroModules pod itself compiles, before any of
# this pod's build phases run, and CocoaPods gives a dependency's podspec no
# post-install hook — so hook the installer from here (podspecs are plain Ruby
# evaluated inside every `pod install`). Consumer apps need no Podfile change.
if defined?(Pod::Installer) && !$rive_textual_glog_hooked
  $rive_textual_glog_hooked = true
  module RiveTextualGlog
    def perform_post_install_actions
      super
      rive_use_textual_glog(self)
    end
  end
  Pod::Installer.prepend(RiveTextualGlog)
end
