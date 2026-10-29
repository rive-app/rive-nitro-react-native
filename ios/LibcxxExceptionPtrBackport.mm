// With Xcode 27, Swift-compiled Nitro code references these iOS 18+ libc++ symbols even for older deployment
// targets, so dyld aborts at launch on iOS < 18 (#433, margelo/nitro#1652). These fallbacks build the exception
// the way libc++ does for iOS < 18: throw it, then capture it with `std::current_exception`.
#import <Foundation/Foundation.h>

#include <algorithm>
#include <cstdlib>
#include <cxxabi.h>
#include <exception>
#include <typeinfo>

#if defined(_LIBCPP_AVAILABILITY_HAS_INIT_PRIMARY_EXCEPTION) && \
    defined(__ENVIRONMENT_IPHONE_OS_VERSION_MIN_REQUIRED__) && \
    __ENVIRONMENT_IPHONE_OS_VERSION_MIN_REQUIRED__ < 180000

// The class makes `-ObjC` load this object, so its definitions win over libc++ whatever the link order.
@interface RNRiveLibcxxExceptionPtrBackport : NSObject
@end
@implementation RNRiveLibcxxExceptionPtrBackport
@end

namespace {

struct PendingException {
  void* object;
  std::type_info* type;
  void (*destructor)(void*);
};

// libc++ calls `__cxa_init_primary_exception`, constructs the object, then calls `__from_native_exception_pointer` on
// the same thread; entries are keyed by object because that constructor may itself call `std::make_exception_ptr`.
// Plain arrays have no thread_local destructor, so this stays valid while other thread_locals are torn down.
constexpr size_t kMaxPendingExceptions = 16;
thread_local PendingException pendingExceptions[kMaxPendingExceptions];
thread_local size_t pendingExceptionCount = 0;

void removePendingException(size_t index) {
  std::copy(pendingExceptions + index + 1, pendingExceptions + pendingExceptionCount, pendingExceptions + index);
  --pendingExceptionCount;
}

bool takePendingException(void* object, PendingException* out) {
  for (size_t i = pendingExceptionCount; i-- > 0;) {
    if (pendingExceptions[i].object == object) {
      *out = pendingExceptions[i];
      removePendingException(i);
      return true;
    }
  }
  return false;
}

} // namespace

namespace __cxxabiv1 {
extern "C" __cxa_exception*
__cxa_init_primary_exception(void* object, std::type_info* type, void (*destructor)(void*)) noexcept {
  PendingException stale;
  // A reused address means the earlier exception's constructor threw and libc++ freed it.
  takePendingException(object, &stale);
  if (pendingExceptionCount == kMaxPendingExceptions) {
    // Only entries left by throwing constructors can be this old.
    removePendingException(0);
  }
  pendingExceptions[pendingExceptionCount++] = {object, type, destructor};
  return nullptr;
}
} // namespace __cxxabiv1

namespace std {
exception_ptr exception_ptr::__from_native_exception_pointer(void* object) noexcept {
  PendingException pending;
  if (!takePendingException(object, &pending)) {
    std::abort();
  }
  try {
    __cxxabiv1::__cxa_throw(object, pending.type, pending.destructor);
  } catch (...) {
    return std::current_exception();
  }
}
} // namespace std

#endif
