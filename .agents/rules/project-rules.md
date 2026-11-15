# Project Rules

- routes/ = HTTP only, services/ = business logic, models/ = the only layer that touches MySQL.
- All SQL is parameterized with %s. Never build SQL from user input.
- Admin and student auth stay separate (token_required vs student_token_required, role claim).
- "Late" logic lives only in utils/attendance_helpers.py using Config.LATE_CUTOFF_MINUTES.
- Never hardcode http://localhost:5000 in the frontend; use the API base constant.
- Do not change API response shapes without updating the frontend in the same change.
- Minimal diffs. No code comments unless the logic is non-obvious.
- One phase per branch. Never commit to main. Never merge without my approval.
