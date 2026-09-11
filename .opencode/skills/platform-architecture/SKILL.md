---
name: platform-architecture
description: Use when designing or revising learning-platform architecture, domain contracts, SPEC dependencies, or implementation waves.
---

# Platform Architecture

Read the active SPEC and related artifacts before deciding. Freeze versioned
contracts for ActivityVersion, Attempt, RunnerResult, PipelineJob, RBAC,
idempotency, outbox, and data retention. Prefer the smallest executable vertical
slice and document dependencies, rejected alternatives, handoffs, and gates.

Never let an implementation invent a contract that affects another service.
