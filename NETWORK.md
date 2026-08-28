# Network boundary

Image contents and filenames remain in the browser during normal use. Clyvora Resize has no image-upload or remote-processing endpoint. Its production Content Security Policy restricts connections to the application's own origin.

The browser test in `tests/browser/privacy.spec.ts` selects and converts a real image while recording every request. It fails on unexpected origins, request bodies, or the selected filename. Same-origin application files and Vercel's same-origin page-view endpoint are the only approved traffic.

