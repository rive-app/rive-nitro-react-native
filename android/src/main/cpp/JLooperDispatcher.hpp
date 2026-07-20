#pragma once

#include <fbjni/fbjni.h>
#include <NitroModules/Dispatcher.hpp>
#include <queue>
#include <mutex>
#include <condition_variable>

namespace margelo::nitro::rive {

using namespace facebook;

class JLooperDispatcher : public jni::HybridClass<JLooperDispatcher> {
public:
  static auto constexpr kJavaDescriptor = "Lcom/margelo/nitro/rive/LooperDispatcher;";

  static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  static jni::local_ref<javaobject> create();

  void runAsync(std::function<void()>&& function);
  void runSync(std::function<void()>&& function);

private:
  friend HybridBase;

  void trigger();
  void scheduleTrigger();

  jni::global_ref<JLooperDispatcher::javaobject> _javaPart;
  std::queue<std::function<void()>> _jobs;
  std::recursive_mutex _mutex;

  explicit JLooperDispatcher(jni::alias_ref<JLooperDispatcher::jhybridobject> jThis);
};

class AndroidUIThreadDispatcher : public Dispatcher {
public:
  explicit AndroidUIThreadDispatcher(jni::local_ref<JLooperDispatcher::javaobject> javaDispatcher);

  void runAsync(std::function<void()>&& function) override;
  void runSync(std::function<void()>&& function) override;

private:
  jni::global_ref<JLooperDispatcher::javaobject> _javaDispatcher;
};

} // namespace margelo::nitro::rive
