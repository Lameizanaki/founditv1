# FoundIt Frontend

This is the rebuilt `Next.js + React + TypeScript` frontend for FoundIt.

## Local development

Frontend:

```bash
cd FOUNDIT_FE
npm install
npm run dev
```

Backend:

```bash
cd FOUNDIT_BE
./mvnw spring-boot:run
```

Optional eKYC service:

```bash
cd EKYC_SERVICE
python -m uvicorn app.main:app --reload --port 8000
```

## Frontend env

Create `.env.local` in `FOUNDIT_FE`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8085
NEXT_PUBLIC_WS_BASE_URL=http://localhost:8085/ws
```

For production, point these to your deployed Spring Boot backend.

## Backend env

`FOUNDIT_BE/src/main/resources/application.properties` now supports env overrides for deployment:

- `PORT`
- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_SCHEMA`
- `JPA_DDL_AUTO`
- `FRONTEND_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `EKYC_BASE_URL`
- `EKYC_TIMEOUT_SECONDS`
- `SPRING_MULTIPART_LOCATION`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## Production checklist

1. Set `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_BASE_URL` to the public backend URL.
2. Set Spring `FRONTEND_URL` to the public frontend URL.
3. Replace all default secret values with real environment variables.
4. Ensure PostgreSQL, mail, Google OAuth, and eKYC service URLs are reachable from production.
5. Build and start:

```bash
cd FOUNDIT_FE
npm run build
npm run start
```

## Current migration status

The Angular app was replaced with Next and then rebuilt using the old app as the design reference.
The highest-traffic public and dashboard pages have been migrated away from placeholder endpoint panels.
Some advanced flows still need continued work for true 1:1 parity:

- chat
- payment checkout and success flows
- eKYC
- detailed edit forms
- public detail pages
- admin detail pages
