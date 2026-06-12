# Marketplace Platform Readiness Report

Status: READY

Scope: Platform preparation for a plugin marketplace bundle. This does not implement the marketplace catalog, commerce, or licensing UI.

## Architecture Boundary

Marketplace remains a Distribution Layer client. It may discover packages, manage publisher/license UX, and submit package archives through `@modern-cms/marketplace-sdk`. It does not receive database, filesystem, migration, plugin storage, or private lifecycle access.

## Implemented Foundation

- Package Manifest V2 with package type, SDK version, publisher, license, integrity, Ed25519 signature, versioned dependencies, runtime entry, distributed Admin entry, and rollback policy.
- ZIP upload for offline packages through the Core plugin manager.
- SHA-256 archive checks, deterministic content integrity, trusted publisher verification, explicit unsigned-local approval, path traversal prevention, symlink rejection, entry limits, and expanded-size limits.
- Atomic same-filesystem staging and package backups.
- Persistent package version and operation audit records.
- Semantic-version dependency validation, optional dependencies, update detection, and downgrade policy.
- Migration checksum immutability, paired `.down.sql` rollback, failed-operation migration recovery, package rollback, and previous-version restoration.
- Package V2 runtime activation through `activate(sdk)` without Fastify route registration after boot.
- Generic authenticated plugin API dispatcher with optional permission guards.
- Dynamic browser-ready ESM Admin bundle loading without rebuilding Admin.
- Runtime hard reset for update/downgrade and normal scoped disposal for deactivation.
- `@modern-cms/marketplace-sdk` for archive installation, operation history, and rollback.
- Architecture rules and integration tests covering unsafe archives, unsigned remote packages, signed packages, install, runtime activation, update, and rollback.

## Package Producer Requirements

- Marketplace-distributed plugins must ship a browser-ready self-contained ESM Admin bundle when Admin UI is required.
- Dynamic backend packages must use `runtime.entry` and SDK registries. Legacy Fastify backend entries remain supported for bundled/local first-party plugins but require startup registration.
- Every downgrade-capable package must declare rollback support and provide paired migration files such as `0002_feature.sql` and `0002_feature.down.sql`.
- Remote/private repository packages must be signed by a trusted Ed25519 publisher key.
- Unsigned packages are accepted only through an explicit local/offline administrator action.

## Remaining Product Work

The platform is ready for the marketplace plugin. The marketplace product still needs its own catalog provider, search and detail UI, publisher account integration, license provider adapters, download transport, release notes, pricing, and purchase/subscription workflows. Those are marketplace business features, not platform blockers.
