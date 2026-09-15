---
title: "1.4 Direct Memory Access (DMA)"
description: "How DMA lets devices transfer data to and from memory without having the CPU copy each byte, including descriptors, interrupts, and cache/IOMMU considerations."
translationOf: "computer-architecture-assembly/DMA"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

## 1. What Is DMA?

Direct Memory Access lets a device or DMA engine transfer data between device-visible buffers and main memory without requiring the CPU to execute a load/store instruction for every byte.

## 2. Simplified Flow

A typical operation looks like:

1. the CPU/driver prepares descriptors or buffers;
2. the CPU programs the device/DMA engine;
3. the device performs the transfer while the CPU can execute other work;
4. completion is reported through an interrupt, polling, or a completion queue;
5. software processes the result.

This is more accurate than imagining the DMA controller as simply "taking turns owning one shared bus"; modern interconnects and devices are considerably more complex.

## 3. Why DMA Matters

Without DMA, large I/O transfers would require the CPU to copy every unit of data between device registers and memory, wasting execution bandwidth.

DMA is fundamental to:

- storage devices;
- network interfaces;
- GPUs and accelerators;
- audio/video devices.

## 4. DMA Does Not Mean Zero CPU Work

The CPU still:

- sets up descriptors and buffers;
- handles completion;
- processes protocol/application data;
- manages memory ownership and synchronization.

DMA only removes or reduces the need for CPU-mediated bulk copying.

## 5. Coherency and IOMMU

On coherent platforms, hardware helps keep CPU caches and DMA-visible memory consistent. Other systems require explicit cache maintenance.

An IOMMU can translate and restrict device DMA addresses, improving isolation and enabling virtualization.