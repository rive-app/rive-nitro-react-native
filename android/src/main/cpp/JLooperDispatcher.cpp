#include "JLooperDispatcher.hpp"
#include <android/log.h>

namespace margelo::nitro::rive {

using namespace facebook;

JLooperDispatcher::JLooperDispatcher(
    jni::alias_ref<JLooperDispatcher::jhybridobject> jThis)
    : _javaPart(jni::make_global(jThis)) {}

jni::local_ref<JLooperDispatcher::jhybriddata> JLooperDispatcher::initHybrid(
    jni::alias_ref<jhybridobject> jThis) {
  return makeCxxInstance(jThis);
}

jni::local_ref<JLooperDispatcher::javaobject> JLooperDispatcher::create() {
  return newObjectJavaArgs();
}

void JLooperDispatcher::trigger() {
  std::unique_lock lock(_mutex);
  while (!_jobs.empty()) {
    auto job = std::move(_jobs.front());
    _jobs.pop();
    lock.unlock();
    job();
    lock.lock();
  }
}

void JLooperDispatcher::scheduleTrigger() {
  static const auto method = _javaPart->getClass()->getMethod<void()>("scheduleTrigger");
  method(_javaPart.get());
}

void JLooperDispatcher::runAsync(std::function<void()>&& function) {
  std::unique_lock lock(_mutex);
  _jobs.push(std::move(function));
  lock.unlock();
  scheduleTrigger();
}

void JLooperDispatcher::runSync(std::function<void()>&& function) {
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

void JLooperDispatcher::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", JLooperDispatcher::initHybrid),
      makeNativeMethod("trigger", JLooperDispatcher::trigger),
  });
}

AndroidUIThreadDispatcher::AndroidUIThreadDispatcher(
    jni::local_ref<JLooperDispatcher::javaobject> javaDispatcher)
    : _javaDispatcher(jni::make_global(javaDispatcher)) {}

void AndroidUIThreadDispatcher::runAsync(std::function<void()>&& function) {
  _javaDispatcher->cthis()->runAsync(std::move(function));
}

void AndroidUIThreadDispatcher::runSync(std::function<void()>&& function) {
  _javaDispatcher->cthis()->runSync(std::move(function));
}

} // namespace margelo::nitro::rive
