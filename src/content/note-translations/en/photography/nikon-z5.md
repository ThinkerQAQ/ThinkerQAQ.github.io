---
title: "4.1 Nikon Z5"
description: "Preserves the original Nikon Z5 menu and usage notes, with minimal corrections to RAW, HDR, focus stacking, stabilization, shutter behavior, and related concepts."
translationOf: "photography/nikon-z5"
language: "en"
updatedAt: "2026-09-15T07:00:00Z"
---

> **Note:** This page preserves the original VNote file boundary, chapter order, and learning-record style. Before publication in 2026, only clear factual errors, stale wording, and local image references that cannot render on the public site were minimally corrected. Fixed parameter values are historical experiments, not universal recipes.

# 1. Playback Menu

## 1.1. Dual-Format Recording Playback Slot

When RAW+JPEG are recorded to different cards, this setting controls which slot is shown first during playback.

Historical preference: review the JPEG copy first.

## 1.2. Image Review

Controls whether the camera automatically displays a photo immediately after capture.

Historical preference:

- landscape / deliberate single-shot work: On;
- street photography / fast sequences: Off.

## 1.3. Rotate Tall

Controls how vertically oriented images are shown during playback.

Historical preference: On, so portrait-orientation photos are automatically rotated for easier viewing.

## 1.4. After Delete

Historical preference: continue in the same browsing direction after deleting an image.

## 1.5. Highlights

A useful exposure principle is to push the histogram toward the right only while protecting important highlight detail.

### 1.5.1. Which Highlights Can Be Allowed to Clip?

Often acceptable or less important:

- point light sources;
- direct reflections from the sun;
- specular metal reflections;
- tiny highlights on water.

Usually important to protect:

- cloud texture;
- facial highlights;
- bright building surfaces that carry detail.

## 1.6. Pixels and File Size

A simplified theoretical relationship is:

`uncompressed size ≈ pixel count × data per pixel`

Z5 full-resolution stills are about:

`6016 × 4016 ≈ 24.16 million pixels ≈ 24 MP`

A rendered 8-bit RGB image has three 8-bit channels, or 24 bits / 3 bytes per output pixel before compression. JPEG then applies lossy compression, so actual file size depends heavily on image content and quality settings.

RAW is different:

| Format | Bit depth | Simplified sample precision |
| --- | ---: | ---: |
| RAW | 12-bit | 12 bits per photosite sample |
| RAW | 14-bit | 14 bits per photosite sample |

Why describe RAW with bit depth but JPEG with RGB channels?

- RAW is primarily sensor measurement data.
- JPEG is a rendered image with RGB values for output pixels.

| Dimension | RAW | JPEG |
| --- | --- | --- |
| Processing stage | sensor/source data | rendered image |
| Data representation | mosaiced sensor samples before full RGB rendering | RGB output pixels |
| Precision | commonly 12/14-bit source samples | commonly 8-bit/channel |
| Compression | lossless or lossy RAW compression depending on setting | lossy JPEG compression |
| Directly displayable everywhere | No | Yes |

# 2. Photo Shooting Menu

## 2.1. Storage Folder and File Naming

These settings mainly affect file organization and naming.

## 2.2. Choose Image Area

- **FX:** uses the full FX image area, about 24 MP.
- **DX:** crops the central area, giving a narrower field of view and fewer pixels.

| Item | FX | DX |
| --- | --- | --- |
| Sensor area used | full FX area | central crop |
| Field of view | wider | narrower, about 1.5× crop |
| Resolution | higher | lower |
| Main use | normal/default | in-camera crop or DX lens use |

Historical default: use FX unless there is a specific reason for DX.

### Can a Wide-Angle Image Simply Be Cropped Into a Telephoto Image?

Cropping can imitate a narrower field of view, but it cannot create detail that was never recorded.

Example:

- 24 mm source image: about 24 MP.
- Crop to the field of view of 120 mm: a 5× linear crop.
- Area retained: approximately `1 / 5² = 1/25`.
- Remaining pixels: roughly 1 MP.

So cropping can make the subject fill more of the final frame, but resolution falls sharply.

Important perspective correction:

- With the **same camera position**, cropping preserves the same perspective/spatial compression.
- The classic "telephoto compression" look appears when a longer lens lets you move farther back while keeping the subject at a similar size.
- Perspective is controlled by camera position, not focal length by itself.

## 2.3. NEF (RAW) Recording

Z5 provides two RAW compression choices:

