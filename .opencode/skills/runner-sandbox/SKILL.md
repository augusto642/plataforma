---
name: runner-sandbox
description: Use when implementing or reviewing Java, Portugol, HTML/CSS execution, sandboxing, resource limits, or RunnerResult normalization.
---

# Runner Sandbox

Apply ExecutionContract: pinned image/runtime, unprivileged UID, dropped
capabilities, seccomp, ephemeral filesystem, network default-deny, CPU/memory/
process/disk/output limits, wall and CPU timeouts, and cleanup after every run.
Test escape, fork bomb, symlink, filesystem, DNS/egress, metadata, and output
exhaustion. Normalize compile, runtime, timeout, signal, and internal errors.
