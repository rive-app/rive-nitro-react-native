# Description
This PR adds URL-based asset caching to the `ReferencedAssetLoader` on both Android and iOS platforms. The implementation introduces a dedicated `URLAssetCache` module that caches downloaded HTTP/HTTPS assets to disk, improving performance by avoiding redundant network requests for the same assets.

## Linear Ticket / References

<!-- Add Linear ticket reference here -->

## Changes Made

### URL Asset Caching
- **New `URLAssetCache` Module**: Created a dedicated caching system for URL-based assets on both platforms
  - **Android** (`URLAssetCache.kt`): 
    - Uses SHA-256 hashing for cache key generation
    - Cache directory: `cacheDir/rive_url_assets/`
    - Thread-safe operations with error handling
    - Provides `getCachedData()`, `saveToCache()`, and `clearCache()` methods
  
  - **iOS** (`URLAssetCache.swift`):
    - Uses CryptoKit's SHA256 for cache key generation
    - Cache directory: `cachesDirectory/rive_url_assets/`
    - Thread-safe operations with silent error handling
    - Provides static methods for cache operations

### ReferencedAssetLoader Updates
- **Cache Integration**: Both Android and iOS loaders now check the cache before downloading HTTP/HTTPS assets
  - Cache lookup occurs before network requests
  - Downloaded assets are automatically saved to cache
  - Non-URL assets (bundled, resources) bypass the cache and use direct loading
  - Cache operations are transparent to the asset loading flow

- **Asset Cache Management in `createCustomLoader`**:
  - Assets are immediately saved to the cache map when encountered (by both `uniqueName` and `name` keys)
  - **Enables Dynamic Asset Updates**: This allows users to pass in new `referencedAssets` later in the file lifecycle. Since assets are cached immediately, new referenced assets can be provided and will properly associate with existing file assets throughout the file's lifecycle.

### Additional Changes
- **HybridViewModelImageProperty Fix**: Fixed listener callback to properly handle value changes by mapping to `Unit` instead of empty map

## Testing

1. **URL Caching Test**:
   - Load a Rive file with HTTP/HTTPS referenced assets
   - Verify assets are downloaded and cached on first load
   - Reload the same file and verify assets are loaded from cache (faster load time, no network request)
   - Verify cache directory exists at `cacheDir/rive_url_assets/` (Android) or `cachesDirectory/rive_url_assets/` (iOS)

2. **Cache Persistence Test**:
   - Load assets, close the app
   - Reopen the app and load the same file
   - Verify assets are still loaded from cache (persistent across app restarts)

3. **Non-URL Assets Test**:
   - Load a Rive file with bundled or resource assets
   - Verify these assets bypass the cache and load directly (no cache directory created for them)

4. **Dynamic Asset Updates Test**:
   - Load a Rive file with initial referenced assets
   - Update the referenced assets later in the file lifecycle
   - Verify new assets are properly associated and loaded

5. **Cross-platform Verification**:
   - Test on both Android and iOS devices
   - Verify consistent caching behavior across platforms

## Screenshots (if applicable)
<!-- Add any relevant screenshots to showcase the changes -->

## Additional Information

### Technical Details
- **Cache Key Generation**:
  - **Android**: SHA-256 hash of the URL (64-character hex string)
  - **iOS**: SHA256 hash using CryptoKit (64-character hex string)
  - Both approaches ensure deterministic, filesystem-safe cache keys

- **Cache Storage**:
  - Files are stored with hashed filenames to avoid filesystem issues with special characters in URLs
  - Cache directory is created automatically if it doesn't exist
  - Cache persists across app restarts (stored in app's cache directory)

- **Cache Strategy**:
  - Cache-first approach: checks cache before network requests
  - Write-through: downloaded assets are immediately cached
  - Best-effort: cache failures don't block asset loading
  - Only HTTP/HTTPS URLs are cached; other asset sources (bundled, resources) bypass cache

- **Asset Cache Management**: The `createCustomLoader` function now immediately caches all assets (both by `uniqueFilename`/`uniqueName` and `name`) when they are first encountered, regardless of whether they've been loaded yet. This ensures:
  - The cache map is always up-to-date
  - Assets can be updated/reloaded with new referenced asset data
  - New referenced assets can be provided and will properly associate with existing file assets

### Performance Impact
- **Positive**: Eliminates redundant network requests for cached assets
- **Positive**: Faster asset loading for previously downloaded assets
- **Positive**: Reduced bandwidth usage
- **Neutral**: Minimal disk space usage (cached files stored in app cache directory, can be cleared by system)
- **Neutral**: Minimal overhead for cache lookups (synchronous file I/O, but only for URL assets)

### Breaking Changes
None - this is a backward-compatible enhancement. Existing functionality remains unchanged, with caching added as an optimization layer.

## Developer Checklist

- [x] My code adheres to the coding and style guidelines of the project.
- [x] I have performed a self-review and testing of my own code.
- [x] I have commented my code and/or added documentation, particularly in hard-to-understand areas.
- [x] I confirm that I have not introduced any secrets directly in this code
- [x] I confirm that I have done my best to avoid security issues (SQL Injection, using trusted and up-to-date components and other [OWASP vulnerabilities](https://owasp.org/Top10/))

## Reviewer Checklist

- [ ] I understand the intent of this code.
- [ ] I have reviewed the code and approve of the approaches taken.
- [ ] I confirm that no secrets have been introduced directly in this code.
- [ ] I confirm that I have done my best to review for security issues (SQL Injection, using trusted and up-to-date components and other [OWASP vulnerabilities](https://owasp.org/Top10/))
