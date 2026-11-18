# Security and deployment operations

## Release sequence

1. Validate the Compose configuration and required secrets: `docker compose config -q`.
2. Build the production API and web images and run the database migration service before starting new API replicas. Do not run Prisma migrations from every API instance.
3. Check `docker compose ps` and the API health endpoint before considering a release complete. Keep the previous image tags available until the new release is healthy.
4. Do not enable external job research, live billing, or OAuth until the corresponding provider credentials, budgets, callback URLs, and webhook secrets are configured.

## Dedicated Piston runner

The upstream Piston container requires `privileged: true`; do not run it on the application host in production. Provision a separate, disposable VM connected to the API host over an encrypted private network (for example, WireGuard), then run the worker stack from the repository root:

```sh
export PISTON_BIND_IP=<private-vpn-ip-on-runner-vm>
export PISTON_AUTH_TOKEN="$(openssl rand -hex 32)"
docker compose -f docker-compose.piston-worker.yml config -q
docker compose -f docker-compose.piston-worker.yml up -d --build
```

Configure the API host with the same `PISTON_AUTH_TOKEN` and `PISTON_URL=http://<private-vpn-ip-on-runner-vm>:2000`. Bind only to the runner VM's private VPN address and firewall port 2000 to accept traffic only from the API host; never bind the unauthenticated Piston port publicly. The gateway compares the bearer token in constant time and exposes only `POST /api/v2/execute`; package administration remains inside the worker network. The regular Compose stack keeps a local runner only behind the explicit `local-piston` profile. The VM, VPN, and firewall are infrastructure-owner responsibilities and are not provisioned by this repository.

## Mercado Pago sandbox and Pix

The API container now receives the billing variables from the deployment `.env`. Keep `BILLING_MODE=test`; the integration creates recurring subscriptions through Mercado Pago's hosted checkout, where Pix is available when enabled for the test account. Configure `BILLING_PROVIDER=mercadopago`, a `TEST-` access token, a test-buyer email, `BILLING_WEBHOOK_SECRET`, and a public HTTPS `WEB_PUBLIC_URL`. In the Mercado Pago dashboard, enable `subscription_preapproval` and `subscription_authorized_payment` notifications to `https://<public-api-host>/billing/webhooks/mercadopago`, using the matching webhook secret. Keep all credentials in the deployment secret store or `.env`, never in Git or chat.

The repository does not contain test credentials, a public API endpoint, or an account-level Webhook configuration. The provider remains `simulated` by default; completing an end-to-end Pix checkout still requires the deployment owner to configure these sandbox values and verify Pix availability in the test account. Live billing remains disabled.

The admin overview includes a billing preflight that reports whether the local sandbox settings are present without returning credential values. A green local-configuration result is not an end-to-end payment test: verify both Mercado Pago notification types and the public webhook delivery manually, then complete a test-buyer checkout and confirm the subscription is applied. The post-checkout page polls for up to 12 attempts and distinguishes API failures from a still-pending provider confirmation.

The API rejects a new checkout when the account already has an active subscription or still has access through a trial/canceled period. A persistent reservation and a PostgreSQL advisory transaction lock prevent concurrent checkout creation across API replicas. The same pending plan and cycle reuse its link; cancel it with the provider before changing the cycle. Failed or uncertain provider requests remain blocked for manual reconciliation; never clear a reservation without verifying the provider's state. Historical sessions are migrated as `unknown` and require the same reconciliation. Cancellation, expiry and refund events invalidate the matching checkout; late approvals are rejected. Live billing remains blocked.

The Pro monthly and annual amounts are defined once in `@plataforma/contracts` as integer cents and reused by the API, landing pricing, and checkout summary. The annual display is derived from the annual total, so the customer-facing offer and server-authoritative amount cannot drift through separate literals. The separate `/prototype` design mock is excluded from the canonical pricing flow.

## Credential revocation

Administrators can revoke issued Open Badges; revocations are recorded with an audit event and exposed in signed, uncached Bitstring Status List credentials. A verifier must validate the issuer and signatures on both the badge and its current status list, check the list URL and index in the badge, and reject revoked entries. Availability of the list and signing key is necessary for verification; this implementation has not been independently certified for interoperability. Previously issued badges without `credentialStatus` cannot be revoked retroactively by this mechanism. Course certificates use a separate public status endpoint and administrative revocation.

## Published knowledge references

Only references approved with a declared license, associated with relevant topics, and explicitly confirmed by a human reviewer can be published to the learning interface. The platform exposes attribution and a source link, not a copy of the external work. Archiving withdraws the published link. Review access rights, license terms and relevance before publication; an external link is not proof of permission to reproduce its contents.