| Item | Lossless compressed | Compressed |
| --- | --- | --- |
| Data | reversible compression | non-reversible compression |
| File size | larger | smaller |
| Use | maximum preservation | smaller files |

The camera does not offer an "uncompressed NEF" option in this menu.

Bit depth:

| Item | 14-bit | 12-bit |
| --- | --- | --- |
| Source precision / editing latitude | higher | lower |
| Tonal quantization | finer | usually sufficient for many scenes |
| File size | larger | smaller |

A useful engineering model:

- compression mode -> whether/how data is discarded;
- bit depth -> quantization precision.

## 2.4. ISO Sensitivity Settings

Auto ISO is useful, but maximum ISO and minimum shutter speed should be chosen according to subject, lens, stabilization, and acceptable image quality.

Historical personal starting point:

- daylight: max ISO 1600;
- night: max ISO 6400.

These are not universal values.

A rough hand-held shutter starting point is around `1 / equivalent focal length`, but IBIS/VR, subject motion, pixel density, and photographer technique all affect the real limit.

## 2.5. White Balance

Purpose: render neutral objects neutrally under different light sources.

Auto WB is a good default when speed matters, especially with RAW.

## 2.6. Set Picture Control

Picture Controls adjust Nikon's rendering parameters, including:

- Sharpening;
- Mid-range Sharpening;
- Clarity;
- Contrast;
- Brightness;
- Saturation;
- Hue.

They directly affect JPEG and the in-camera preview. RAW sensor data are not permanently rendered in the same way, although Picture Control metadata/preview information can be stored and recognized by compatible software.

Conceptual model:

| Parameter | Main visual scale |
| --- | --- |
| Sharpening | fine edges/detail |
| Mid-range Sharpening | medium-scale structure |
| Clarity | local/mid-scale contrast |
| Quick Sharpening | coordinated overall control |

Historical preference: adjust individual controls rather than relying only on Quick Sharpening.

## 2.7. Color Space

The color space selects the output gamut/encoding for rendered files.

| Item | sRGB | Adobe RGB |
| --- | --- | --- |
| Gamut | smaller | wider |
| Compatibility | very high | lower |
| Typical use | web/general | managed color workflow/print |

This setting mainly affects JPEG/TIFF rendering and metadata. RAW sensor measurements themselves are not permanently converted into one of these output spaces at capture.

## 2.8. Active D-Lighting

Active D-Lighting is an in-camera dynamic-range optimization intended mainly for JPEG/in-camera rendering.

It can protect highlights and lift darker regions, but the exact exposure/curve strategy is controlled by the camera. It should not be reduced to a fixed rule such as "always underexpose and then lift shadows."

## 2.9. Long Exposure Noise Reduction

For long exposures, the camera can perform dark-frame subtraction:

1. capture the actual exposure;
2. capture a dark frame of comparable duration;
3. subtract fixed-pattern/hot-pixel noise.

Trade-off:

- cleaner long-exposure files;
- longer total shooting time;
- reduced ability to shoot continuously.

## 2.10. High ISO Noise Reduction

Primarily affects in-camera rendered output.

Noise and real fine detail both contain high-frequency information, so stronger noise reduction can remove texture along with noise.

## 2.11. Vignette Control

Corrects lens-related corner darkening.

Correction may lift corner brightness, which can also make corner noise more visible.

## 2.12. Diffraction Compensation

Attempts to recover some detail lost to diffraction at small apertures.

First choose aperture according to depth-of-field and lens needs; then treat diffraction compensation as a secondary in-camera correction. There is no universal "f/8 is always optimal" rule.

## 2.13. Flicker Reduction Shooting

Helps avoid brightness/color inconsistency under flickering artificial lights.

## 2.14. Metering

Common Z5 metering choices:

| Mode | Main idea |
| --- | --- |
| Matrix | evaluates the overall scene |
| Center-weighted | gives greater weight to the center |
| Spot | measures a very small area |
| Highlight-weighted | biases exposure to protect highlights |

Practical starting points:

- most ordinary scenes: start with Matrix;
- high-contrast sunsets/stages: Matrix with compensation or Highlight-weighted can be useful;
- Spot: use when you know exactly which local tone you want to place at a certain brightness;
- Center-weighted: useful when the central subject should dominate exposure.

These are choices, not fixed recipes.

## 2.15. Flash Mode

Conceptual differences:

| Mode | Typical purpose |
| --- | --- |
| Fill flash | add light to subject |
| Red-eye reduction | reduce red-eye in close portraits |
| Slow sync | retain more ambient light |
| Slow sync + red-eye | combine both |
| Rear-curtain sync | place motion trail before the final flash-frozen subject position |
| Flash off | natural/ambient light only |

