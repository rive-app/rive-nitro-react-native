# .riv File Catalog

Properties of all .riv files used in this project.

**Legend**: SM = State Machine, DB = Data Binding, AP = Auto-play, OOB = Out-of-band assets

## Local Files (`example/assets/rive/`)

| File | SM | DB | AP | Notes |
|------|----|----|-----|-------|
| `quick_start.riv` | Yes | Yes | Yes | Artboard: `health_bar_v01`. VM props: `health` (number), `gameOver` (trigger). Game health/damage system. |
| `databinding.riv` | Yes | Yes | Yes | Primary data binding test file. `Person` VM with: `age` (number), `name` (string), `likes_popcorn` (bool), `favourite_color` (color), `favourite_pet` (enum), `jump` (trigger). Nested `pet` VM. Enum `Pets`: dog/cat/frog/owl/chipmunk/rat. 2 view models total. |
| `databinding_lists.riv` | Yes | Yes | - | `DevRel` VM with `team` list property. Default 5 items. Tests list mutations. **Experimental crash**: list mutations (removeInstanceAt, swap, addInstanceAt) cause EXC_BAD_ACCESS. |
| `databinding_images.riv` | Yes | Yes | - | `MyViewModel` with `bound_image` image property. **Experimental crash**: EXC_BAD_ACCESS on load. |
| `artboard_db_test.riv` | Yes | Yes | - | Multiple artboards, artboard properties: `artboard_1`, `artboard_2`. **Experimental crash**: EXC_BAD_ACCESS on load. |
| `viewmodelproperty.riv` | Yes | Yes | - | Complex nested VMs: `vm1`/`vm2` instances with nested `pet` VM. Tests replaceViewModel(). |
| `rewards.riv` | Yes | Yes | Yes | Bouncing chest animation by default. Nested property paths: `Coin/Item_Value` (number), `Button/State_1` (string), `Energy_Bar/Bar_Color` (color), `Button/Pressed` (trigger). Works with experimental runtime. |
| `many_viewmodels.riv` | Yes | Yes | - | Named instances: `red`, `green`, `blue`. Image property: `imageValue`. |
| `rating.riv` | Yes | No | No | Static 5-star selector — no auto-play animation, only responds to SM number input: `rating` (0-5). |
| `out_of_band.riv` | Yes | No | - | SM: `State Machine 1`. OOB image (`referenced-image-2929282`), font (`Inter-594377`), audio (`referenced_audio-2929340`). |
| `hello_world_text.riv` | Yes | No | Yes | Text run: `name`. Simple text animation. |
| `click-count.riv` | Yes | No | - | Click counter with pointer events/listeners. |
| `blinko.riv` | Yes | Yes | - | Uses Rive Scripting. DataBindMode.Auto. |
| `layouts_demo.riv` | Yes | No | Yes | Tests Fit.Layout and layoutScaleFactor. |
| `ios_android_layouts_demo_v01.riv` | Yes | No | - | Platform-specific layout testing. |
| `movecircle.riv` | Yes | No | Yes | Simple moving circle animation. |
| `bouncing_ball.riv` | Yes | No | Yes | Physics-based bouncing ball. |
| `font_fallback.riv` | Yes | No | - | Tests font fallback behavior. |
| `arbtboards-models-instances.riv` | Yes | Yes | - | Multiple artboards. Tests artboard/model/instance enumeration. |

## External Files (`example/assets/` root)

| File | SM | DB | AP | Notes |
|------|----|----|-----|-------|
| `lists_demo.riv` | Yes | Yes | - | `DevRel` VM with list. `listItem` VM: `label`, `hoverColor`, `fontIcon`. Menu/list UI demo. |
| `swap_character_main.riv` | Yes | Yes | - | SM: `State Machine 1`. `Card` VM with artboard property `CharacterArtboard`. Artboards: `Main`, `Placeholder`. |
| `swap_character_assets.riv` | No | No | - | External asset file only. Artboards: `Character 1` (Dragon), `Character 2` (Gator). No SM needed. |

## Remote Files (CDN)

| URL | SM | DB | AP | Notes |
|-----|----|----|-----|-------|
| `cdn.rive.app/animations/vehicles.riv` | **No** | No | Yes | Endless looping vehicle parade. No state machine, no interactivity. **Does not work with experimental iOS runtime** (requires SM). |
| `cdn.rive.app/animations/off_road_car_v7.riv` | **No** | No | Yes | Off-road car with idle/bouncing/windshield_wipers timeline animations. No state machine. **Does not work with experimental iOS runtime**. |

## Experimental Backend Compatibility

Files that **crash** the experimental backend:
- `databinding_images.riv` - EXC_BAD_ACCESS on load
- `artboard_db_test.riv` - EXC_BAD_ACCESS on load
- `databinding_lists.riv` - list mutation operations crash

Files that **don't work** with experimental backend:
- `vehicles.riv` (remote) - no state machine, experimental API requires one
- `swap_character_assets.riv` - no state machine (asset-only file)
