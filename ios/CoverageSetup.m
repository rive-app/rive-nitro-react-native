#import <Foundation/Foundation.h>

// Forward-declare the Swift-generated class method.
// CoverageHelper is only compiled when RIVE_COVERAGE is defined.
@interface CoverageHelper : NSObject
+ (void)setup;
@end

@interface RNRiveCoverageSetup : NSObject
@end

@implementation RNRiveCoverageSetup

+ (void)load {
  Class cls = NSClassFromString(@"RNRive.CoverageHelper");
  if (cls && [cls respondsToSelector:@selector(setup)]) {
    [cls performSelector:@selector(setup)];
  }
}

@end
