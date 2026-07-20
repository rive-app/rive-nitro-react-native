import Foundation

final class PropertyListenerStore {
  private var tasks: [UUID: Task<Void, Never>] = [:]

  func register(_ task: Task<Void, Never>) -> () -> Void {
    let id = UUID()
    tasks[id] = task
    return { [weak self] in
      self?.tasks[id]?.cancel()
      self?.tasks.removeValue(forKey: id)
    }
  }

  func cancelAll() {
    tasks.values.forEach { $0.cancel() }
    tasks.removeAll()
  }
}
