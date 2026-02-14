# Changelog

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
