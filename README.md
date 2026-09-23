# Ascentware Attendance Bot

A corporate attendance and leave-management system: a Microsoft Teams bot for
check-in/check-out/breaks/daily plans/leave requests, backed by a NestJS +
Prisma (Postgres) API, with a React web dashboard for self-service and
admin/HR/manager views.

## Roles

There are three explicit roles (`Employee.role`): `ADMIN`, `EMPLOYEE`, `HR`.
"Manager" and "Super Manager" are **not** separate roles - they're emergent
from the reporting chain. Any employee who appears in another employee's
`managerEmails` is a manager of that employee; walking the chain recursively
(`AdminService.getAllReports`) surfaces indirect reports too ("super
manager" is just a manager several levels up). HR is assigned per-employee
via `Employee.hrEmail` (a business-partner model, not company-wide) - HR is
notified when an assigned employee applies for leave and when their manager
decides, but does not approve leave themselves; only the reporting manager
(or an admin) can approve/reject.

## Project setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, CLIENT_ID/CLIENT_SECRET, JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

The frontend (`frontend/`) is built automatically as part of `npm run
build`/`npm run start:prod` and served by the same NestJS process; for
frontend-only iteration run `npm run dev --prefix frontend` separately
against the API.

Every seeded account logs in with its email and the password printed by the
seed script (`"password"` by default, override with `SEED_ADMIN_PASSWORD`)
via the web dashboard's login page.

## Environment variables

See [.env.example](.env.example) for the full list with descriptions
(`DATABASE_URL`, `PORT`, `CLIENT_ID`/`CLIENT_SECRET`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `NODE_ENV`, plus the bot's optional tenant setting and the
seed script's optional default password).

## Compile and run the project

```bash
# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# test coverage
$ npm run test:cov
```

Unit tests mock Prisma (`jest-mock-extended`) rather than hitting a real
database, so they run without any Postgres instance, locally or in CI. A
Postgres-backed e2e suite (`test/jest-e2e.json`) is scaffolded but not yet
populated - a real e2e suite is a documented follow-up, not built in this
pass.

## Health check

`GET /api/v1/health` (public) runs a `SELECT 1` against Postgres and returns
`{status, uptime, db}`, 503 if the database is unreachable. Used by
`render.yaml`'s `healthCheckPath`.

## Deployment

`render.yaml` deploys this as a single Render web service (Node build +
`start:prod`), with `DATABASE_URL`, `CLIENT_ID`, `CLIENT_SECRET`, and
`JWT_SECRET` set as secrets in the Render dashboard (`sync: false`).

## Known limitations / deferred work

- **Authentication is per-employee email + password (bcrypt + JWT), not
  Azure AD/Entra SSO.** The bot's own AAD app registration already exists
  and could back a future SSO upgrade for the web dashboard, but that's not
  built yet - this was an explicit scope decision to ship per-employee login
  first.
- **Bot conversation/activity state is process-local** (in-memory
  `MemoryStorage` + a bounded LRU tracker), not shared across instances.
  Fine for a single Render instance; would need Redis-backed storage before
  running multiple bot instances behind a load balancer.
- **Leave decisions made from the web dashboard don't trigger a live Teams
  DM to the employee** (they do create an in-app `Notification` row, and the
  bot-originated flow does DM). Proactively messaging a user from an
  HTTP-triggered action requires a persisted `ConversationReference` per
  employee, captured from their first bot turn - not built this pass; a
  natural extension point is a future `Employee.teamsConversationRef Json?`
  column.
- Also out of scope for now: leave balance/accrual tracking, timezone-aware
  attendance, overtime calculation, holiday calendars, multi-tenant support,
  and password reset via email/invite links (passwords are currently
  admin-set only).

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Bot Framework / Teams bot documentation](https://learn.microsoft.com/microsoftteams/platform/bots/how-to/create-a-bot-for-teams)
