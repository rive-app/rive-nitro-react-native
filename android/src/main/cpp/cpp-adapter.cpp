#include <jni.h>
#include "riveOnLoad.hpp"
#include "JLooperDispatcher.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  auto result = margelo::nitro::rive::initialize(vm);
  margelo::nitro::rive::JLooperDispatcher::registerNatives();
  return result;
}
