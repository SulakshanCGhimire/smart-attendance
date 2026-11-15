---
name: security-review
description: Trigger when adding or changing routes, auth, or input handling. Checks decorators, input validation, %s SQL, and rate limits.
---

# Security Review Skill

Use this skill when adding or changing routes, auth, or input handling.

## Check Requirements
1. **Decorators & Access Control**:
   - Check endpoint decorators.
   - Public routes allowed: login endpoints (`/api/auth/login`, `/api/student/login`), `/api/attendance/recognize`, and scanner settings read endpoint.
   - All other routes must have `@token_required` (admin) or `@student_token_required` (student).
2. **Input Validation**:
   - Validate payload fields, lengths, data types, and formats before processing.
3. **Parameterized SQL**:
   - Verify all SQL queries use parameterized `%s`. Never concatenate or format strings into SQL from user input.
4. **Rate Limits**:
   - Verify rate limits on login endpoints and recognize endpoints.
5. **Safety Constraints**:
   - Never weaken an existing check to make a test pass.

## Output Format
Report findings in the following format:
- **File**: `<file_path>`
- **Line**: `<line_number>`
- **Issue**: `<issue_description>`
- **Fix**: `<recommended_fix>`
