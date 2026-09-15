---
title: "3.1 Mobile Photography"
description: "Preserves the original mobile-photography note: hardware, camera modes, focus, exposure, HDR, RAW, metering, and editing."
translationOf: "photography/mobile-photography"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

> **Note:** This page preserves the original VNote file boundary, chapter order, and learning-record style. Before publication in 2026, only clear factual errors, stale wording, and local image references that cannot render on the public site were minimally corrected. Fixed parameter values are historical experiments, not universal recipes.

## 1. Phone Camera Hardware

### 1.1. Megapixels

Pixel count determines the sampled image dimensions, but "how many megapixels are enough" depends on output size, cropping, optics, and computational processing.

For ordinary social-media sharing, the highest-resolution mode is often unnecessary.

### 1.2. Sensor

Sensor size matters because it affects light collection, depth of field possibilities, noise, dynamic range, and the constraints of the optical system.

### 1.3. Computational Photography

Portrait-mode blur on phones usually depends heavily on computational depth estimation and synthetic blur. At the same time, real optical depth of field still comes from focal length, aperture, focusing distance, and sensor size.

## 2. Phone Accessories

A selfie stick with tripod support can work as a lightweight phone tripod.

## 3. Phone Camera Functions

### 3.1. Xiaomi / Android Camera Modes

The exact names and layout are version- and model-specific. The notes below preserve the original Xiaomi workflow, but current firmware should be treated as the source of truth.

#### 3.1.1. Normal Mode

##### 3.1.1.1. Center Controls

###### 3.1.1.1.1. Focus

Autofocus is the default. The phone tries to identify a subject with sufficient contrast and prominence.

You can also tap the screen to choose a focus area.

**Focus lock:** on many phone camera apps, a long press can lock focus so that recomposition does not immediately trigger a new focus decision. The exact gesture depends on the app/version.

###### 3.1.1.1.2. Exposure Adjustment

The phone normally estimates an exposure automatically from the scene and/or the tapped area.

A common UI is an exposure slider next to the focus indicator. Moving it upward increases exposure compensation; moving it downward decreases it.

Some apps also support AE/AF lock by long-pressing a point.

##### 3.1.1.2. Left-Side / Auxiliary Controls

###### 3.1.1.2.1. HDR

HDR is useful for scenes with a large brightness range, where a single exposure may clip highlights or block shadows.

Modern phone HDR/computational photography usually combines multiple frames or multiple processing paths to retain highlight and shadow information. The implementation is not necessarily exactly three exposures; frame count and processing differ by phone and algorithm.

###### 3.1.1.2.2. AI Scene Recognition

The app attempts to identify the scene and automatically adjusts processing/settings.

###### 3.1.1.2.3. Flash

The original note generally avoided direct phone flash because it can look harsh. It can still be useful as fill or in emergencies.

###### 3.1.1.2.4. Filters

The original workflow generally avoided built-in filters and preferred editing later.

###### 3.1.1.2.5. Grid and Level

Enable them when they help with alignment and composition.

###### 3.1.1.2.6. Burst

Some camera apps let you configure a long press of the shutter button to trigger burst shooting.

##### 3.1.1.3. Zoom / Focal-Length Selection

Use the phone's native focal-length buttons or marked magnifications when possible, such as 0.6×, 1×, or a telephoto value available on that phone.

These positions are more likely to use a dedicated camera module, but modern phones may also blend multiple cameras or crop digitally. A slider should therefore not be treated as guaranteed "pure optical zoom."

Continuous pinch zoom often includes digital cropping and may reduce image quality.

#### 3.1.2. Portrait Mode

##### 3.1.2.1. Simulated Aperture / Background Blur

Portrait mode commonly lets you control the strength of synthetic background blur. The displayed "aperture" may represent an effect rather than a physical aperture change.

#### 3.1.3. Pro / Manual Mode

##### 3.1.3.1. Center Area

###### 3.1.3.1.1. Exposure

Some pro modes separate focus and metering/exposure controls.

If one area is dark but tapping it causes bright areas to clip, possible responses include:

