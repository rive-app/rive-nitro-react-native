import Foundation
import NitroModules

extension URLSession {
    func get(_ url: URL) async throws -> (Data, URLResponse) {
        if #available(iOS 18.0, *) {
            return try await data(for: URLRequest(url: url))
        } else {
            return try await withCheckedThrowingContinuation { continuation in
                dataTask(with: url) { data, response, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        guard let data = data, let response = response else {
                            continuation.resume(throwing: RuntimeError.error(withMessage: "No data or response received from \(url)"))
                            return
                        }
                        continuation.resume(returning: (data, response))
                    }
                }.resume()
            }
        }
    }
}
