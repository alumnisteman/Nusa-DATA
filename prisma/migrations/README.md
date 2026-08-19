# Migration procedure

Do NOT create a production migration by manually editing `_prisma_migrations`.

In development/staging:

```bash
npx prisma migrate dev --name add_restart_modules
npx prisma generate
```

Review SQL, test it, commit the migration directory.

Production:

```bash
npx prisma migrate deploy
```

Before production migration:

```bash
pg_dump -Fc "$DATABASE_URL" > backup.dump
```

Never use `prisma db push` for production schema evolution.
