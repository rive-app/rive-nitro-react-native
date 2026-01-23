#pragma once

#include "HybridRiveWorkletBridgeSpec.hpp"
#include <NitroModules/Dispatcher.hpp>

#if __APPLE__
#include <dispatch/dispatch.h>
#include <pthread.h>
#elif __ANDROID__
#include "JRiveWorkletDispatcher.hpp"
#endif

namespace margelo::nitro::rive {

#if __APPLE__

/**
 * iOS: A dispatcher that runs work on the main thread using GCD.
 */
class MainThreadDispatcher : public Dispatcher {
public:
  void runAsync(std::function<void()>&& function) override {
    __block auto func = std::move(function);
    dispatch_async(dispatch_get_main_queue(), ^{
      func();
    });
  }

  void runSync(std::function<void()>&& function) override {
    if (pthread_main_np() != 0) {
      function();
    } else {
      __block auto func = std::move(function);
      dispatch_sync(dispatch_get_main_queue(), ^{
        func();
      });
    }
  }
};

#endif

class HybridRiveWorkletBridge : public HybridRiveWorkletBridgeSpec {
public:
  HybridRiveWorkletBridge() : HybridObject(TAG) {}

  void install() override {
    throw std::runtime_error("install() requires runtime access - use raw method");
  }

protected:
  void loadHybridMethods() override {
    HybridObject::loadHybridMethods();
    registerHybrids(this, [](Prototype& prototype) {
      prototype.registerRawHybridMethod("install", 0, &HybridRiveWorkletBridge::installRaw);
    });
  }

private:
  jsi::Value installRaw(jsi::Runtime& runtime,
                        const jsi::Value& thisValue,
                        const jsi::Value* args,
                        size_t count) {
#if __APPLE__
    auto dispatcher = std::make_shared<MainThreadDispatcher>();
    Dispatcher::installRuntimeGlobalDispatcher(runtime, dispatcher);
#elif __ANDROID__
    // Create the Java dispatcher instance and wrap it in the C++ dispatcher
    auto javaDispatcher = JRiveWorkletDispatcher::create();
    auto dispatcher = std::make_shared<AndroidMainThreadDispatcher>(javaDispatcher);
    Dispatcher::installRuntimeGlobalDispatcher(runtime, dispatcher);
#endif
    return jsi::Value::undefined();
  }
};

} // namespace margelo::nitro::rive
