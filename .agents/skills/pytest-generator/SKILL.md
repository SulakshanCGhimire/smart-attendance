---
name: pytest-generator
description: Trigger when asked to add or update backend tests. Generates isolated unit and integration tests with mocks.
---

# Pytest Generator Skill

Use this skill when asked to add or update backend tests.

## Test Guidelines
- Tests go in `backend/tests/`, mirroring the structure of `backend/app/` (e.g., `tests/routes/`, `tests/services/`, `tests/utils/`).
- Mock `face_recognition` and the database connection/cursor.
- Never require a live camera or live MySQL instance.

## Required Test Coverage
- **Auth Role Rejection**: Verify admin tokens are rejected on student routes, and student tokens are rejected on admin routes.
- **Late-Cutoff Helper**: Verify attendance status calculation based on `Config.LATE_CUTOFF_MINUTES`.
- **Validation Errors**: Verify missing, malformed, or out-of-bound inputs return 400 errors.
- **SQL-Injection Strings**: Verify that malicious SQL strings passed into inputs fail safely without executing unauthorized SQL.
