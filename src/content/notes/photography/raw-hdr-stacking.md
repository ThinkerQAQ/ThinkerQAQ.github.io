---
title: "4.1 RAW、动态范围、HDR 与堆栈"
description: "区分 RAW/JPEG、动态范围、曝光包围、HDR、焦点位移与焦点堆栈，避免把不同的多张合成方法混为一谈。"
sourcePath: "Others/摄影/尼康Z5.md"
category: "photography"
categoryLabel: "Photography"
topic: "digital-workflow"
topicLabel: "4.Digital Workflow"
order: 9
tags: ["Photography", "RAW", "HDR", "Focus Stacking"]
updatedAt: "2026-09-15T05:30:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. RAW 和 JPEG 是不同阶段的数据

JPEG 是已经经过相机处理、去马赛克、白平衡、色彩映射、锐化等步骤后的成品图像格式。

RAW 更接近传感器原始采样数据及其元数据，需要 RAW 转换器解释后才能得到最终图像。

因此 RAW 的优势主要是：

- 更大的影调和白平衡调整空间；
- 更高位深的工作数据；
- 可以用不同渲染方式重复解释原始数据。

但 RAW 不是“完全未处理的真相”。不同相机的 RAW 结构、压缩、位深和黑电平处理都可能不同。

## 2. Picture Control 与 RAW

机内 Picture Control 会直接影响 JPEG 和机内预览。

对于 RAW，像素采样本身不会因为之后选择不同 Picture Control 而被重新改写，但相机设置可以记录在元数据中，Nikon NX Studio 或 Lightroom 的 Camera Matching 等工作流可以把这些信息作为渲染起点。

所以“Picture Control 对 RAW 完全没有任何影响”说得太绝对；更准确的是：它不把 RAW 原始采样永久烘焙成某个外观。

## 3. 动态范围

动态范围描述相机能够同时记录的亮部与暗部信息范围。

高反差场景中，如果最亮区域和最暗区域超出单张照片的可记录范围，就会出现：

- 高光剪切；
- 阴影噪声非常高或失去细节。

这时才需要考虑多张曝光。

## 4. 曝光包围与 HDR

**曝光包围（bracketing）**只是自动拍摄多张不同曝光的照片。

**HDR**是一类高动态范围结果或处理流程。用曝光包围照片合成 HDR 是常见方法，但两者不是同一个按钮概念。

Lightroom Classic 可以把曝光包围序列合成为 HDR DNG，并提供：

- Auto Align；
- Auto Settings / Auto Tone；
- Deghost；
- Deghost Overlay；
- Create Stack。

去鬼影强度不是越高越好。没有运动时尽量少用；只有移动物体造成半透明或错位时再增加。

## 5. 焦点位移与焦点堆栈

**焦点位移拍摄**是在拍摄阶段依次改变对焦距离，生成一组焦点不同的照片。

**焦点堆栈**是在后期把每张最清晰的区域合成，得到更大的有效景深。

它和 HDR 的区别：

| 方法 | 变化维度 | 解决问题 |
| --- | --- | --- |
| 曝光包围 / HDR | 曝光 | 动态范围不足 |
| 焦点位移 / Focus Stack | 对焦距离 | 景深不足 |

## 6. Nikon Z5 的焦点位移

Z5 的 Focus Shift Shooting 会从起始焦点逐步向更远距离移动，最多可设置 300 张。达到无穷远后，序列可能在设定张数之前结束。

因此“设置 100 张但只拍了 22 张”不一定是故障；张数是上限，而不是必须拍满的数量。

## 7. Lightroom 的 Stack 不等于 Focus Stack

Lightroom Classic 的 **Stacking** 主要是图库组织功能，把相似照片折叠成一组。

它并不会自动把不同焦点区域融合成一张照片。

真正的焦点融合可以把照片送到 Photoshop，执行：

1. Load / Open as Layers；
2. Auto-Align Layers；
3. Auto-Blend Layers → Stack Images。

不要因为两个功能都叫“stack”就把它们混成一件事。

## 8. 多张合成的现场要求

无论 HDR 还是焦点堆栈，都尽量保持：

- 机位不变；
- 构图不变；
- 白平衡一致；
- 主体尽量静止；
- 曝光和对焦只改变需要改变的维度。

多张合成是在突破单张限制，不是为了把每张照片都变成复杂流程。

## 参考

- Nikon Z5 Online Manual: *Focus Shift Shooting*
- Adobe Lightroom Classic: *HDR Photo Merge*
- Adobe Photoshop: *Create composite images with extended depth of field*
