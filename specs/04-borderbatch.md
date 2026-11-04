# BorderBatch: No-Crop Borders & Watermark for Instagram

## Store listing
- **Name:** BorderBatch: No-Crop Borders & Watermark for Instagram
- **Summary:** Batch-add white borders, 4:5 no-crop frames & watermarks to photos in your browser. Removes GPS data. Nothing is uploaded.
- **Category:** Photos
- **SEO keywords:** no crop instagram, white border photo, instagram 4:5 resize, batch watermark photos, add border to image, remove exif gps, instagram photo resizer

## Problem
Photographers editing on a computer want to post full uncropped photos to Instagram in 4:5 or 1:1, with a consistent border and watermark, and without leaking GPS location. Almost all no-crop tools are phone apps that handle one image at a time.

## Competition
- **iPhone apps:** BatchPad, Simple Border, Squarify, White Border.
- **Websites:** generic resizers.
- **Chrome extensions:** some watermark tools (Watermarkly), but no combined border + 4:5 + watermark + EXIF-strip batch tool.

**Our edge:** desktop batch processing, fully offline/private, one-time price.

## MVP (free)
- Drag up to **5 images** into the side panel.
- Presets: 4:5 (1080×1350), 1:1 (1080×1080), 9:16 Story (1080×1920), 3:4 (1080×1440, Instagram's taller format; confirm current recommended sizes at build time).
- Border color (white/black/custom) and border thickness.
- Download one by one.
- GPS and EXIF data removed automatically (re-saving through canvas does this).

## Pro ($12 one-time)
- Unlimited batch size + **ZIP download** (JSZip).
- Text or logo watermark: position, opacity, size.
- Saved presets ("My IG style").
- Carousel splitter: cut a panorama into 2–10 seamless 4:5 tiles.
- Optional mild sharpening for web; JPEG quality slider.

## Tech
- MV3 **side panel** UI (`chrome.sidePanel`). All processing via `OffscreenCanvas` in a Web Worker.
- High-quality downscaling (stepwise halving, then the final scale).
- Keep the color profile: convert to sRGB using canvas `colorSpace: 'srgb'`.
- **Permissions:** `storage`, `sidePanel`, `downloads`. **No host permissions**, which makes Chrome review very easy.

## Acceptance tests
- [ ] A 6000×4000 JPEG becomes 1080×1350 with even borders, under 1.5 MB.
- [ ] The output file has no GPS data (check with exiftool).
- [ ] A batch of 50 images processes in under 30s on an average laptop.

## Risks
- Low price × low conversion. Upsell with a "Photographer Toolkit" bundle with GoldenMap and LensLedger.
