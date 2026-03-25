#if RIVE_COVERAGE
import Foundation
import UIKit

@_silgen_name("__llvm_profile_write_file")
func llvmProfileWriteFile() -> Int32

@_silgen_name("__llvm_profile_set_filename")
func llvmProfileSetFilename(_ filename: UnsafePointer<CChar>)

@objc final class CoverageHelper: NSObject {
  private static var profrawPath: String?

  @objc static func setup() {
    guard let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
    // Each process gets its own profraw (merged later) so fast restarts don't lose data
    let pid = ProcessInfo.processInfo.processIdentifier
    profrawPath = docsDir.appendingPathComponent("coverage-\(pid).profraw").path

    NotificationCenter.default.addObserver(
      forName: UIApplication.willTerminateNotification, object: nil, queue: nil
    ) { _ in flush() }

    NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: nil
    ) { _ in flush() }

    // Catch SIGTERM (sent by simctl terminate) — runs on a background dispatch queue
    let source = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global())
    source.setEventHandler { flush(); exit(0) }
    source.resume()
    signal(SIGTERM, SIG_IGN) // let DispatchSource handle it instead of default handler

    // Background thread with its own runloop for periodic flushes
    let thread = Thread {
      let timer = Timer(timeInterval: 1.0, repeats: true) { _ in flush() }
      RunLoop.current.add(timer, forMode: .default)
      RunLoop.current.run()
    }
    thread.name = "CoverageFlush"
    thread.qualityOfService = .background
    thread.start()

    NSLog("[Coverage] pid=%d, flushing to %@", pid, profrawPath ?? "nil")
  }

  @objc static func flush() {
    guard let path = profrawPath else { return }
    path.withCString { llvmProfileSetFilename($0) }
    llvmProfileWriteFile()
  }
}
#endif
