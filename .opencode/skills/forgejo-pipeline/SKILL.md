---
name: forgejo-pipeline
description: Use when integrating Forgejo repositories, provisioning student projects, processing push webhooks, or coalescing commit analysis jobs.
---

# Forgejo Pipeline

Provision repositories idempotently and link organization, class, activity,
student, branch, and commit. Validate raw-body HMAC, delivery ID, allowed push
event, branch, repository binding, payload size, and replay window before enqueue.
Use a database uniqueness key as authority; BullMQ deduplication is only a queue
optimization. Preserve commit ordering and make retries/reprocessing safe.
