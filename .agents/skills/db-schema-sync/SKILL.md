---
name: db-schema-sync
description: Trigger when changing database tables, columns, or constraints. Synchronizes schema across backend and frontend layers.
---

# DB Schema Sync Skill

Use this skill when changing database tables or columns.

## Synchronization Order
1. Update `backend/schema.sql` first.
2. Update the corresponding model in `backend/app/models/`.
3. Update the service layer in `backend/app/services/`.
4. Update the route layer in `backend/app/routes/`.
5. Update the frontend forms and components in `frontend/src/`.

## Key Constraints
- Keep unique keys on `student_id`, `email` in `users` table.
- Keep unique compound key on `(user_id, log_date)` in `attendance_logs` table.
- List every file touched upon completion.