## Backups and restore drills

The selected destination is a dedicated Google Drive folder. The selected retention is 30 days, and the age identity must be held offline, separately from Drive. Provision a dedicated rclone Google Drive remote and an age recipient through the deployment's secure operator process; do not paste OAuth tokens, private keys, or credentials into chat or Git. These choices do not configure an account, a scheduler, automatic deletion, or a tested recovery.

- Back up both PostgreSQL databases (`plataforma` and `gitea`), the Gitea `/data` volume and both knowledge volumes as a coordinated set. A database-only backup does not preserve student repositories; a volume-only backup does not preserve account metadata.
- Encrypt all components before they leave the host. Never place plaintext dumps or repository archives in the repository or a shared web directory.
- Take a backup before each schema migration and at least daily while learner data is being created. The selected retention is 30 days; verify it against the applicable data-retention policy. Do not configure automatic deletion until an isolated restore drill has succeeded and the dedicated Drive folder and deletion scope have been verified.
- Restore into an isolated environment, restore both databases and the matching Gitea volume, apply the documented release version, and verify login, repository access, submissions, and deletion processing before relying on the backup.
- Record the achieved recovery point and recovery time after each drill. This repository does not configure a backup provider, key custody, or a scheduler; those remain deployment-owner responsibilities.

Example database dump pipeline on the deployment host (requires `age`, Docker Compose, and `AGE_RECIPIENT`):

```sh
set -o pipefail
test -n "$AGE_RECIPIENT"
umask 077
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  | age -r "$AGE_RECIPIENT" -o "plataforma-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
```

Create a separate encrypted dump of the `gitea` database using `pg_dump -U "$POSTGRES_USER" -d gitea -Fc` and a matching encrypted archive of the Gitea data volume during the same authorized maintenance window. Stop the API, web and Gitea services and verify that no migration, other deployment, or external writer can modify either database or the Gitea volume during the full capture. PostgreSQL must remain running for the dumps. Do not assume that stopping this Compose project stops external writers.

The host command `pnpm backup:maintenance` captures and encrypts the two databases, the Gitea volume, and both knowledge volumes; it uploads the set to a unique folder and verifies the encrypted files with `rclone check --download`. Configure `BACKUP_COMPOSE_PROJECT`, a dedicated non-root `BACKUP_RCLONE_PATH` such as `drive:backups/nexus`, and the public `AGE_RECIPIENT` in the host's private environment. Install `age` and provision the dedicated Drive remote and `node:22-alpine` image on the host. This command supports the local Compose PostgreSQL only; it refuses an API or Gitea pointing elsewhere. It also refuses to run unless PostgreSQL is the project's only running service and the operator explicitly sets both `BACKUP_MAINTENANCE_CONFIRMED=true` and `BACKUP_NO_EXTERNAL_WRITERS_CONFIRMED=true` after verifying the maintenance window and all external writers. These confirmations are assertions, not proof.

Schedule the command during an authorized daily maintenance window and run it before migrations; it does not stop or restart services. A failed transfer can leave a partial remote folder and must not be treated as a backup. After a successful restore drill and verification that the remote folder is dedicated exclusively to these sets, the operator may explicitly set `BACKUP_RESTORE_DRILL_CONFIRMED=true` and `BACKUP_RETENTION_SCOPE_CONFIRMED=true` and schedule `node scripts/backup-maintenance.mjs --prune`. It removes only marked complete sets at least 30 days old and refuses deletion without a newer complete set. Partial sets are not automatically deleted. These confirmations are operator assertions. Neither backup nor retention has been validated against the actual Drive account, and no scheduler is configured.

Run `pnpm backup:restore-drill` on a trusted isolated Docker host, with `BACKUP_RCLONE_PATH` pointing to the same dedicated remote folder, `RESTORE_BACKUP_SET` set to the exact complete set folder name, and `AGE_IDENTITY_FILE` pointing to the securely supplied offline identity. Provision `age`, `rclone`, and the `postgres:16-alpine` and `node:22-alpine` images. Allow enough local temporary disk space for the full encrypted set plus restored databases and volumes. The drill downloads the set, checks the encrypted manifest and file checksums, restores both databases and extracts all three volumes without network access, and removes its temporary resources. It reports the capture time and elapsed time; record these alongside the actual recovery point and recovery time.

