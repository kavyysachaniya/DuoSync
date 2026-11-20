# DuoPulse — Security Specification (Phase 0 TDD)

## 1. Data Invariants & Master Source of Truth

1. **Authentication & Verification Gate**: Every read or write operation requires a signed-in user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
2. **PII Isolation & Zero-List Policy**:
   - No PII (`email`, `phone`, `address`) is stored in Firestore documents.
   - `/users/{userId}` can only be read (`get`) or written by `request.auth.uid == userId`.
   - `allow list: if false;` is enforced across all collections; all reads use deterministic single-document `get` lookups.
3. **Master Gate Relational Sync (`/workspaces/{workspaceId}`)**:
   - Access to `/workspaces/{workspaceId}/healthLogs/{logId}` and `/workspaces/{workspaceId}/careProducts/{productId}` is strictly gated by `isWorkspaceMember(workspaceId)`, which fetches `/workspaces/$(workspaceId)` via `get()` and verifies `request.auth.uid == workspace.ownerUid || (workspace.partnerUid != "" && request.auth.uid == workspace.partnerUid)`.
4. **Partner Pairing Code Integrity (`/pairingCodes/{code}`)**:
   - `code` must match `^[0-9]{6}$`.
   - Creating a pairing code requires `existsAfter(/databases/$(database)/documents/workspaces/$(incoming().workspaceId))` so orphaned codes cannot exist.
5. **Temporal & Immutable Field Integrity**:
   - `createdAt` must equal `request.time` on `create` and remain unchanged on `update`.
   - `updatedAt` must equal `request.time` on both `create` and `update`.
   - Primary identifiers (`id`, `uid`, `ownerUid`, `workspaceId`, `pairingCode`, `profileSlot`, `date`) are strictly immutable after creation.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unverified Email Spoof**: Signed-in user with `email_verified: false` attempts to create `/users/user_1`. -> `PERMISSION_DENIED`
2. **Cross-User Profile Snoop**: `user_2` attempts `get` on `/users/user_1`. -> `PERMISSION_DENIED`
3. **Shadow Field Injection on Workspace**: `user_1` updates `/workspaces/ws_1` with an extra field `isAdmin: true`. -> `PERMISSION_DENIED`
4. **Owner Hijack on Workspace Update**: Partner 2 (`user_2`) updates `/workspaces/ws_1` and modifies `ownerUid` to `user_2`. -> `PERMISSION_DENIED`
5. **Hijacking Already-Paired Workspace**: Unrelated `user_3` attempts the partner join action on `/workspaces/ws_1` when `partnerUid` is already set to `user_2`. -> `PERMISSION_DENIED`
6. **Orphaned Pairing Code Creation**: `user_1` creates `/pairingCodes/123456` pointing to non-existent `/workspaces/ws_ghost`. -> `PERMISSION_DENIED`
7. **Collection Scraping via List Query**: Authenticated user runs `getDocs(collection(db, 'pairingCodes'))` or `getDocs(collection(db, 'users'))`. -> `PERMISSION_DENIED`
8. **Unauthorized Health Log Write**: Unlinked `user_3` attempts to create `/workspaces/ws_1/healthLogs/partner2_2026-11-03`. -> `PERMISSION_DENIED`
9. **Value Poisoning on Health Log**: Linked partner sends `steps: -500` or `steps: "ten thousand"` on `/workspaces/ws_1/healthLogs/partner2_2026-11-03`. -> `PERMISSION_DENIED`
10. **Denial-of-Wallet Oversized Array**: Linked partner updates `skincareCategories` with 100 items (exceeding max 30) or `productIds` with 250 items (exceeding max 100). -> `PERMISSION_DENIED`
11. **Forged Client Timestamp**: Client attempts to create `/workspaces/ws_1/careProducts/prod_1` with a past or future `createdAt` instead of `serverTimestamp()` (`request.time`). -> `PERMISSION_DENIED`
12. **Identity Spoofing on CareProduct `updatedByUid`**: `user_1` writes a CareProduct setting `updatedByUid: "user_2"`. -> `PERMISSION_DENIED`