## 2.16. Focus Mode

| Mode | Behavior | Typical use |
| --- | --- | --- |
| AF-S | acquires focus, then holds while activated | static subjects |
| AF-C | continuously updates focus | moving subjects |
| MF | manual focus | deliberate/precision control |

## 2.17. AF-Area Mode

Examples include:

- Single-point;
- Dynamic-area;
- Wide-area;
- Auto-area;
- Subject tracking.

The best area mode depends on subject, camera orientation, and how much control you want.

## 2.18. Vibration Reduction

VR/IBIS compensates for camera movement so slower shutter speeds may remain sharp.

It corrects camera shake; it cannot freeze subject motion.

## 2.19. Auto Bracketing

One shutter sequence records several files with systematic differences—most commonly exposure differences.

Historical example:

- 3 frames;
- ±2 EV.

Bracketing records source frames; it does not automatically mean HDR merging.

## 2.20. Multiple Exposure

Multiple Exposure is a creative compositing feature: several captures are combined into one image.

It is conceptually different from exposure bracketing/HDR because its goal is image overlay rather than extending dynamic range.

## 2.21. HDR

Z5 HDR captures **two exposures** and combines them into an in-camera HDR JPEG.

The camera can also save the individual source frames as NEF (RAW).

| Function | Main idea |
| --- | --- |
| Auto bracketing | capture multiple variations |
| HDR | capture two exposures and merge in camera |
| Active D-Lighting | optimize one rendered frame |

HDR and bracketing are related multi-exposure concepts, but Z5 HDR is its own two-frame capture-and-merge function.

### 2.21.1. Z5 In-Camera HDR vs. Lightroom HDR Merge

| Dimension | Z5 in-camera HDR | Lightroom HDR |
| --- | --- | --- |
| Source frames | 2 | usually 2 or more bracketed frames |
| Output | merged JPEG; individual NEFs can optionally be saved | merged DNG with substantial editing latitude |
| Control | largely automatic | more post-processing control |
| Workflow | fast/direct | slower but flexible |

## 2.22. Focus Shift Shooting

### 2.22.1. Why Can a Sequence Stop Before the Requested Number of Shots?

The requested number of shots is a maximum.

Focus shift starts at the selected focus position and moves toward infinity. Nikon explicitly documents that shooting can end early once focus reaches infinity.

So if 100 frames were requested but shooting stopped at 22, the likely reason is that the focus sequence reached infinity before frame 100.

### 2.22.2. Focus Stacking vs. Exposure Bracketing/HDR

**Focus stacking**

Goal: increase effective depth of field.

- capture several images focused at different distances;
- combine the sharp regions from each image.

Common uses:

- macro;
- landscapes with a close foreground and distant background.

**Exposure bracketing / HDR merge**

Goal: handle a scene whose brightness range exceeds one exposure.

- darker exposure protects highlights;
- brighter exposure records more shadow detail;
- merging combines useful information from different exposures.

| Workflow | Problem | Variable changed | Result |
| --- | --- | --- | --- |
| Focus stacking | insufficient depth of field | focus distance | larger combined depth of field |
| Exposure bracketing + HDR merge | insufficient dynamic range | exposure | more highlight/shadow detail |

Lightroom Classic can merge exposure brackets to HDR. Its ordinary **Stack** feature is catalog organization only; it does not perform focus blending. Focus stacks are usually merged in Photoshop with Auto-Align/Auto-Blend or in dedicated stacking software.

### 2.22.3. Dynamic Range and HDR

Dynamic range is the range between the brightest and darkest scene information that can still be recorded with useful detail.

HDR can mean a high-dynamic-range image/output workflow. Exposure bracketing and merging is one common method of producing such an image.

# 3. Movie Shooting Menu

## 3.1. Video File Format

MOV and MP4 are container formats.

On Z5, the practical choice is usually about compatibility/workflow rather than assuming one inherently gives better image quality.

## 3.2. Focus Mode

### AF-S

Focuses once and holds while activated.

Useful mainly for static video shots.

### AF-C

Continuously updates focus while focus activation is maintained.

Useful for moving subjects, although it is not always the smoothest video behavior.

### AF-F

Full-time AF for video. The camera continually adjusts focus without requiring repeated half-press activation.

Historical default for general video use: AF-F.

### AF-Area Mode

**Auto-area AF with face/eye detection**

Useful for:

