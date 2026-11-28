import NitroModules

// Enqueues straight onto the main actor (Promise.async hops through the global executor first),
// so writes apply in call order relative to each other and to other main-actor work.
func mainActorWrite(_ write: @escaping @MainActor () -> Void) -> Promise<Void> {
  let promise = Promise<Void>()
  Task { @MainActor in
    write()
    promise.resolve()
  }
  return promise
}
