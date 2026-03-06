# Changelog

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
