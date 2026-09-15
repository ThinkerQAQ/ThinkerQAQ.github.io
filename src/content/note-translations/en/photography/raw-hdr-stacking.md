---
title: "4.1 RAW, Dynamic Range, HDR, and Stacking"
description: "Separate raw and JPEG, dynamic range, exposure bracketing, HDR, focus shift, and focus stacking so different multi-frame workflows are not confused."
translationOf: "photography/raw-hdr-stacking"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

## 1. RAW and JPEG Represent Different Stages

JPEG is already a rendered image after camera processing such as demosaicing, white balance, tone/color mapping, and sharpening.

Raw files are closer to sensor sampling data plus metadata and need a raw converter before becoming a final image.

The main benefits of raw therefore include:

- greater tonal and white-balance editing latitude;
- higher-bit-depth working data;
- the ability to reinterpret the same capture with different rendering choices.

Raw is not completely “untouched truth.” Raw structure, compression, bit depth, black-level processing, and metadata differ between cameras.

## 2. Picture Control and RAW

In-camera Picture Controls directly affect JPEG output and previews.

For raw capture, choosing a different Picture Control later does not rewrite the original pixel sampling, but the setting can be stored as metadata. Nikon NX Studio and Lightroom Camera Matching workflows can use camera-style rendering as a starting point.

So “Picture Control has absolutely no effect on raw” is too broad. A better statement is that it does not permanently bake one rendered appearance into the original raw samples.

## 3. Dynamic Range

Dynamic range describes the span of bright and dark information a camera can record at the same time.

When scene contrast exceeds the range of a single frame, you may get:

- clipped highlights;
- shadows with severe noise or no usable detail.

That is when multiple exposures become useful.

## 4. Exposure Bracketing and HDR

**Exposure bracketing** simply captures multiple frames at different exposures.

**HDR** describes a high-dynamic-range result or processing workflow. Combining bracketed exposures is a common way to produce HDR, but the two concepts are not identical.

Lightroom Classic can merge bracketed images into an HDR DNG with controls such as:

- Auto Align;
- Auto Settings / Auto Tone;
- Deghost;
- Deghost Overlay;
- Create Stack.

Higher deghost settings are not inherently better. Start low and increase only when moving objects cause transparent or misaligned artifacts.

## 5. Focus Shift vs. Focus Stacking

**Focus-shift shooting** changes focus distance across a sequence during capture.

**Focus stacking** blends the sharpest region from each image during post-processing to create greater effective depth of field.

This is different from HDR:

| Method | Changing Variable | Problem Solved |
| --- | --- | --- |
| Exposure Bracket / HDR | Exposure | Insufficient dynamic range |
| Focus Shift / Focus Stack | Focus distance | Insufficient depth of field |

## 6. Nikon Z5 Focus Shift

The Z5 Focus Shift Shooting feature moves focus progressively from the starting focus point toward farther distances, with a maximum setting of 300 frames. The sequence can end before the selected maximum once infinity is reached.

So “I asked for 100 images and it stopped at 22” is not necessarily a malfunction. The selected count is a maximum, not a guarantee that every frame will be captured.

## 7. Lightroom Stack Is Not Focus Stack

Lightroom Classic **Stacking** is mainly a catalog-organization feature that groups similar photos together.

It does not automatically blend different focal planes into one extended-depth image.

A true focus blend can be sent to Photoshop and processed with:

1. Load / Open as Layers;
2. Auto-Align Layers;
3. Auto-Blend Layers → Stack Images.

The shared word “stack” does not make the two functions equivalent.

## 8. Capture Discipline for Multi-Frame Workflows

For both HDR and focus stacking, try to keep:

- camera position fixed;
- framing fixed;
- white balance consistent;
- the subject as static as practical;
- only the intended dimension—exposure or focus distance—changing between frames.

Multi-frame techniques exist to exceed a single-frame limitation, not to make every photograph unnecessarily complex.

## References

- Nikon Z5 Online Manual: *Focus Shift Shooting*
- Adobe Lightroom Classic: *HDR Photo Merge*
- Adobe Photoshop: *Create composite images with extended depth of field*
