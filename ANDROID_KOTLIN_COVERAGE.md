# Android Kotlin Code Coverage for React Native Libraries

This documents how to collect Kotlin/Java code coverage from a React Native library running on an Android emulator, driven by external JS tests (not Android instrumented tests). This was implemented in [rive-app/rive-nitro-react-native#264](https://github.com/rive-app/rive-nitro-react-native/pull/264) and is intended as a reference for implementing generic Android coverage support in `react-native-harness`.

## Why this is hard (and what doesn't work)

### `enableAndroidTestCoverage` does NOT instrument the regular APK

The obvious approach — setting `enableAndroidTestCoverage = true` in `build.gradle` — **only instruments classes for the `androidTest` APK variant**. When you build with `assembleDebug`, the classes in the APK have zero JaCoCo probes. You can verify this:

```bash
# This class will NOT have $jacocoInit — no probes
javap -p android/build/tmp/kotlin-classes/debug/com/example/MyClass.class | grep jacoco
# (empty output)
```

The JaCoCo agent runtime gets loaded, and `RT.getAgent()` works, but since no bytecode has probes inserted, the execution data is empty. You end up with 0% coverage on everything except the coverage helper itself.

This applies to both the library module and the app module — `enableAndroidTestCoverage` on either one only affects the `androidTest` build variant.

### `-javaagent` doesn't work on Android

JaCoCo's runtime instrumentation mode requires a JVM. Android uses ART, which does not support Java agents. This is a dead end.

### Kover / IntelliJ agent doesn't work on Android

JetBrains' Kover wraps JaCoCo or IntelliJ's coverage agent, but the IntelliJ agent only works on JVM, not ART. And Kover's JaCoCo mode has the same limitation — it's designed for `./gradlew test` (host JVM), not for on-device code.

## What works: JaCoCo offline instrumentation

The solution is **offline instrumentation** — rewriting `.class` files with JaCoCo probes after Kotlin compilation but before DEX-ing. The instrumented classes contain probe arrays that record execution at runtime. The JaCoCo agent runtime library provides the `Offline` class that manages the probe data in memory.

### The four pieces

#### 1. Gradle: offline-instrument class files after compilation

Add a `doLast` to `compileDebugKotlin` that:
1. Saves a copy of the original (uninstrumented) classes (needed for report generation later)
2. Runs `org.jacoco.ant.InstrumentTask` to instrument the classes
3. Replaces the originals with instrumented versions

The instrumented classes must be written to a **separate temp directory** first, then copied back. Writing in-place corrupts files because JaCoCo reads and writes to the same location simultaneously.

```groovy
configurations {
  jacocoAnt
}

dependencies {
  // The runtime jar provides org.jacoco.agent.rt.RT for the instrumented code
  implementation "org.jacoco:org.jacoco.agent:0.8.12:runtime"
  jacocoAnt "org.jacoco:org.jacoco.ant:0.8.12"
}

afterEvaluate {
  def classesDir = file("${buildDir}/tmp/kotlin-classes/debug")

  tasks.named("compileDebugKotlin").configure {
    doLast {
      if (!classesDir.exists()) return

      // Save originals for report generation
      def origDir = file("${buildDir}/jacoco-original-classes")
      if (origDir.exists()) origDir.deleteDir()
      ant.copy(todir: origDir) { fileset(dir: classesDir) }

      // Instrument to temp dir, then replace
      def instrumentedDir = file("${buildDir}/tmp/jacoco-instrumented")
      if (instrumentedDir.exists()) instrumentedDir.deleteDir()
      instrumentedDir.mkdirs()

      ant.taskdef(
        name: 'instrument',
        classname: 'org.jacoco.ant.InstrumentTask',
        classpath: configurations.jacocoAnt.asPath
      )
      ant.instrument(destdir: instrumentedDir) {
        fileset(dir: classesDir, includes: '**/*.class')
      }

      ant.copy(todir: classesDir, overwrite: true) {
        fileset(dir: instrumentedDir)
      }
    }
  }
}
```

**Important**: `org.jacoco:org.jacoco.agent:0.8.12:runtime` (note the `:runtime` classifier) is the agent JAR without the agent bootstrap — just the `RT` and `Offline` classes that the instrumented bytecode calls. Without this dependency, the app crashes at runtime with `ClassNotFoundException: org.jacoco.agent.rt.internal_aeaf9ab.Offline`.

#### 2. `jacoco-agent.properties` — prevent crash on read-only filesystem

When offline-instrumented code first loads, JaCoCo's `Offline` class initializes the agent singleton. By default, the agent tries to write execution data to `jacoco.exec` in the current working directory. On Android, the cwd is `/` (root filesystem, read-only). This causes a fatal `FileNotFoundException: /jacoco.exec: open failed: EROFS (Read-only file system)`.

The fix: place a `jacoco-agent.properties` file on the classpath with `output=none`. This tells the agent not to auto-dump — our helper handles dumping manually.

```
# android/src/main/resources/jacoco-agent.properties
output=none
```

This file is harmless in non-coverage builds (JaCoCo classes aren't loaded, so the file is never read).

#### 3. Runtime flush helper — dump `.ec` files to app storage

The JaCoCo agent accumulates coverage data in memory. You must explicitly flush it to a `.ec` file. The key API:

```kotlin
val agent = Class.forName("org.jacoco.agent.rt.RT")
    .getMethod("getAgent").invoke(null)
val bytes = agent.javaClass
    .getMethod("getExecutionData", Boolean::class.javaPrimitiveType)
    .invoke(agent, false) as ByteArray
File(context.filesDir, "coverage-${Process.myPid()}.ec").writeBytes(bytes)
```

Flush triggers:
- **1-second periodic timer** (background daemon thread) — most reliable, catches data even if the app is killed
- **Activity lifecycle** (`onActivityStopped`) — flushes when app goes to background
- Per-process filenames (`coverage-$pid.ec`) — the harness restarts the app for each test suite, so each process gets its own file

**Important**: `am force-stop` kills the process immediately without calling any lifecycle callbacks or giving the timer a chance to fire. The 1s timer ensures data is flushed at most 1 second before any kill. If the process is killed within 1 second of starting, that test run's data is lost.

#### 4. Bootstrap — start the helper early

Use a `ContentProvider` to bootstrap the helper before any Activity starts. ContentProviders run during `Application.onCreate`, which is the earliest point with a `Context` on Android (equivalent of iOS's ObjC `+load`).

```kotlin
class CoverageInitProvider : ContentProvider() {
    override fun onCreate(): Boolean {
        context?.let { CoverageHelper.setup(it) }
        return true
    }
    // ... stub all other abstract methods
}
```

Register in `AndroidManifest.xml`:
```xml
<provider
  android:name=".CoverageInitProvider"
  android:authorities="${applicationId}.coverage"
  android:exported="false" />
```

Use a `BuildConfig` boolean flag to no-op in non-coverage builds:
```kotlin
fun setup(context: Context) {
    if (!BuildConfig.COVERAGE_ENABLED) return
    // ...
}
```

## Collecting coverage after tests

### Pull `.ec` files from the emulator

The harness restarts the app multiple times. Each restart creates a new `.ec` file. Use `tar` to pull all files reliably — `adb shell run-as` with `find` + `cat` in a pipe loses data due to buffering issues:

```bash
adb shell am force-stop "$APP_ID"
sleep 2  # let final flush complete

# tar is reliable across multiple files; find+cat in a pipe drops entries
adb shell run-as "$APP_ID" sh -c "'cd files && tar cf - *.ec 2>/dev/null'" \
  | tar xf - -C ./ec-files/
```

### Merge and generate reports

JaCoCo CLI merges multiple `.ec` files and generates reports. It needs the **original (uninstrumented)** class files — not the instrumented ones.

```bash
# Merge all .ec files
java -jar jacococli.jar merge ec-files/*.ec --destfile merged.ec

# Generate report — classfiles must be the ORIGINAL (uninstrumented) classes
java -jar jacococli.jar report merged.ec \
  --classfiles android/build/jacoco-original-classes \
  --sourcefiles android/src/main/java \
  --xml coverage.xml \
  --html coverage-html/
```

**Class file mismatch warning**: The `.ec` data must match the exact build that produced the instrumented classes. If you rebuild without re-running tests, the `.ec` is stale and the report will be wrong.

## Comparison with iOS coverage (PR #190)

| Aspect | iOS (LLVM profiling) | Android (JaCoCo offline) |
|--------|---------------------|--------------------------|
| Instrumentation | Compiler flags (`-profile-generate -profile-coverage-mapping`) added to podspec | JaCoCo ant task rewrites `.class` files after compilation |
| Opt-in mechanism | Env var `RIVE_SWIFT_COVERAGE=1` before `pod install` | Gradle property `-PRive_KotlinCoverage=true` |
| Runtime agent | LLVM profiling runtime (built into the binary) | `org.jacoco:org.jacoco.agent:0.8.12:runtime` dependency |
| Data format | `.profraw` (one per process) | `.ec` (one per process) |
| Flush API | `__llvm_profile_write_file()` via `@_silgen_name` | `RT.getAgent().getExecutionData(false)` via reflection |
| Auto-dump config | N/A (LLVM doesn't auto-dump) | `jacoco-agent.properties` with `output=none` (prevents `/jacoco.exec` crash) |
| Bootstrap | ObjC `+load` in `CoverageSetup.m` | `ContentProvider.onCreate()` |
| Report tool | `xcrun llvm-cov export` → lcov natively | `jacococli.jar report` → XML/HTML (lcov needs a converter) |
| Class file requirement | N/A (symbols are in the binary) | Report needs the **original** (uninstrumented) `.class` files |
| Gotcha: in-place instrumentation | N/A | Must instrument to temp dir then copy back; in-place corrupts files |
| Gotcha: read-only filesystem | N/A | JaCoCo agent defaults to writing `/jacoco.exec` on root FS → crash |
| Gotcha: `enableAndroidTestCoverage` | N/A | Only instruments the `androidTest` variant, NOT the regular debug APK |

## For react-native-harness implementation

To make this generic in react-native-harness, the harness would need to:

1. **Build phase**: Inject the JaCoCo offline instrumentation into the library's (or app's) Gradle build. This could be done via:
   - A Gradle init script that applies to all projects
   - A Gradle plugin that the harness adds
   - Modifying the app's `build.gradle` programmatically (like the iOS approach modifies podspec via env var)

2. **Runtime phase**: The harness already restarts the app per test suite. The coverage helper + ContentProvider need to be in the APK. Options:
   - Ship a small AAR that contains `CoverageHelper` + `CoverageInitProvider` + `jacoco-agent.properties`, and inject it as a dependency when coverage is enabled
   - Generate these files into the app project before build

3. **Collection phase**: After all test suites complete, pull `.ec` files via `adb shell run-as ... tar`, merge with `jacococli.jar merge`, and generate the report with `jacococli.jar report`. The harness needs to know the path to the original (uninstrumented) class files — these are saved during the build at `build/jacoco-original-classes/`.

4. **lcov conversion**: JaCoCo doesn't natively produce lcov. Use `jacoco-to-lcov` or `cover2cover.py` to convert from XML if lcov is needed for consistency with the iOS output.

## Reference implementation

See the full working implementation in this repo:
- [`android/build.gradle`](android/build.gradle) — Gradle offline instrumentation setup
- [`android/src/main/java/com/rive/CoverageHelper.kt`](android/src/main/java/com/rive/CoverageHelper.kt) — Runtime flush helper
- [`android/src/main/java/com/rive/CoverageInitProvider.kt`](android/src/main/java/com/rive/CoverageInitProvider.kt) — ContentProvider bootstrap
- [`android/src/main/resources/jacoco-agent.properties`](android/src/main/resources/jacoco-agent.properties) — Agent config
- [`android/src/main/AndroidManifest.xml`](android/src/main/AndroidManifest.xml) — ContentProvider registration
- [`scripts/android-coverage.sh`](scripts/android-coverage.sh) — Collection and report script
