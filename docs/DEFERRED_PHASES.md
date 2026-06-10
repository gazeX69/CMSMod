# Deferred Phases & Features Register

This document tracks system integrations and phases that have been intentionally postponed to prevent scope drift during Phase 4 development.

---

## 1. Plugin Migration Engine & Dynamic Install
* **Description**: Infrastructure to execute database sql files dynamically from plugin directories when a plugin is installed.
* **Status**: `Deferred`
* **Reason**: Transferred to a separate database integration cycle after Phase 4 Hooks is verified. Currently, schema tracking relies on Drizzle Kit globs in Core config.

---

## 2. Central Event Bus Sync/Async Dispatchers
* **Description**: Central event dispatcher allowing sync pre-processing filters and async message queues.
* **Status**: `Deferred`
* **Reason**: Relies on a unified Event Bus engine that is out of scope for the current Active Phase.

---

## 3. Dynamic Visitor Rendering & Theme System
* **Description**: Backend public rendering engine parsing page content, layouts, and injecting design token assets from `themes/default/`.
* **Status**: `Deferred`
* **Reason**: Focus is restricted to Admin panel components and API frameworks. Public visitor endpoints will be implemented in a dedicated Theme integration phase.

---

## 4. Fine-grained Permissions Table Schema
* **Description**: Schema definitions and database relationships mapping permission strings to Roles/Users to remove role name hardcoding.
* **Status**: `Deferred`
* **Reason**: Current RBAC uses high-level role checks, which are sufficient for current scope verification.

---

## 5. Online Marketplace Client & Licensing
* **Description**: Dynamic backend and UI client enabling browsing, package signature checks, download streams, and subscription checks.
* **Status**: `Deferred`
* **Reason**: Beyond basic Phase 4 Core requirements. Marketplace distributions will be handled in Phase 5.
