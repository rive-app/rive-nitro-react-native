#pragma once

#include <fbjni/fbjni.h>
#include <NitroModules/Dispatcher.hpp>
#include <queue>
#include <mutex>
#include <condition_variable>

namespace margelo::nitro::rive {

using namespace facebook;

class JRiveWorkletDispatcher : public jni::HybridClass<JRiveWorkletDispatcher> {
public:
  static auto constexpr kJavaDescriptor = "Lcom/margelo/nitro/rive/RiveWorkletDispatcher;";

  static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  static jni::local_ref<javaobject> create();

  void runAsync(std::function<void()>&& function);
  void runSync(std::function<void()>&& function);

private:
  friend HybridBase;

  void trigger();
  void scheduleTrigger();

  jni::global_ref<JRiveWorkletDispatcher::javaobject> _javaPart;
  std::queue<std::function<void()>> _jobs;
  std::recursive_mutex _mutex;

  explicit JRiveWorkletDispatcher(jni::alias_ref<JRiveWorkletDispatcher::jhybridobject> jThis);
};

class AndroidMainThreadDispatcher : public Dispatcher {
public:
  explicit AndroidMainThreadDispatcher(jni::local_ref<JRiveWorkletDispatcher::javaobject> javaDispatcher);

  void runAsync(std::function<void()>&& function) override;
  void runSync(std::function<void()>&& function) override;

private:
  jni::global_ref<JRiveWorkletDispatcher::javaobject> _javaDispatcher;
};

} // namespace margelo::nitro::rive