The default drill checks for public tables and the knowledge directory, not application functionality or all restored content. Optionally set `RESTORE_VERIFY_LOGIN=true`, `RESTORE_CHECK_EMAIL`, `RESTORE_CHECK_PASSWORD` and `RESTORE_CHECK_SUBMISSION_ID` for a dedicated test account and a known submission included in the backup. Supply credentials securely, not in chat or shell history. The exact API image ID recorded in the encrypted manifest and `redis:7-alpine` must already be present locally. The drill starts an isolated Redis and that API image in the temporary PostgreSQL container's network namespace, with no external network, no published ports, Gitea and Piston disabled in the API, and fresh temporary secrets. It checks login and reads the specified restored submission; it does not execute code. It modifies only the disposable restored copy, including login records and age confirmation.

To check a private repository independently, set `RESTORE_VERIFY_GITEA=true`, `RESTORE_GITEA_TOKEN`, `RESTORE_GITEA_OWNER`, `RESTORE_GITEA_REPO`, `RESTORE_GITEA_FILE`, `RESTORE_GITEA_COMMIT` (40-character Git SHA) and `RESTORE_GITEA_FILE_SHA256` (64-character SHA-256). The token, repository and commit must already exist in the backup. The exact Gitea image ID in the manifest must be available locally; the restored Gitea data must be writable by UID/GID 1000, as in the supplied Compose configuration. The drill starts Gitea unprivileged in the same networkless namespace, disables SSH, mail and actions, and checks authenticated retrieval of the file at the specified commit against its expected SHA-256. It does not expose a port or contact external services. Use a dedicated test token and obtain the expected hash independently. These checks cover one selected submission and one file, not all data or permissions; a failure fails the drill.

Archive extraction restores numeric ownership and ordinary mode bits in disposable volumes; ACLs, extended attributes and production filesystem semantics are not validated. The extraction runs as root in a disposable, networkless, read-only container with limited capabilities; use only trusted backups, trusted release images and a trusted isolated Docker host. It must not be used as a production restore. Validate actual submission execution, deletion processing and production filesystem permissions in a separate isolated recovery before relying on recovery or enabling retention. The current successful drill uses synthetic data and a local rclone remote, not the real Google Drive backup.

The selected daily time is 04:00 in the host's local timezone. `infra/systemd/nexus-backup.service` and `.timer` are templates, not an installed schedule. Before enabling them, adjust `/opt/nexus`, the Node path and the service account to the actual host; provision `/etc/nexus/backup.env` and the rclone configuration with restrictive permissions and a dedicated account authorized to use Docker. Docker access is effectively host-root access. Ensure the maintenance window and all external writers are controlled every day; a static confirmation in the environment cannot prove they are stopped. Missed runs are not replayed after reboot, to avoid capture outside the maintenance window; monitor for missed or failed backups. The template does not enable retention or install itself.

## Security checks in CI

- CodeQL analyzes JavaScript and TypeScript on pull requests, protected branch pushes, and weekly.
- Dependabot proposes updates for workspace dependencies and GitHub Actions.
- CI audits production dependencies and the production-image job blocks on fixable critical OS or library vulnerabilities; the Trivy scan ignores unfixable findings.
- The existing lint, test, build, and E2E jobs remain required validation paths. CI does not contain production credentials.

## Prometheus scrape and alert rules

The API metrics endpoint accepts either `x-metrics-token` or the standard `Authorization: Bearer` header; both require the same `METRICS_TOKEN` secret and fail closed when it is unset. The opt-in Compose profile provisions Prometheus, scrapes `api:3000/metrics/prometheus`, persists its TSDB for 15 days, and binds its UI only to `127.0.0.1:9090`. Set a random `METRICS_TOKEN` of at least 32 characters in the deployment secret store or `.env`, then run `docker compose --profile monitoring up -d --build`. Prometheus expands the token from its environment at runtime; do not put the value in the checked-in scrape configuration.

The profile also runs Alertmanager and loads `infra/monitoring/nexus-alerts.yml`, covering scrape and dependency availability, HTTP errors and latency, unavailable queue metrics, long-waiting and retained failed jobs, and failed or stale runner diagnostics. When `PISTON_ENABLED=true`, a Redis-coordinated synthetic JavaScript and Python test runs approximately every 15 minutes; the admin can also run it manually. Results contain no user code or output. A missing or failed test does not repair or restart anything, and a passing test does not prove VPN isolation. Their thresholds are **initial operational signals, not approved SLOs**; tune them from a production traffic baseline. Set `ALERTMANAGER_WEBHOOK_URL` to an operator-selected HTTPS endpoint that accepts native Alertmanager webhook payloads. A one-shot Compose service renders that URL into the private `alertmanagerconfig` volume; the URL is not stored in the repository or printed by the renderer. Alertmanager's UI is bound to `127.0.0.1:9093`; Prometheus forwards alerts to it over the internal Compose network.

