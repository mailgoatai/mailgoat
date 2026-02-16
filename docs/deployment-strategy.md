# Deployment Strategy

This document outlines MailGoat's deployment strategy for when we build backend services (Phase 3).

**Status:** 📋 Planning Document  
**Current:** CLI-only, no backend yet  
**Future:** Backend API, web dashboard, scheduled jobs

---

## Overview

MailGoat currently operates as a CLI tool that connects to self-hosted or cloud Postal instances. This document plans for future backend services we may build.

## Potential Backend Services (Future)

### 1. MailGoat API Gateway
**Purpose:** Centralized API for web dashboard, mobile apps

**Features:**
- User authentication & authorization
- API key management
- Usage analytics
- Rate limiting
- Billing/subscription management (if SaaS)

### 2. Web Dashboard
**Purpose:** Browser-based UI for MailGoat

**Features:**
- Email composition & inbox
- Template management
- Team collaboration
- Analytics & reporting

### 3. Scheduled Jobs
**Purpose:** Background processing

**Features:**
- Email scheduling (send later)
- Auto-retry failed sends
- Analytics aggregation
- Report generation

### 4. Webhook Service
**Purpose:** Real-time notifications

**Features:**
- Inbound email webhooks
- Delivery status updates
- Event streaming

---

## Deployment Architecture

### Target Platform Options

#### Option A: Fly.io (Recommended)
**Pros:**
- Global edge deployment
- Built-in PostgreSQL
- Easy scaling
- Zero-downtime deployments
- Great DX

**Cons:**
- Smaller ecosystem than AWS
- Learning curve

**Cost:** ~$10-50/month (small scale)

#### Option B: Railway
**Pros:**
- Extremely simple deploys
- GitHub integration
- Good free tier
- Rapid prototyping

**Cons:**
- More expensive at scale
- Less mature platform

**Cost:** ~$5-20/month (small scale)

#### Option C: AWS (ECS Fargate)
**Pros:**
- Enterprise-grade
- Massive ecosystem
- Fine-grained control
- Mature platform

**Cons:**
- Complex setup
- Overkill for MVP
- Higher minimum cost

**Cost:** ~$30-100/month (small scale)

**Recommendation:** Start with Fly.io, migrate to AWS if needed at scale.

---

## Environment Strategy

### 1. Development (Local)
- Run backend locally: `npm run dev`
- Connect to local Postal instance
- Hot reload enabled
- Debug logging

**URL:** `http://localhost:3000`

### 2. Staging
- Deployed on every merge to `develop`
- Mirrors production environment
- Test data only
- Used for QA testing

**URL:** `https://staging.mailgoat.ai`

### 3. Production
- Deployed on git tags (`v*.*.*`)
- Real user data
- High availability
- Monitoring enabled

**URL:** `https://api.mailgoat.ai`

---

## Deployment Pipeline

### Workflow: `deploy.yml` (Future)

```yaml
name: Deploy Backend

on:
  push:
    branches: [main, develop]
    tags: ['v*']

env:
  FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

jobs:
  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --config fly.staging.toml
  
  deploy-production:
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    needs: [test, build]
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --config fly.production.toml
      - run: flyctl migrate  # Run DB migrations
```

---

## Database Strategy

### Technology: PostgreSQL
**Why:** Mature, reliable, great ecosystem, Fly.io native support

### Migration Strategy: Prisma
```bash
# Create migration
npx prisma migrate dev --name add-user-table

# Apply migration (staging)
npx prisma migrate deploy --preview-feature

# Apply migration (production)
npx prisma migrate deploy
```

### Backup Strategy
- **Automated:** Daily backups (Fly.io Postgres)
- **Manual:** Pre-migration backups
- **Retention:** 30 days

### Migration in CI/CD
```yaml
- name: Run database migrations
  run: |
    flyctl proxy 5432 -a mailgoat-db &
    sleep 5
    npx prisma migrate deploy
    kill %1
```

---

## Rollback Procedures

### 1. Application Rollback
```bash
# Fly.io: Revert to previous deployment
flyctl releases list
flyctl releases rollback <VERSION>

# Railway: Use web UI or CLI
railway rollback
```

### 2. Database Rollback
```bash
# Manual rollback script
bash scripts/rollback-migration.sh <MIGRATION_NAME>

# Restore from backup
flyctl postgres restore --backup <BACKUP_ID>
```

### 3. Emergency Rollback
```bash
# Full emergency rollback
flyctl scale count 0  # Stop app
flyctl postgres restore --backup <LAST_GOOD_BACKUP>
flyctl releases rollback <LAST_GOOD_VERSION>
flyctl scale count 2  # Restart
```

---

## Configuration Management

### Environment Variables
Stored in platform secrets (Fly.io, Railway)

**Required:**
- `DATABASE_URL`: PostgreSQL connection string
- `POSTAL_API_URL`: Postal instance URL
- `JWT_SECRET`: Session signing key
- `API_KEY_SALT`: API key hashing salt
- `SMTP_HOST`: Email notification SMTP
- `NODE_ENV`: production/staging/development

