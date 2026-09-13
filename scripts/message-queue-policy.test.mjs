import assert from "node:assert/strict";
import test from "node:test";

import { CATEGORY_LABELS, CATEGORY_SLUGS, LEGACY_IMPORT_IDS, REVIEWED_NOTE_PATHS, ROOT_TOPIC_LABELS } from "./content-policy.mjs";
import { sourceExclusionReason } from "./import-vnotes.mjs";

test("Message Queue is one category with Kafka and RabbitMQ topics", () => {
  assert.equal(CATEGORY_LABELS.Message_Queue, "Message Queue");
  assert.equal(CATEGORY_SLUGS.Message_Queue, "message-queue");
  assert.equal(ROOT_TOPIC_LABELS.Message_Queue, "Fundamentals");
  assert.deepEqual(LEGACY_IMPORT_IDS["message-queue"], ["kafka-message-queue"]);
  const reviewed = REVIEWED_NOTE_PATHS.Message_Queue;
  assert.equal(reviewed.size, 19);
  for (const path of [
    "Message_Queue/消息队列介绍.md",
    "Message_Queue/消息队列消息的顺序性.md",
    "Message_Queue/Kafka/Kafka介绍.md",
    "Message_Queue/Kafka/Kafka架构.md",
    "Message_Queue/RabbitMQ/RabbitMQ.md",
    "Message_Queue/RabbitMQ/RabbitMQ集群模式.md",
  ]) assert.equal(reviewed.has(path), true, path);
  assert.equal(sourceExclusionReason({ sourcePath: "Message_Queue" }, "OtherMQ.md"), "not-reviewed");
});
