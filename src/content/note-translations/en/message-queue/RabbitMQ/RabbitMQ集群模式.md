---
title: "3.3 RabbitMQ Clustering and Quorum Queues"
description: "Modern RabbitMQ cluster responsibilities, queue data placement, quorum queues, leader/follower replication, and the legacy status of mirrored classic queues."
translationOf: "message-queue/RabbitMQ/RabbitMQ集群模式"
language: "en"
updatedAt: "2026-09-15T06:40:00Z"
---

## 1. RabbitMQ Cluster

RabbitMQ nodes in a cluster share cluster metadata and allow clients to connect to multiple nodes, but **queue data placement depends on queue type**.

A cluster by itself does not mean every queue's messages are copied to every node.

## 2. Classic Queues

A classic queue has a leader/node placement model and is not automatically highly available merely because the broker belongs to a cluster.

Older RabbitMQ deployments used **mirrored classic queues** to replicate queue contents. That model is legacy/deprecated in modern RabbitMQ and should not be the default recommendation for new systems.

## 3. Quorum Queues

Quorum queues replicate a queue across a configured group of RabbitMQ nodes using Raft.

One member is the leader; followers replicate the log. The queue remains available while the required quorum can operate.

This provides a much clearer high-availability model than the historical "ordinary cluster vs. mirror every queue on every node" explanation.

## 4. Trade-Offs

Replication costs network, disk, and latency. More replicas are not free.

Design for:

- expected node failures;
- storage capacity;
- publisher confirm latency;
- consumer throughput;
- network partitions.

## 5. Client Connections

Clients should be given multiple endpoints/load-balanced discovery and reconnect logic. A highly available queue is not useful if every client only knows one failed broker address.