# Changelog

## [0.4.3](https://github.com/rive-app/rive-nitro-react-native/compare/v0.4.2...v0.4.3) (2026-04-17)


### Bug Fixes

* bump rive-ios to 6.18.2 and rive-android to 11.4.0 ([#216](https://github.com/rive-app/rive-nitro-react-native/issues/216)) ([ae92eff](https://github.com/rive-app/rive-nitro-react-native/commit/ae92eff16e668c1346dff4b90b26f732b4d8b406))

## [0.4.2](https://github.com/rive-app/rive-nitro-react-native/compare/v0.4.1...v0.4.2) (2026-04-13)


### Bug Fixes

* Fit.LAYOUT artboard oversized on Android ([#209](https://github.com/rive-app/rive-nitro-react-native/issues/209)) ([8b4219d](https://github.com/rive-app/rive-nitro-react-native/commit/8b4219d2b5d3e1129579bf57f1a9d02996ebe179))

## [0.4.1](https://github.com/rive-app/rive-nitro-react-native/compare/v0.4.0...v0.4.1) (2026-04-08)


### Bug Fixes

* **iOS:** eagerly dispose RiveView and break referenced asset retain cycle ([#202](https://github.com/rive-app/rive-nitro-react-native/issues/202)) ([c4b12d6](https://github.com/rive-app/rive-nitro-react-native/commit/c4b12d6b951509e8d9417285b1e90d6551ddc988))

## [0.4.0](https://github.com/rive-app/rive-nitro-react-native/compare/v0.3.4...v0.4.0) (2026-03-30)


### ⚠ BREAKING CHANGES

* hooks start undefined, useViewModelInstance returns {instance, error} ([#184](https://github.com/rive-app/rive-nitro-react-native/issues/184))

### Bug Fixes

* hooks start undefined, useViewModelInstance returns {instance, error} ([#184](https://github.com/rive-app/rive-nitro-react-native/issues/184)) ([059e5f4](https://github.com/rive-app/rive-nitro-react-native/commit/059e5f4865ab8bcc207badc7c2eeff44d47b9985))

## [0.3.4](https://github.com/rive-app/rive-nitro-react-native/compare/v0.3.3...v0.3.4) (2026-03-30)


### Features

* add getPropertyCountAsync and getInstanceCountAsync and deprecate propertyCount and instanceCount ([#198](https://github.com/rive-app/rive-nitro-react-native/issues/198)) ([6244b2e](https://github.com/rive-app/rive-nitro-react-native/commit/6244b2ee306875a3608a3cfeacfc65ce405666a7))

## [0.3.3](https://github.com/rive-app/rive-nitro-react-native/compare/v0.3.2...v0.3.3) (2026-03-26)


### Features

* bump rive-ios to 6.18.0 and rive-android to 11.3.1 ([#193](https://github.com/rive-app/rive-nitro-react-native/issues/193)) ([bad9c60](https://github.com/rive-app/rive-nitro-react-native/commit/bad9c604cf414a87c25f2fecf1ba36c6191c8409))


### Bug Fixes

* **android:** animation freezes when file has ViewModels but no artboard default ([#196](https://github.com/rive-app/rive-nitro-react-native/issues/196)) ([21c71fd](https://github.com/rive-app/rive-nitro-react-native/commit/21c71fd3cd3832bcbc4059d443ab0cfbf642f53b))

## [0.3.2](https://github.com/rive-app/rive-nitro-react-native/compare/v0.3.1...v0.3.2) (2026-03-25)


### Features

* add async API compat layer for experimental migration ([#183](https://github.com/rive-app/rive-nitro-react-native/issues/183)) ([c788ad6](https://github.com/rive-app/rive-nitro-react-native/commit/c788ad6b4ac7496e027ed9507900ecf277d6cce3))

## [0.3.1](https://github.com/rive-app/rive-nitro-react-native/compare/v0.3.0...v0.3.1) (2026-03-19)


### Bug Fixes

* bump iOS runtime to 6.17.0 and Android to 11.2.1 ([#182](https://github.com/rive-app/rive-nitro-react-native/issues/182)) ([a7ca079](https://github.com/rive-app/rive-nitro-react-native/commit/a7ca07955628c475d214ea2b5c0af49f1018dfcd)), closes [#164](https://github.com/rive-app/rive-nitro-react-native/issues/164)

## [0.3.0](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.8...v0.3.0) (2026-03-13)


### ⚠ BREAKING CHANGES

* minimum nitro-modules version is now 0.35.0

### Bug Fixes

* upgrade nitro-modules to 0.35.0 ([#172](https://github.com/rive-app/rive-nitro-react-native/issues/172)) ([c989fa5](https://github.com/rive-app/rive-nitro-react-native/commit/c989fa595036ace3110c4bbe0142f2a8f8a268f6)), closes [#169](https://github.com/rive-app/rive-nitro-react-native/issues/169)

## [0.2.8](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.7...v0.2.8) (2026-03-13)


### Bug Fixes

* Xcode 26 compatibility — strip .Swift submodule from RiveRuntime modulemaps ([#174](https://github.com/rive-app/rive-nitro-react-native/issues/174)) ([e82c4be](https://github.com/rive-app/rive-nitro-react-native/commit/e82c4bee46f50db8f440911f36417c9fae46d463))

## [0.2.7](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.6...v0.2.7) (2026-03-06)


### Features

* setting fallback fonts ([#152](https://github.com/rive-app/rive-nitro-react-native/issues/152)) ([e2c64ea](https://github.com/rive-app/rive-nitro-react-native/commit/e2c64eaf513085e52e543908a05c6598b2316d81))

## [0.2.6](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.5...v0.2.6) (2026-03-05)


### Bug Fixes

* restrict nitro to &lt;0.35, as we are not compatible with 0.35 ([#170](https://github.com/rive-app/rive-nitro-react-native/issues/170)) ([b304000](https://github.com/rive-app/rive-nitro-react-native/commit/b304000e542d524ce112fbe07e8dc575eb69fa70))

## [0.2.5](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.4...v0.2.5) (2026-03-02)


### Bug Fixes

* **android:** pass autoBind to SDK when dataBind is set ([#156](https://github.com/rive-app/rive-nitro-react-native/issues/156)) ([#157](https://github.com/rive-app/rive-nitro-react-native/issues/157)) ([3d8e5a4](https://github.com/rive-app/rive-nitro-react-native/commit/3d8e5a4b16b97b1314e39dc61ad645a20e74d814))
* **ios:** restart render loop after setting state machine inputs ([#162](https://github.com/rive-app/rive-nitro-react-native/issues/162)) ([1349bd8](https://github.com/rive-app/rive-nitro-react-native/commit/1349bd8858e52d015480aaf863293d99645d7f5c)), closes [#161](https://github.com/rive-app/rive-nitro-react-native/issues/161)

## [0.2.4](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.3...v0.2.4) (2026-02-27)


### Features

* add RiveRuntime API for Android init failure handling ([#153](https://github.com/rive-app/rive-nitro-react-native/issues/153)) ([634724e](https://github.com/rive-app/rive-nitro-react-native/commit/634724eb7db2282f47beed791930c3df2bdfd6e6))

## [0.2.3](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.2...v0.2.3) (2026-02-20)


### Bug Fixes

* respect autoPlay={false} in applyDataBinding ([#140](https://github.com/rive-app/rive-nitro-react-native/issues/140)) ([ac976f8](https://github.com/rive-app/rive-nitro-react-native/commit/ac976f8decdee39f1d8d0bc645f24ae40966afd4))

## [0.2.2](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.1...v0.2.2) (2026-02-20)


### Bug Fixes

* pin react-native-harness to exact alpha.25 ([#148](https://github.com/rive-app/rive-nitro-react-native/issues/148)) ([0b2c618](https://github.com/rive-app/rive-nitro-react-native/commit/0b2c61884f83602ea2768a47a58e7c363c1b9443))
* stabilize useRiveEnum options to prevent setValue identity churn ([#145](https://github.com/rive-app/rive-nitro-react-native/issues/145)) ([372d4ae](https://github.com/rive-app/rive-nitro-react-native/commit/372d4ae1f5e06fc2be4f0d9fb3daab1ddb4bcd36))

## [0.2.1](https://github.com/rive-app/rive-nitro-react-native/compare/v0.2.0...v0.2.1) (2026-01-23)


### Features

* useViewModelInstance use name and artboardName when getting vmi from a file ([#129](https://github.com/rive-app/rive-nitro-react-native/issues/129)) ([5615654](https://github.com/rive-app/rive-nitro-react-native/commit/56156545442b8f529d559cdcf96df523026fbe16))

## [0.2.0](https://github.com/rive-app/rive-nitro-react-native/compare/v0.1.5...v0.2.0) (2026-01-20)


### ⚠ BREAKING CHANGES

* upgraded to Nitro 0.33.2 to fix view recycling

### Bug Fixes

* **ios:** upgrade to Nitro 0.33.2 with Xcode 16.4 compatibility ([2ae4ea5](https://github.com/rive-app/rive-nitro-react-native/commit/2ae4ea5efd604222b46134cc6394151198ba1653))
* upgraded to Nitro 0.33.2 to fix view recycling ([2ae4ea5](https://github.com/rive-app/rive-nitro-react-native/commit/2ae4ea5efd604222b46134cc6394151198ba1653))

## [0.1.5](https://github.com/rive-app/rive-nitro-react-native/compare/v0.1.4...v0.1.5) (2026-01-14)


### Features

* add in-app test runner ([#106](https://github.com/rive-app/rive-nitro-react-native/issues/106)) ([d7ace51](https://github.com/rive-app/rive-nitro-react-native/commit/d7ace51d9579b85a71454be4a31adc9732a8dfba))
* bump native versions for scripting support ([#121](https://github.com/rive-app/rive-nitro-react-native/issues/121)) ([d7119b3](https://github.com/rive-app/rive-nitro-react-native/commit/d7119b38551bbd7817b7359551c0c7b0dbb5a54f))

## [0.1.4](https://github.com/rive-app/rive-nitro-react-native/compare/v0.1.3...v0.1.4) (2026-01-09)


### Features

* add data binding artboards support ([#95](https://github.com/rive-app/rive-nitro-react-native/issues/95)) ([515070e](https://github.com/rive-app/rive-nitro-react-native/commit/515070ed673fa267426ebd99fa3f1cc2ec561d97))
* add release-please for automated releases ([#109](https://github.com/rive-app/rive-nitro-react-native/issues/109)) ([6403bd4](https://github.com/rive-app/rive-nitro-react-native/commit/6403bd4ffe8a5254773b860049d77842c6ad9d76))
* add viewModel and replaceViewModel for nested ViewModel access ([#96](https://github.com/rive-app/rive-nitro-react-native/issues/96)) ([3f61c98](https://github.com/rive-app/rive-nitro-react-native/commit/3f61c983f067fec381cb686a5eabcedb229441e3))


### Bug Fixes

* add missing NitroModules import in HybridViewModelInstance ([#107](https://github.com/rive-app/rive-nitro-react-native/issues/107)) ([6bc90fc](https://github.com/rive-app/rive-nitro-react-native/commit/6bc90fc567ad1c9f5930d29224fe406e7be2acaa))
* read initial value in useRiveProperty hooks ([#97](https://github.com/rive-app/rive-nitro-react-native/issues/97)) ([26223f2](https://github.com/rive-app/rive-nitro-react-native/commit/26223f2cbfde703df4e1d91a97d9f69a7a518219))

## [0.1.3](https://github.com/rive-app/rive-nitro-react-native/compare/v0.1.2...v0.1.3) (2024-12-20)

### Features

* add data binding artboards support
* add viewModel and replaceViewModel for nested ViewModel access

### Bug Fixes

* prevent infinite re-renders with unstable useRiveFile input
* read initial value in useRiveProperty hooks

## [0.1.2](https://github.com/rive-app/rive-nitro-react-native/compare/v0.1.1...v0.1.2) (2024-12-06)

### Features

* initial stable release with Nitro modules

## [0.1.1](https://github.com/rive-app/rive-nitro-react-native/releases/tag/v0.1.1) (2024-11-29)

### Features

* initial beta release
