# Admin Authentication Setup - Modern CMS

This guide documents the admin bootstrapping setup, secure session management, and API validation flows.

---

## 1. Bootstrapping Admin User

Admin creation is handled during the database seeding step (`pnpm --filter @modern-cms/api db:seed`). The seeder reads bootstrap credentials from environment variables in your `.env` file:

```env
# Admin Bootstrap Configuration
ADMIN_EMAIL=admin@moderncms.local
ADMIN_USERNAME=admin
ADMIN_PASSWORD=adminpassword123
```

- If no user with the `Admin` role or matching username/email exists, the seeder will:
  1. Hash the `ADMIN_PASSWORD` using **bcryptjs** (salt rounds: 10).
  2. Create a new user record in the `users` table.
  3. Associate the user with the `Admin` role in the `user_roles` table.
- This process is **idempotent**; running the seeder multiple times will not duplicate the admin user.

---

## 2. Session Architecture

Modern CMS uses secure session management built on the following rules:

- **HttpOnly Cookies**: Session tokens are passed via cookies (`SESSION_COOKIE_NAME`).
- **No Local Storage**: Sensitive auth tokens are never stored in `localStorage` or `sessionStorage` on the frontend.
- **Hashed Session Tokens**: The raw token set in the client cookie is a random 64-character hex string. We never store this raw token. We hash it with **SHA-256** and store only the resulting `token_hash` in the `sessions` table.
- **Verification Flow**: On protected requests:
  1. Read raw token from incoming cookie.
  2. Hash raw token using SHA-256.
  3. Find match in `sessions` table where `expires_at > NOW()` and `revoked_at IS NULL`.

---

## 3. Environment Variables

Configure the following variables in the root `.env` file:

```env
SESSION_COOKIE_NAME=modern_cms_session
SESSION_TTL_DAYS=7
```

---

## 4. Verification and API Tests

Verify the endpoints using the following curl commands (run from a terminal):

### A. Check Setup Status
Find out if an admin user exists:
```bash
curl -i http://127.0.0.1:4000/api/auth/setup-status
```
**Response**:
```json
{
  "isSetup": true
}
```

### B. Perform Login
Log in with correct credentials to get a session cookie:
```bash
curl -i -X POST -H "Content-Type: application/json" -d "{\"usernameOrEmail\":\"admin\", \"password\":\"adminpassword123\"}" http://127.0.0.1:4000/api/auth/login
```
**Response Header**:
Check that the `Set-Cookie` header is returned (e.g. `Set-Cookie: modern_cms_session=...; Path=/; HttpOnly; SameSite=Lax`).

### C. Verify Current Authenticated User
Call `/api/auth/me` passing the cookie received during login:
```bash
curl -i --cookie "modern_cms_session=<YOUR_TOKEN_HERE>" http://127.0.0.1:4000/api/auth/me
```
**Response**:
```json
{
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@moderncms.local"
  }
}
```

### D. Logout / Revoke Session
Revoke the active session:
```bash
curl -i -X POST --cookie "modern_cms_session=<YOUR_TOKEN_HERE>" http://127.0.0.1:4000/api/auth/logout
```
**Response Header**:
Check that the cookie is cleared (`Set-Cookie: modern_cms_session=; Path=/; Max-Age=0...`).
Also check the `sessions` table in the database; the session record's `revoked_at` column will now contain the timestamp of the logout request.