- people;
- vlog-style recording;
- following a person.

Potential downside: complex backgrounds or multiple faces can cause target switching.

**Wide-area AF**

A larger focus region in which the camera chooses the target.

Useful when you want some automation but want to restrict the search area.

**Single-point AF**

Precise control for a static target.

**Dynamic-area AF**

Uses a selected point with support from surrounding points; more photo-oriented on this camera.

**Subject tracking**

Select a target and allow the camera to follow it.

Practical combinations recorded in the original note:

- portrait/vlog: AF-F + Auto-area with face/eye detection;
- landscape/street video: AF-F + Wide-area;
- static architecture/night: AF-S/AF-F + Single-point, or MF;
- moving person: AF-F/AF-C + Auto-area or tracking.

Treat these as starting points, not mandatory combinations.

## 3.3. Vibration Reduction and Electronic VR

IBIS/lens VR and Electronic VR solve stabilization differently.

A practical priority is normally:

1. stable camera/support or gimbal when needed;
2. optical/lens/body stabilization;
3. Electronic VR as an additional video tool when its crop/processing trade-offs are acceptable.

### Physical VR / IBIS

- sensor/lens movement compensates for camera shake;
- does not require the same digital crop as Electronic VR;
- useful for hand-held static and slow movements.

Hand-held: usually enable VR.

Tripod/special setups: whether to disable it depends on lens/body guidance and actual behavior.

### Electronic VR

- uses a cropped sensor region plus digital stabilization;
- narrows field of view;
- may introduce warping or rolling-shutter artifacts;
- can improve walking/hand-held video.

Historical examples:

- static landscape: VR on, Electronic VR off;
- gentle hand-held movement: VR on, Electronic VR optional;
- walking video: Electronic VR can help, accepting crop and possible distortion.

## 3.4. Attenuator

The attenuator reduces audio input sensitivity/headroom to lower the chance of clipping in high sound-pressure environments.

Use it for loud sources such as concerts or other very loud environments.

It is not a wind-noise control; wind is better handled with physical wind protection and the dedicated Wind Noise Reduction setting.

Avoid unnecessary attenuation in quiet scenes because later amplification can make the noise floor more noticeable.

## 3.5. Frequency Response

This controls the microphone frequency-response mode.

Typical choices:

### Wide Range

Retains a broader range of environmental frequencies.

Useful for:

- ambience;
- landscapes;
- environmental sound.

### Vocal Range

Prioritizes frequencies important for speech intelligibility and reduces some content outside that range.

Useful for:

- speech;
- vlogs;
- noisy environments where intelligible voice matters more than full ambience.

## 3.6. Wind Noise Reduction

This is in-camera processing intended to reduce wind-generated low-frequency rumble.

Wind often contains strong low-frequency energy, but the exact filter implementation is not a user-exposed parameter.

Use it when wind is clearly hitting the microphone.

Do not rely on it as the primary solution:

1. physical wind protection (foam/furry windshield);
2. choose a sheltered position;
3. orient microphone/camera appropriately;
4. use Wind Noise Reduction as additional processing.

In calm scenes, leaving it off can preserve more low-frequency ambience.

# 4. Custom Settings Menu

## 4.1. Focus Tracking with Lock-On

Controls AF-C behavior when the tracked subject is temporarily blocked or another object crosses the focus area.

Higher persistence values favor staying with the current subject; more responsive values switch sooner.

Historical default: around the middle setting.

## 4.2. Auto-Area AF Face/Eye Detection

A common portrait starting point is AF-C + Auto-area AF + eye detection.

With multiple faces, use the camera controls to choose the intended subject when supported.

AF-S and AF-C can both use face/eye detection in supported AF-area modes; AF-C is more appropriate when the person is moving.

## 4.3. Number of Focus Points

Controls how many selectable AF points are available when manually moving a focus point.

More points:

- finer placement;
- slower movement across the frame.

Reduced points:

- faster movement;
- coarser placement.

Historical preference: all available points for precision.

## 4.4. Store Points by Orientation

Allows separate AF-point positions to be remembered for horizontal and vertical camera orientation.

Useful when portrait and landscape compositions consistently place the subject in different positions.

## 4.5. AF Activation

Controls whether autofocus is started by:

- shutter half-press + AF-ON; or
- AF-ON only.

**Back-button focus** separates focusing from shutter release.

Advantages:

- avoids refocusing when pressing the shutter;
- gives more deliberate control over when AF-C updates.

It is a workflow preference, not a mandatory "advanced" configuration.

