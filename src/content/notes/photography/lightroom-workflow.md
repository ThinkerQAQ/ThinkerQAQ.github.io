---
title: "4.2 Lightroom 后期工作流"
description: "以非破坏式编辑为核心，从镜头校正、全局影调、色彩到现代 Masking、降噪和输出建立稳定的 Lightroom 工作流。"
sourcePath: "Others/摄影/摄影后期.md"
category: "photography"
categoryLabel: "Photography"
topic: "digital-workflow"
topicLabel: "4.Digital Workflow"
order: 10
tags: ["Photography", "Lightroom", "Post Processing", "RAW"]
updatedAt: "2026-09-15T05:30:00Z"
status: "historical"
language: "zh"
featured: false
indexable: true
---

## 1. 后期不是“修坏照片”

RAW 工作流的本质是把传感器数据解释成最终图像。

Lightroom Classic 的 Develop 调整是非破坏式的：编辑记录作为参数保存，原始文件不会因为拖动滑块被永久改写。

稳定的顺序比固定滑块数值更重要。

## 2. 第一步：技术校正

### 镜头校正

镜头可能出现：

- 桶形或枕形畸变；
- 暗角；
- 横向或轴向色差。

Lightroom 可以根据 EXIF 中的相机和镜头信息应用 Lens Profile。自动校正是起点，不意味着每张照片都必须 100% 消除镜头特征。

### 透视与水平

建筑向上仰拍产生的汇聚线属于透视效果，不等同于镜头畸变。

可以通过：

- Crop / Rotate；
- Transform / Upright；
- Guided 校正；

处理，但过度拉伸会牺牲边缘画质和画面范围。

## 3. 第二步：选择 Profile 和白平衡

Profile 决定 RAW 的基础色彩和影调解释。Lightroom Classic 提供 Adobe Raw、Camera Matching 和其他 Profile。

白平衡控制整体冷暖和绿—洋红偏移。RAW 可以在后期大范围重新解释白平衡；JPEG 的调整空间通常更有限。

## 4. 第三步：建立全局影调

先看照片想表达的整体明暗，再处理局部。

常用控制包括：

- Exposure；
- Contrast；
- Highlights；
- Shadows；
- Whites；
- Blacks；
- Tone Curve。

不要把“曝光 +1、高光 -50、阴影 +50”当作固定公式。同一个滑块值在不同照片上意义完全不同。

直方图和高光/阴影剪切提示用于发现信息丢失，但最终影调仍由创作目标决定。

## 5. 第四步：颜色

常用工具包括：

- Temp / Tint；
- Vibrance / Saturation；
- Color Mixer / HSL；
- Point Color；
- Color Grading。

Vibrance 和 Saturation 不是简单的“一个高级、一个低级”。前者采用更有选择性的饱和度调整，后者更全局。

## 6. 第五步：局部调整使用 Masking

旧教程常把 Adjustment Brush、Radial Filter、Graduated Filter 当作独立面板。现在 Lightroom Classic 已经统一到 **Masking** 工作流。

当前 Masking 可以使用：

- Subject；
- Sky；
- Background；
- Landscape；
- Objects；
- People；
- Brush；
- Linear Gradient；
- Radial Gradient；
- Range Masks。

局部调整的原则不是“哪里亮就压、哪里暗就拉”，而是建立视觉层级：让重要区域更容易被看见，同时避免局部处理留下明显边界。

## 7. 第六步：细节、锐化和降噪

锐化增强边缘反差，并不能恢复没有记录到的真实细节。

降噪需要在噪声与纹理之间取舍。过度降噪会把树叶、皮肤、建筑纹理一起抹平。

判断细节问题应该在接近 100% 视图检查，同时也要回到最终输出尺寸看实际观感。

## 8. HDR 合并

Lightroom Classic 的 HDR Merge 支持 Auto Align、Auto Settings、Deghost 与 Create Stack。

手持包围时 Auto Align 很有价值；三脚架完全稳定时可以根据实际情况关闭。Deghost 只在画面存在运动错位时逐级增加。

## 9. 输出

导出前决定用途：

- Web：通常优先兼容性高的色彩空间和适当压缩；
- 打印：根据打印流程选择尺寸、色彩管理和输出锐化；
- 继续精修：保留高质量中间文件或直接送入 Photoshop。

后期工作流的目标是可重复，而不是每张照片都套同一组 Preset。

## 参考

- Adobe Lightroom Classic: *Work with image tone and color*
- Adobe Lightroom Classic: *Masking tool*
- Adobe Lightroom Classic: *How to retouch photos*
- Adobe Lightroom Classic: *HDR Photo Merge*
