# NUSA OSS Copilot

[![CI](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml/badge.svg)](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/alumnisteman/nusa-data.svg)](https://hub.docker.com/r/alumnisteman/nusa-data)

## Overview
NUSA OSS Copilot is a FastAPI based decision‑support tool for Business Licensing (OSS). It matches business descriptions to KBLI codes, calculates a readiness score and provides a checklist.

## Prerequisites
- Docker & Docker Compose
- Python 3.12 (optional for local development)
- PostgreSQL (handled via Docker)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/alumnisteman/Nusa-DATA.git
   cd Nusa-DATA
   ```
2. Copy the example environment file and adjust if needed:
   ```bash
   cp .env.example .env
   ```
3. Build and start the containers:
   ```bash
   docker compose up -d --build
   ```

The API will be available at `http://localhost:8080`.

## Updating
Pull the latest changes and redeploy:
```bash
git pull origin main
docker compose pull
docker compose up -d --build
```

## Maintenance
- **Logs**: `docker compose logs -f` or `docker compose logs <service>`
- **Database migrations** (if the schema changes):
  ```bash
  docker compose run --rm api npx prisma migrate deploy
  ```
- **Backup**: Use `docker exec` to dump the PostgreSQL database.

## Documentation
- API reference: see `api_docs.md`.
- Contribution guide: see `CONTRIBUTING.md`.

## License
MIT


[![CI](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml/badge.svg)](https://github.com/alumnisteman/Nusa-DATA/actions/workflows/ci.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/alumnisteman/nusa-data.svg)](https://hub.docker.com/r/alumnisteman/nusa-data)


> Human Capital Recovery & Second-Life OS

Platform untuk karyawan terdampak PHK, calon pensiunan, pensiunan, dan organisasi yang membutuhkan pemetaan skill, knowledge legacy, second career, income opportunity, dan human intelligence untuk AI.

## 1. Production Principles

RESTART AI wajib menggunakan **data riil**.

Dilarang di production:
- Dummy users
- Dummy transactions
- Fake revenue
- Fake job listings
- Fake salary statistics
- Fake AI scores
- Fake evaluation results

Jika data belum tersedia, tampilkan `Belum ada data`, bukan angka palsu.

Setiap data eksternal wajib menyimpan:
- `source_type`
- `source_name`
- `source_url`
- `source_timestamp`
- `period`
- `verification_status`
- `retrieved_at`

## 2. Target Architecture

```text
                         INTERNET
                            |
                       CLOUDFLARE
                            |
                         NGINX
                            |
              +-------------+-------------+
              |                           |
         RESTART WEB                   ADMIN WEB
              |
          API GATEWAY
              |
    +---------+----------+
    |         |          |
   AUTH     CORE API     AI
    |         |          |
    +---------+----------+
              |
       HUMAN CAPITAL GRAPH
              |
    +---------+----------+
    |         |          |
   PHK      PENSIUN    CALON PENSIUN
    |         |          |
    +---------+----------+
              |
      OPPORTUNITY ENGINE
              |
    +---------+----------+
    |         |          |
   JOB     BUSINESS    AI WORK
              |
             NUSA
              |
      HUMAN INTELLIGENCE
              |
         AI COMPANIES
```

## 3. Recommended Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js / React |
| Backend | Node.js + TypeScript |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Cache | Redis |
| Queue | RabbitMQ |
| Search | Meilisearch |
| Reverse Proxy | Nginx |
| Containers | Docker / Docker Compose |
| TLS / WAF | Cloudflare |
| Object Storage | S3-compatible |
| Monitoring | Prometheus + Grafana |
| Error Tracking | Sentry |
| CI/CD | GitHub Actions |

Kubernetes tidak diperlukan untuk initial production. Docker Compose cukup untuk production pertama.

## 4. Server Requirements

Initial production:

```text
CPU: 4 vCPU
RAM: 8 GB
SSD: 100 GB+
OS: Ubuntu 24.04 LTS
```

Untuk worker/AI lebih berat:

```text
CPU: 8 vCPU
RAM: 16 GB+
SSD: 200 GB+
```

Gunakan external AI API/model provider pada tahap awal jika tidak ada kebutuhan menjalankan LLM besar sendiri.

## 5. Repository Structure

```text
restart-ai/
├── apps/
│   ├── web/
│   ├── admin/
│   └── api/
├── workers/
│   ├── ai-worker/
│   ├── data-worker/
│   ├── notification-worker/
│   └── nusa-worker/
├── packages/
│   ├── database/
│   ├── auth/
│   ├── ai/
│   ├── data/
│   ├── scoring/
│   └── shared/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── infrastructure/
│   ├── nginx/
│   ├── monitoring/
│   └── backup/
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   ├── restore.sh
│   └── healthcheck.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```

## 6. Initial Server Setup

```bash
ssh root@SERVER_IP

apt update && apt upgrade -y

apt install -y \
  git curl ca-certificates gnupg ufw fail2ban unzip jq
```

Install Docker Engine menggunakan dokumentasi resmi Docker. Verifikasi:

```bash
docker --version
docker compose version

systemctl enable docker
systemctl start docker
systemctl status docker
```

## 7. Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Jangan expose ke internet:

```text
5432 PostgreSQL
6379 Redis
5672 RabbitMQ
15672 RabbitMQ Management
7700 Meilisearch
```

## 8. Clone Repository

```bash
mkdir -p /opt/restart-ai
cd /opt/restart-ai

git clone YOUR_GIT_REPOSITORY_URL .
git checkout main
git pull origin main
```

## 9. Environment

```bash
cp .env.example .env.production
chmod 600 .env.production
nano .env.production
```

Contoh:

```env
NODE_ENV=production

APP_NAME=restart-ai
APP_URL=https://restart.example.com
API_URL=https://api.restart.example.com
ADMIN_URL=https://admin.restart.example.com

POSTGRES_DB=restart_ai
POSTGRES_USER=restart
POSTGRES_PASSWORD=CHANGE_ME
DATABASE_URL=postgresql://restart:CHANGE_ME@postgres:5432/restart_ai?schema=public

REDIS_URL=redis://redis:6379

RABBITMQ_USER=restart
RABBITMQ_PASSWORD=CHANGE_ME
RABBITMQ_URL=amqp://restart:CHANGE_ME@rabbitmq:5672

MEILI_MASTER_KEY=CHANGE_ME
MEILISEARCH_URL=http://meilisearch:7700

JWT_SECRET=CHANGE_ME
SESSION_SECRET=CHANGE_ME

AI_PROVIDER=openai
AI_API_KEY=CHANGE_ME

S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=

SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

PAYMENT_PROVIDER=
PAYMENT_SECRET=
PAYMENT_WEBHOOK_SECRET=

SENTRY_DSN=
```

Generate secrets dengan:

```bash
openssl rand -hex 32
```

Jangan commit `.env.production`.

## 10. Docker Production

Semua service internal menggunakan Docker network.

Service utama:

```text
restart-web
restart-admin
restart-api
restart-ai-worker
restart-data-worker
restart-notification-worker
restart-nusa-worker
postgres
redis
rabbitmq
meilisearch
nginx
prometheus
grafana
```

PostgreSQL, Redis, RabbitMQ, dan Meilisearch **tidak boleh memiliki public port binding**.

## 11. Build

```bash
docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   build
```

## 12. Start Infrastructure

```bash
docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   up -d postgres redis rabbitmq meilisearch

docker compose ps
```

Semua dependency harus healthy sebelum aplikasi dimulai.

## 13. Prisma Production Migration

Production menggunakan:

```bash
npx prisma migrate deploy
```

Jangan menggunakan:

```bash
npx prisma migrate dev
npx prisma db push
```

Contoh:

```bash
docker compose run --rm api npx prisma migrate deploy
docker compose run --rm api npx prisma migrate status
```

### Existing database / P3005

Jika database sudah berisi schema/data dan migration history belum ada:

**Jangan**:

```bash
docker compose down -v
DROP DATABASE
prisma db push
```

Lakukan:

1. Backup database.
2. Inspect schema existing.
3. Prepare migration history.
4. Baseline existing database.
5. Mark baseline migration as applied.
6. Verify.
7. Lanjutkan dengan `prisma migrate deploy`.

## 14. Start Application

```bash
docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   up -d

docker compose ps
```

Logs:

```bash
docker compose logs --tail=200 api
docker compose logs --tail=200 ai-worker
docker compose logs --tail=200 data-worker
docker compose logs --tail=200 nusa-worker
```

## 15. Health Checks

API wajib memiliki:

```text
GET /health
GET /ready
```

Test:

```bash
curl https://api.restart.example.com/health
```

Expected:

```json
{"status":"ok"}
```

`/ready` harus memeriksa PostgreSQL, Redis, RabbitMQ, dan Meilisearch.

## 16. Nginx / Domain

Contoh:

```text
restart.example.com       -> restart-web
api.restart.example.com   -> restart-api
admin.restart.example.com -> restart-admin
```

Gunakan Cloudflare untuk DNS, TLS/WAF/rate limiting sesuai kebutuhan.

HTTP harus redirect ke HTTPS.

## 17. Real Data Policy

### User-generated

```text
Work history
Skills
Experience
Knowledge
Certification
Goals
```

Status awal:

```text
self_declared
```

### Verified

```text
Certificate
Assessment
Completed task
Employer verification
Expert verification
```

Status:

```text
verified
```

### Official public data

Contoh:

```text
BPS
Kemnaker
BKN
```

Status:

```text
official_public
```

### Licensed / partner

Status:

```text
licensed
```

### Synthetic

Hanya untuk development/testing dan tidak boleh ditampilkan sebagai data riil production.

## 18. External Data Pipeline

```text
External Source
      ↓
Raw Storage
      ↓
Validation
      ↓
Normalization
      ↓
Quality Check
      ↓
Human/Admin Review
      ↓
Production Dataset
```

Simpan:

```text
source
dataset
period
retrieved_at
records
valid_records
invalid_records
quality_score
status
```

## 19. Official Data

Gunakan sumber resmi BPS untuk statistik ketenagakerjaan, sumber resmi Kemnaker untuk data/program ketenagakerjaan yang tersedia secara publik atau melalui akses resmi, dan BKN untuk data ASN publik/agregat atau integrasi resmi.

Jangan mengambil data individual seperti NIK, alamat, nomor telepon, data klaim individu, atau data kepegawaian individual tanpa dasar hukum dan akses resmi.

## 20. Work DNA

User menjalani AI interview:

```text
Career history
Problem solving
Leadership
Communication
Tools
Achievements
Domain knowledge
```

AI menghasilkan:

```text
Work DNA
Skill candidates
Experience candidates
Knowledge candidates
```

AI-derived fields diberi label:

```text
AI_ASSISTED
```

sampai ada verifikasi.

## 21. Experience Bank

Minimal:

```text
experience
├── user_id
├── title
├── description
├── problem
├── action
├── result
├── industry
├── skills
├── evidence
└── verification_status
```

Jangan mengklaim achievement sebagai fakta terverifikasi tanpa bukti yang sesuai.

## 22. Opportunity Engine

Opportunity nyata:

```text
JOB
FREELANCE
BUSINESS
CONSULTING
MENTORING
AI_WORK
DIGITAL_PRODUCT
```

Simpan:

```text
source
source_url
captured_at
expires_at
location
requirements
compensation
verification
```

## 23. Salary / Income Estimates

Jangan menampilkan:

```text
Anda pasti menghasilkan Rp15 juta
```

Gunakan:

```text
Observed range
Source
Sample size
Period
Confidence
Last updated
```

Jika tidak cukup data:

```text
Tidak cukup data untuk estimasi.
```

## 24. Retirement Engine

Untuk calon/pensiunan:

```text
Retirement Countdown
Experience extraction
Second Career
Business discovery
Mentoring
Knowledge Legacy
Digital skills
Income planning
```

## 25. Knowledge Legacy

Input:

```text
Text
Audio
Video
PDF
Document
```

Pipeline:

```text
Upload
 ↓
Virus scan
 ↓
Object storage
 ↓
Transcription/OCR
 ↓
AI extraction
 ↓
Human confirmation
 ↓
Knowledge asset
```

Output:

```text
SOP
Guide
Course
Book
FAQ
Case study
Training material
```

## 26. NUSA Integration

Flow:

```text
RESTART
   ↓
Skill Assessment
   ↓
Training
   ↓
Simulation
   ↓
Certification
   ↓
NUSA Qualification
   ↓
Task
   ↓
Human Evaluation
   ↓
Quality Control
   ↓
Payment
```

Worker tidak boleh diterima hanya berdasarkan AI score. Gunakan training, calibration, gold tasks, quality monitoring, dan human review.

## 27. Payment Integrity

```text
Order
 ↓
Payment Provider
 ↓
Webhook
 ↓
Verified Payment
 ↓
Ledger
 ↓
Settlement
 ↓
Payout
```

Webhook harus idempotent.

Revenue hanya boleh berasal dari transaction ledger nyata.

## 28. Audit Log

Audit:

```text
login
logout
profile change
status change
document upload
document access
AI assessment
verification
task assignment
payment
payout
admin action
data export
data deletion
```

Minimal:

```text
actor
action
resource
resource_id
timestamp
ip_hash
user_agent
before
after
```

Jangan menyimpan password/token rahasia.

## 29. Privacy & Security

Minimum:

```text
TLS
Encryption at rest
RBAC
2FA admin
Consent management
Privacy policy
Terms
Data export
Data deletion
Account deletion
Rate limiting
Audit log
```

Minimalkan data pribadi. Jangan meminta dokumen pribadi jika fitur dapat berjalan tanpa dokumen tersebut.

## 30. AI Governance

Simpan:

```text
model
model_version
prompt_version
timestamp
task
input_hash
output
human_review
```

Bedakan:

```text
AI_ASSISTED
HUMAN_VERIFIED
```

AI tidak boleh menjadi satu-satunya dasar keputusan penting mengenai seseorang.

## 31. Backup

Create:

```bash
mkdir -p /opt/backups/restart-ai
```

Backup:

```bash
docker compose exec -T postgres   pg_dump -U restart -d restart_ai -Fc   > /opt/backups/restart-ai/restart_$(date +%Y%m%d_%H%M%S).dump
```

Backup harus dipindahkan ke storage berbeda dari server production.

Recommended retention:

```text
7 daily
4 weekly
3 monthly
```

## 32. Restore Test

Backup harus diuji restore secara berkala ke database terpisah.

Validasi:

```text
tables
row counts
indexes
constraints
application connectivity
```

Backup yang belum pernah direstore belum terbukti dapat digunakan.

## 33. Monitoring

Gunakan:

```text
Prometheus
Grafana
Sentry
```

Monitor:

```text
CPU
RAM
Disk
Network
API latency
HTTP errors
Postgres
Redis
RabbitMQ
Meilisearch
Worker queue
AI latency
AI cost
Payment failures
Backup status
```

Alerts:

```text
API DOWN
DB DOWN
Queue backlog high
Disk > 80%
Memory > 85%
HTTP 5xx spike
Backup failed
SSL expiration
AI provider failure
Payment webhook failure
```

## 34. Security Checklist

```text
[ ] SSH key authentication
[ ] Password SSH disabled
[ ] Root login restricted
[ ] UFW enabled
[ ] Fail2ban enabled
[ ] HTTPS
[ ] Security headers
[ ] Rate limiting
[ ] RBAC
[ ] 2FA admin
[ ] Secrets not in Git
[ ] Database not publicly exposed
[ ] Redis not publicly exposed
[ ] RabbitMQ not publicly exposed
[ ] Meilisearch not publicly exposed
[ ] Dependency audit
[ ] Container scan
[ ] Backup
[ ] Restore test
```

## 35. Deployment Script

Create `scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/restart-ai

git pull origin main

test -f .env.production

docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   build

docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   up -d postgres redis rabbitmq meilisearch

sleep 10

docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   run --rm api npx prisma migrate deploy

docker compose   --env-file .env.production   -f docker-compose.yml   -f docker-compose.prod.yml   up -d

docker image prune -f

echo "Deployment completed"
```

Enable:

```bash
chmod +x scripts/deploy.sh
```

Run:

```bash
./scripts/deploy.sh
```

## 36. Healthcheck Script

`scripts/healthcheck.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-https://api.restart.example.com}"

HTTP_CODE=$(curl   --silent   --output /dev/null   --write-out "%{http_code}"   "${API_URL}/health")

if [ "$HTTP_CODE" != "200" ]; then
  echo "API health check failed: HTTP ${HTTP_CODE}"
  exit 1
fi

echo "API OK"
```

Enable:

```bash
chmod +x scripts/healthcheck.sh
```

## 37. Release Process

```bash
git status
git pull origin main
git log -5 --oneline

./scripts/deploy.sh
./scripts/healthcheck.sh

docker compose ps
docker compose logs --tail=100 api
docker compose logs --tail=100 ai-worker
docker compose logs --tail=100 data-worker
docker compose logs --tail=100 nusa-worker
```

Use:

```text
DEV → STAGING → PRODUCTION
```

Jangan langsung deploy dari development ke production.

## 38. Migration Rules

Production migration:

```bash
npx prisma migrate deploy
```

Gunakan expand/contract untuk perubahan berisiko:

```text
Add new field
 ↓
Deploy compatible code
 ↓
Backfill
 ↓
Verify
 ↓
Switch reads/writes
 ↓
Remove old field later
```

Jangan melakukan destructive migration tanpa backup dan rollback plan.

## 39. No Dummy Seed

Production **tidak boleh** menjalankan:

```bash
npm run seed
prisma db seed
```

untuk membuat:

```text
fake users
fake jobs
fake revenue
fake transactions
```

User pertama dibuat melalui:

```text
https://restart.example.com/register
```

## 40. Production Go-Live Checklist

### Authentication

```text
[ ] Register
[ ] Email verification
[ ] Login
[ ] Logout
[ ] Reset password
[ ] 2FA admin
```

### Human Capital

```text
[ ] PHK profile
[ ] Pensiun profile
[ ] Calon pensiun profile
[ ] Work history
[ ] Skill
[ ] Experience
[ ] Evidence
```

### AI

```text
[ ] Work DNA
[ ] AI interview
[ ] AI extraction
[ ] AI score
[ ] AI logging
[ ] AI error handling
```

### Real Data

```text
[ ] Source tracking
[ ] Freshness
[ ] Quality
[ ] No dummy data
```

### Payments

```text
[ ] Order
[ ] Payment
[ ] Webhook
[ ] Ledger
[ ] Payout
```

### NUSA

```text
[ ] Qualification
[ ] Training
[ ] Simulation
[ ] Task
[ ] QA
[ ] Payment
```

### Infrastructure

```text
[ ] HTTPS
[ ] Backup
[ ] Restore
[ ] Monitoring
[ ] Alerting
[ ] Logs
```

## 41. Development Roadmap

### Phase 0 — Audit

```text
Existing repository
Existing Docker
Existing database
Existing services
```

Classify:

```text
FUNCTIONAL
PARTIAL
BROKEN
UI ONLY
MISSING
```

### Phase 1 — Foundation

```text
Docker
Postgres
Redis
RabbitMQ
Meilisearch
Nginx
TLS
Backup
Monitoring
```

### Phase 2 — Identity

```text
Auth
RBAC
Consent
Profile
```

### Phase 3 — Human Capital

```text
Work DNA
Experience Bank
Skill Graph
Evidence
```

### Phase 4 — Real Data

```text
BPS
Kemnaker
BKN
Official public data
Licensed datasets
```

### Phase 5 — Opportunity

```text
Job
Business
Consulting
Mentoring
AI Work
```

### Phase 6 — Retirement

```text
Retirement Countdown
Second Career
Knowledge Legacy
Mentoring
```

### Phase 7 — Income

```text
Income Goal
Income Gap
Offer Builder
Portfolio
Marketplace
Payment
```

### Phase 8 — NUSA

```text
Training
Simulation
Certification
AI Evaluation
Task Marketplace
QA
Payout
```

### Phase 9 — Enterprise

```text
Organization
SSO
RBAC
Knowledge Capture
Institutional Memory
Analytics
API
```

## 42. Disaster Recovery

Jika server mati:

```text
1. Provision new server
2. Install Docker
3. Clone repository
4. Restore environment securely
5. Restore PostgreSQL backup
6. Restore object storage/data
7. Start infrastructure
8. Run migrations
9. Start application
10. Verify health
11. Switch DNS
12. Verify production
```

Initial target:

```text
RPO: <= 24 hours
RTO: <= 4 hours
```

Tingkatkan setelah traffic dan SLA meningkat.

## 43. Final Architecture

```text
                         CLOUDFLARE
                              |
                             TLS
                              |
                            NGINX
                              |
            +-----------------+-----------------+
            |                                   |
        RESTART WEB                          ADMIN
            |                                   |
            +-----------------+-----------------+
                              |
                            API
                              |
       +----------------------+----------------------+
       |                      |                      |
   PostgreSQL               Redis                RabbitMQ
       |                      |                      |
       |                  Cache/Session       +------+------+
       |                                      |             |
       |                                     AI            NUSA
       |                                   Worker         Worker
       |
   Human Capital
       |
 +-----+------+--------+----------+
 |            |        |          |
PHK        PENSIUN   SKILL     KNOWLEDGE
 |            |        |          |
 +------------+--------+----------+
              |
        OPPORTUNITY
              |
      +-------+-------+
      |       |       |
     JOB   BUSINESS  AI WORK
                      |
                     NUSA
                      |
              HUMAN INTELLIGENCE
                      |
                  AI COMPANIES
```

## 44. Definition of Done

RESTART AI boleh disebut Production Ready jika:

```text
[ ] Application berjalan tanpa dummy data
[ ] PostgreSQL production aktif
[ ] Prisma migrations tersedia
[ ] Backup otomatis
[ ] Restore berhasil diuji
[ ] Redis healthy
[ ] RabbitMQ healthy
[ ] Meilisearch healthy
[ ] AI provider terhubung
[ ] Real data ingestion aktif
[ ] Source attribution aktif
[ ] Work DNA aktif
[ ] Experience Bank aktif
[ ] Skill Graph aktif
[ ] PHK flow aktif
[ ] Retirement flow aktif
[ ] Knowledge Legacy aktif
[ ] Opportunity Engine aktif
[ ] Payment ledger aktif
[ ] NUSA integration aktif jika termasuk release
[ ] Audit log aktif
[ ] Privacy/consent aktif
[ ] Admin RBAC aktif
[ ] HTTPS aktif
[ ] Monitoring aktif
[ ] Alerting aktif
[ ] Error tracking aktif
[ ] CI/CD aktif
[ ] Staging tested
[ ] Production tested
[ ] Security review completed
```

## 45. Golden Rule

```text
REAL PEOPLE
    ↓
REAL EXPERIENCE
    ↓
REAL EVIDENCE
    ↓
REAL SKILLS
    ↓
REAL OPPORTUNITIES
    ↓
REAL WORK
    ↓
REAL TRANSACTIONS
    ↓
REAL REPUTATION
    ↓
REAL HUMAN INTELLIGENCE
```

AI digunakan untuk membantu memahami dan mengubah data, bukan untuk membuat data palsu.

## 46. Production Launch

Setelah server, environment, Docker Compose, domain, database, migration, backup, dan monitoring siap:

```bash
cd /opt/restart-ai

chmod +x scripts/deploy.sh
chmod +x scripts/healthcheck.sh

./scripts/deploy.sh
./scripts/healthcheck.sh

docker compose ps
```

Buka:

```text
https://restart.example.com
```

Lakukan registrasi dengan akun nyata.

### Critical Rules

1. Pastikan `DATABASE_URL` menunjuk database production yang benar.
2. Pastikan backup tersedia sebelum migration.
3. Jangan expose PostgreSQL/Redis/RabbitMQ/Meilisearch ke internet.
4. Jangan commit `.env.production`.
5. Review semua migration.
6. Jangan jalankan `docker compose down -v` pada production.
7. Jangan jalankan `prisma db push` pada production.
8. Jangan jalankan dummy seed.
9. Jangan menampilkan statistik tanpa source.
10. Jangan menyimpan data pribadi yang tidak diperlukan.


## NUSA Crypto Intelligence

NUSA Crypto Intelligence adalah modul Phase 1 untuk market intelligence crypto Indonesia. Modul ini berjalan di route /crypto dan menyediakan:

- market snapshot BTC, ETH, dan SOL dalam IDR;
- perbandingan ticker BTC/IDR lintas exchange publik;
- indikator spread observasi dengan ambang pemantauan 0,30%;
- intelligence feed, roadmap produk, dan rancangan monetisasi freemium/B2B.

Data diambil server-side melalui endpoint CoinGecko agar kredensial tidak berada di browser. Modul ini read-only: tidak mengeksekusi order dan tidak memberikan nasihat keuangan. Jika upstream tidak tersedia, endpoint mengembalikan status degraded dan UI tidak menampilkan angka fallback.
