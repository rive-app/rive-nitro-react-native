# test-assets

Images the harness tests and example app load by URL, served from
`https://raw.githubusercontent.com/rive-app/rive-nitro-react-native/test-assets/images/<name>`.

This branch has no shared history with `main`. Don't delete or force-push it: the URLs above would break.

Regenerate the images with Pillow:

```sh
python3 make-images.py images "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
```