**Optional:**
- `SENTRY_DSN`: Error tracking
- `ANALYTICS_KEY`: Analytics service
- `STRIPE_KEY`: Payment processing (if SaaS)

### Secrets Rotation
- Rotate JWT_SECRET every 90 days
- Rotate API_KEY_SALT on security incidents
- Automate with GitHub Actions schedule

---

## Monitoring & Observability

### Application Monitoring
**Tool:** Sentry (recommended) or Datadog

**Metrics:**
- Request latency
- Error rate
- API endpoint usage
- Database query performance

### Infrastructure Monitoring
**Tool:** Fly.io Metrics (built-in) or Grafana

**Metrics:**
- CPU usage
- Memory usage
- Network I/O
- Database connections

### Logging
**Tool:** Fly.io Logs + Papertrail/Logtail

**Log Levels:**
- ERROR: Always logged
- WARN: Logged in production
- INFO: Logged in staging
- DEBUG: Development only

### Alerts
**Configure alerts for:**
- Error rate > 1%
- Response time > 2s (p95)
- Database connections > 80%
- Deployment failures
- Failed migrations

---

## Health Checks & Readiness

### Endpoints
```typescript
// GET /health
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 123456,
  "checks": {
    "database": "healthy",
    "postal": "healthy",
    "redis": "healthy"
  }
}

// GET /ready
// Returns 200 if ready for traffic
// Returns 503 if still initializing
```

### Load Balancer Configuration
```yaml
# Fly.io: fly.toml
[http_service]
  internal_port = 3000
  protocol = "tcp"
  
  [[http_service.checks]]
    interval = "15s"
    timeout = "10s"
    grace_period = "30s"
    method = "GET"
    path = "/health"
```

---

## Scaling Strategy

### Horizontal Scaling
**Manual:**
```bash
flyctl scale count 3  # Run 3 instances
```

**Auto-scaling (Future):**
```toml
[auto_scaling]
  min_count = 2
  max_count = 10
  target_cpu = 70
  target_memory = 80
```

### Vertical Scaling
```bash
# Increase resources per instance
flyctl scale vm shared-cpu-2x
flyctl scale memory 1024
```

### Database Scaling
- Start with single instance
- Add read replicas at scale
- Consider sharding for very large scale

---

## Disaster Recovery

### Backup Strategy
- **Database:** Daily full backups, hourly incrementals
- **File Storage:** S3 with versioning
- **Configuration:** Version controlled in git

### Recovery Time Objectives (RTO)
- **Critical outage:** < 1 hour
- **Data loss:** < 15 minutes (RPO)
- **Planned maintenance:** Zero downtime

### Disaster Recovery Plan
1. **Detect:** Monitoring alerts + PagerDuty
2. **Assess:** Incident commander assigned
3. **Communicate:** Status page + user notifications
4. **Restore:** Execute rollback or failover
5. **Verify:** Run smoke tests
6. **Post-mortem:** Document and improve

---

## Cost Optimization

### Current (CLI-only)
**Cost:** $0 (users run their own Postal)

### Future (With Backend)
**Estimated Monthly Costs:**

| Service | Small Scale | Medium Scale | Large Scale |
|---------|-------------|--------------|-------------|
| Hosting | $20 | $100 | $500 |
| Database | $10 | $50 | $200 |
| Storage | $5 | $25 | $100 |
| Monitoring | $0 | $25 | $100 |
| **Total** | **$35** | **$200** | **$900** |

**Optimization Strategies:**
- Use reserved instances (20% savings)
- Optimize database queries
- Implement caching (Redis)
- Use CDN for static assets
- Right-size instances

---

## Security Considerations

### Authentication
- JWT tokens for API
- OAuth2 for third-party integrations
- Rate limiting per API key
- IP whitelisting (optional)

### Encryption
- TLS 1.3 for all connections
- Encrypted database backups
- Secrets encryption at rest

### Compliance
- GDPR compliance (EU users)
- SOC 2 (if enterprise)
- Regular security audits

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Security scan passed
- [ ] Database migration tested
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Monitoring configured

### During Deployment
- [ ] Deployment triggered
- [ ] Health checks passing
- [ ] Smoke tests executed
- [ ] No error spikes
- [ ] Performance metrics normal

### Post-Deployment
- [ ] Verify in production
- [ ] Monitor for 1 hour
- [ ] Update documentation
- [ ] Notify stakeholders
- [ ] Close deployment ticket

---

## Timeline

- **Q1 2026:** CLI v1.0 release (current focus)
- **Q2 2026:** Backend API planning & design
- **Q3 2026:** Backend MVP deployment (staging)
- **Q4 2026:** Production backend launch

---

**Last Updated:** 2026-02-15  
**Status:** Planning Document  
**Maintained By:** DevOps (@devops) & Lead Engineer (@lead-engineer)