1. Adjust exposure compensation manually.
2. Use a different metering target.
3. Protect highlights and recover shadows in RAW when feasible.
4. Use HDR/computational capture if the subject permits.

##### 3.1.3.2. Auxiliary Tools

###### 3.1.3.2.1. RAW

RAW/DNG preserves substantially more of the camera pipeline's original data and post-processing latitude than a finished JPEG. It is digital source data, not literally film.

###### 3.1.3.2.2. Focus Peaking

Focus peaking marks high-contrast edges that are likely to be in focus. The color and display behavior depend on the phone/app.

Use it together with manual focus as an aid; it is not absolute proof that every marked area is perfectly focused.

###### 3.1.3.2.3. Exposure Feedback

Some apps show clipping or exposure warnings using colored overlays, zebras, or other indicators. The exact colors and meanings depend on the software.

###### 3.1.3.2.4. High-Resolution Mode

Whether to use a 48 MP or other high-resolution mode depends on light, motion, storage, and the need to crop.

Normal mode is usually more convenient; high-resolution mode can help when light is good and fine detail matters.

###### 3.1.3.2.5. Metering

Pro modes may expose several metering patterns. Matrix/average metering is a good default; center-weighted or spot metering can be selected when the scene requires more deliberate control.

##### 3.1.3.3. Right-Side Parameters

###### 3.1.3.3.1. Focal Length / Camera Module

Choose between ultra-wide, wide, telephoto, or other modules provided by the phone.

###### 3.1.3.3.2. Exposure Compensation

Use EV when an automatic/semi-automatic exposure result should be brighter or darker.

###### 3.1.3.3.3. ISO

Keep ISO as low as practical while still achieving the shutter speed and aperture constraints of the scene.

###### 3.1.3.3.4. Shutter Speed

Choose according to subject motion, hand-held stability, and desired motion blur.

###### 3.1.3.3.5. Manual Focus

Use together with magnification or focus peaking when precise fixed focus is needed.

###### 3.1.3.3.6. White Balance

Auto WB is a useful starting point; manual Kelvin/Tint controls can be used for consistency or creative intent.

### 3.2. Metering

Professional/manual modes may provide multiple metering patterns. Their exact names and behavior are device-specific.

### 3.3. Aspect Ratio

Many phone main-camera sensors are close to 4:3, so a 4:3 mode often preserves more of the captured sensor area. 16:9 or full-screen ratios are frequently crops, although the exact implementation depends on the phone.

## 4. Mobile Post-Processing

### 4.1. Snapseed

[Snapseed tutorial series - Bilibili](https://www.bilibili.com/video/BV197411w76H?p=1&vd_source=79c9f80f56384444d88bfb3e4cf579df)

## 5. References

- [Photography-eye course - Bilibili](https://www.bilibili.com/video/BV1Nh41197rV?p=3&vd_source=79c9f80f56384444d88bfb3e4cf579df)

Historical Xiaomi camera tutorials:

- [Xiaomi camera switches/settings - Bilibili](https://www.bilibili.com/video/BV1yK4y1V7QT/?spm_id_from=333.999.0.0&vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [Xiaomi portrait-mode settings - Bilibili](https://www.bilibili.com/video/BV1YV41187co/?spm_id_from=333.999.0.0&vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [Xiaomi Pro-mode tutorial - Bilibili](https://www.bilibili.com/video/BV1Cz4y1z7hH/?spm_id_from=333.337.search-card.all.click&vd_source=79c9f80f56384444d88bfb3e4cf579df)

Tripod/self-shooting references:

- [How to choose/use a tripod - Bilibili](https://www.bilibili.com/video/BV1x44y1u7Py/?spm_id_from=333.999.0.0&vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [Tripod self-portrait tutorial - Bilibili](https://www.bilibili.com/video/BV1AT411F7Y5/?vd_source=79c9f80f56384444d88bfb3e4cf579df)
- [Self-photography with a tripod - Bilibili](https://www.bilibili.com/video/BV1VN4y1A7En/?spm_id_from=333.337.search-card.all.click&vd_source=79c9f80f56384444d88bfb3e4cf579df)
