enum DeprecationWarning {
    private static var warned = Set<String>()

    static func warn(_ method: String, replacement: String) {
        guard !warned.contains(method) else { return }
        warned.insert(method)
        RiveLog.w("Deprecation",
            "'\(method)' is deprecated and blocks the JS thread. Use '\(replacement)' instead.")
    }
}
