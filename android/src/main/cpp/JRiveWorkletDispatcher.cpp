#include "JRiveWorkletDispatcher.hpp"
#include <android/log.h>

namespace margelo::nitro::rive {

using namespace facebook;

JRiveWorkletDispatcher::JRiveWorkletDispatcher(
    jni::alias_ref<JRiveWorkletDispatcher::jhybridobject> jThis)
    : _javaPart(jni::make_global(jThis)) {}

jni::local_ref<JRiveWorkletDispatcher::jhybriddata> JRiveWorkletDispatcher::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

jni::local_ref<JRiveWorkletDispatcher::javaobject> JRiveWorkletDispatcher::create() {
  return newObjectJavaArgs();
}

void JRiveWorkletDispatcher::trigger() {
  std::unique_lock lock(_mutex);
  while (!_jobs.empty()) {
    auto job = std::move(_jobs.front());
    _jobs.pop();
    lock.unlock();
    job();
    lock.lock();
  }
}

void JRiveWorkletDispatcher::scheduleTrigger() {
  static const auto method = _javaPart->getClass()->getMethod<void()>("scheduleTrigger");
  method(_javaPart.get());
}

void JRiveWorkletDispatcher::runAsync(std::function<void()>&& function) {
  std::unique_lock lock(_mutex);
  _jobs.push(std::move(function));
  lock.unlock();
  scheduleTrigger();
}

void JRiveWorkletDispatcher::runSync(std::function<void()>&& function) {
  std::mutex mtx;
  std::condition_variable cv;
  bool done = false;

  runAsync([&]() {
    function();
    {
      std::lock_guard<std::mutex> lock(mtx);
      done = true;
    }
    cv.notify_one();
  });

  std::unique_lock<std::mutex> lock(mtx);
  cv.wait(lock, [&]{ return done; });
}

void JRiveWorkletDispatcher::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", JRiveWorkletDispatcher::initHybrid),
      makeNativeMethod("trigger", JRiveWorkletDispatcher::trigger),
  });
}

AndroidMainThreadDispatcher::AndroidMainThreadDispatcher(
    jni::local_ref<JRiveWorkletDispatcher::javaobject> javaDispatcher)
    : _javaDispatcher(jni::make_global(javaDispatcher)) {}

void AndroidMainThreadDispatcher::runAsync(std::function<void()>&& function) {
  _javaDispatcher->cthis()->runAsync(std::move(function));
}

void AndroidMainThreadDispatcher::runSync(std::function<void()>&& function) {
  _javaDispatcher->cthis()->runSync(std::move(function));
}

} // namespace margelo::nitro::rive