The selected destination is an HTTPS webhook compatible with native Alertmanager payloads. Configure it in the deployment secret store or `.env` and recreate `alertmanager-config-init` and `alertmanager` after changing it. Run `pnpm alerts:test-delivery` on the host (set `ALERTMANAGER_PORT` if the loopback port differs). The command submits a uniquely labeled synthetic alert to the local Alertmanager, which normally waits 30 seconds before sending a new group. Acceptance does not prove delivery: verify receipt and escalation at the destination before marking the launch evidence complete. HTTP counters are process-local and reset when the API restarts; do not treat them as durable business analytics.

## Public TLS edge

The opt-in `public` Compose profile provides Caddy on host ports 80/443 and routes `WEB_DOMAIN`, `API_DOMAIN`, and `GITEA_DOMAIN` to the internal services with automatic HTTPS. Set those domains, `ACME_EMAIL`, `NEXT_PUBLIC_API_URL`, `WEB_PUBLIC_URL`, `GITEA_PUBLIC_URL`, and `CORS_ORIGIN` consistently; point DNS to the deployment host and allow inbound 80/443 before starting the profile. The API, web, Gitea HTTP, and monitoring interfaces remain loopback-bound on the host. Do not mark the public-edge gate complete until certificates and all three routes are verified externally and direct application ports are confirmed inaccessible.

## Admin AI rooms

Set `AI_ALLOWED_MODELS` to a comma-separated server-side allowlist before creating or publishing specialized tutor rooms. The configured default model is not implicitly added to this list; room calls are rejected if their model is no longer allowed. The admin panel exposes provider/model identifiers and availability only, never provider credentials. Rooms attach to an activity, stay unpublished by default, and keep chat history separate from the general tutor and other rooms.

## Reference connector for Muse review

The optional `POST /connectors/references` is a **write** tool: it saves one pending reference for an administrator to review. It does not search the web, retrieve documents, read references, approve, import or publish content. Muse integration and Meta approval have not been verified. Meta's connector guidelines require a use case that adds value beyond a list of links, so approval is not guaranteed. Provide the review team with a dedicated test environment, privacy/retention and deletion information, support contacts, and credentials through their secure submission process. Do not send secrets in chat, URLs, logs, or tool descriptions.

It accepts JSON with `kind` (`job`, `course`, `book`, `pdf`), `title` (1–200 characters), HTTPS `url` (up to 512 characters), and optional `author` and `license` (up to 200 characters each). Only metadata may be submitted. Do not include personal data, secret-bearing URLs, or copyrighted full text. URL fragments and common credential parameter names are rejected, but this is not a guarantee that a URL contains no secret. A successful response is `201` with only `id` and `status: pending`; duplicates return `409` without modifying the existing record. Invalid input returns `400`, missing or invalid credentials `401`, disallowed browser origins `403`, and throttling `429`. The route limit is 30 requests per minute per IP, **per API process**; use an additional shared gateway limit before multi-replica or public deployment. Standard global IP limits and CSRF origin checks also apply.

Keep the endpoint disabled until HTTPS, access control, and review are ready. Generate a unique cryptographically random secret of at least 32 bytes as unpadded base64url, provision it to the connector securely, and configure only its lowercase SHA-256 hex digest in `REFERENCE_CONNECTOR_KEY_SHA256` in the API secret store. The client sends `Authorization: Bearer <secret>`; no administrator token is accepted or needed. Clearing or rotating the digest and restarting every API replica revokes the old key. This single key represents the deployment connector, not individual Muse users; do not use it as multi-user isolation. Prevent the reverse proxy and observability tools from logging authorization headers. Review access, retention, deletion and incident procedures before enabling it.

## Account deletion and age-policy boundary

Gitea deletion is written to a database outbox in the same transaction as local account deletion, attempted immediately, and retried with bounded exponential backoff by housekeeping. The queue retains only the Gitea username and exact candidate repository names while cleanup is pending; successful jobs clear those identifiers, and completed records expire after 14 days.

The approved interim product policy is to wait for legal review: registration does not collect date of birth or age and does not block accounts based on age. Do not infer a learner's age from names, email, or behavior. The minimum age, parental-consent workflow, and handling of existing underage accounts require a separate explicit policy before age-based data processing or an age gate is implemented.
