# Security policy

Clyvora Resize is beta software. Report vulnerabilities privately to **security@clyvora.tech**. Do not attach confidential images or publish exploit details in a public issue.

The image boundary is enforced using encoded-dimension parsing before browser decoding, source/output pixel limits, decoded-memory estimates, one active image, strict same-origin networking, and cleanup of object URLs, decoded bitmaps, canvases, and cancelled results.