## 4.6. Limit AF-Area Mode Selection

You can disable area modes you rarely use so that switching is faster.

Historical personal set:

- Auto-area AF for people/eye detection;
- Single-point AF for precise static/night work;
- Dynamic-area AF for light movement.

Keep or remove modes according to your own subjects.

## 4.7. Focus Point Wrap-Around

Controls whether moving a focus point beyond one edge wraps it to the opposite edge.

## 4.8. Focus Point Options

Controls display/behavior details of the selected focus point.

## 4.9. Low-Light AF

Allows the camera to spend more time/sensitivity trying to acquire focus in very dark conditions.

Historical setting: Off unless specifically needed.

## 4.10. Built-In AF-Assist Illuminator

Uses the camera's front AF-assist lamp in low light when compatible with the current mode.

## 4.11. EV Steps for Exposure Control

Controls the step size used by exposure adjustments.

Common choices:

- 1/3 EV -> finer control;
- 1/2 EV -> fewer dial clicks, coarser changes.

Historical preference: 1/3 EV.

## 4.12. Easy Exposure Compensation

Controls whether exposure compensation can be adjusted directly with a command dial without holding the compensation button.

## 4.13. Center-Weighted Area

Controls the size of the central region given extra weight in center-weighted metering.

## 4.14. Fine-Tune Optimal Exposure

A persistent meter calibration offset, unlike ordinary temporary exposure compensation.

| Item | Fine-tune optimal exposure | Exposure compensation |
| --- | --- | --- |
| Scope | persistent calibration | per-shooting adjustment |
| Typical use | rare | frequent |
| Purpose | meter baseline | current image/scene |
| EV display | may not be shown as ordinary compensation | shown as compensation value |

## 4.15. Shutter-Release Button AE-L

Controls whether half-pressing the shutter also locks exposure.

## 4.16. Shutter-Speed and Aperture Lock

Prevents command dials from changing shutter speed and/or aperture.

Normally leave unlocked for ordinary shooting; lock only when you intentionally want to protect fixed parameters.

## 4.17. Release Button to Use Dial

Controls whether a button must be held while turning a command dial, or whether pressing/releasing the button enters an adjustment state for the dial.

Choose whichever reduces accidental changes while remaining comfortable.

## 4.18. Reverse Indicators

Controls the direction in which positive/negative exposure indications are displayed.

Historical preference: retain the default direction for consistency.

## 4.19. Synchronized Release Mode Options

Used when coordinating shutter release across multiple compatible cameras in a synchronized setup.

## 4.20. Exposure Delay Mode

Adds a short delay between pressing the shutter and actual exposure.

Useful on a tripod when you want to reduce vibration caused by physical interaction with the camera.

Historical default:

- ordinary hand-held: Off;
- vibration-sensitive tripod work: consider enabling.

## 4.21. Shutter Type

### Mechanical Shutter

Uses physical shutter curtains.

Advantages:

- broad compatibility with ordinary subjects and lighting;
- less prone than fully electronic shutter to obvious rolling-shutter distortion.

Trade-offs:

- mechanical sound;
- some mechanical vibration.

### Electronic / Silent Shooting

Uses sensor readout without ordinary mechanical shutter movement.

Advantages:

- silent;
- no mechanical shutter shock.

Trade-offs:

- rolling-shutter distortion with moving subjects/camera;
- banding/flicker under some artificial lighting.

Historical default: Mechanical unless a specific reason calls for silent/electronic capture.

## 4.22. File Number Sequence

Controls whether image file numbers continue to increment across folders/cards or reset under defined conditions.

## 4.23. Apply Settings to Live View

Controls whether the monitor/EVF preview reflects current exposure/rendering settings.

When enabled, the display aims to approximate the effect of the current settings.

When disabled, the viewfinder may remain normalized in brightness even when the final capture will be much brighter or darker.

## 4.24. Framing Grid Display

Shows compositional grid lines in the EVF/monitor.

They do not appear in the recorded image.

Historical preference: On.

## 4.25. Focus Peaking Highlights

In manual focus, focus peaking outlines high-contrast edges that are likely to be near the focus plane.

It is an aid, not a perfect depth-of-field map.

Historical preference: enable when using MF if the display remains readable.

## 4.26. View All in Continuous Mode

Controls how bursts are grouped/presented during playback.

When grouping is used, the interface may show a burst as a group rather than forcing every frame to occupy the top-level playback sequence. The individual photographs still exist; exact expansion behavior depends on firmware/playback UI.
