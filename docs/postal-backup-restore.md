# Postal Backup & Restore Guide

Complete guide for backing up and restoring the Postal mail server database.

## Overview

**What Gets Backed Up:**
- MariaDB `postal` database (all email data, configurations, accounts)
- Automated daily backups at 2 AM UTC
- 7-day retention policy
- Compressed `.sql.gz` format

**Location:** `/var/backups/postal/database/` on VPS

## Quick Reference

```bash
# Manual backup
ssh mailgoat@91.98.35.3
~/postal/backup-database.sh

# List backups
ls -lh /var/backups/postal/database/

# Restore from backup
~/postal/restore-database.sh postal_backup_20260216_075508.sql.gz
```

## Backup System

### Automated Backups

**Schedule:** Daily at 2:00 AM UTC  
**Cron Job:**
```bash
0 2 * * * /home/mailgoat/postal/backup-database.sh
```

**What Happens:**
1. ✅ Checks MariaDB container is running
2. ✅ Creates compressed SQL dump with timestamp
3. ✅ Verifies backup integrity
4. ✅ Rotates old backups (keeps last 7 days)
5. ✅ Logs everything to `/var/log/postal-backup.log`

### Manual Backup

When you need an immediate backup (before major changes):

```bash
ssh mailgoat@91.98.35.3
~/postal/backup-database.sh
```

**Output:**
```
[2026-02-16 07:55:08] === Starting Postal Database Backup ===
[2026-02-16 07:55:08] Creating backup: postal_backup_20260216_075508.sql.gz
[2026-02-16 07:55:08] SUCCESS: Backup created (8.0K)
[2026-02-16 07:55:08] SUCCESS: Backup integrity verified
[2026-02-16 07:55:08] === Backup Complete ===
```

### Backup Files

**Naming Convention:** `postal_backup_YYYYMMDD_HHMMSS.sql.gz`

**Example:**
```
postal_backup_20260216_075508.sql.gz
                    ^         ^
                    |         └─ Time (07:55:08)
                    └─────────── Date (2026-02-16)
```

## Restore Process

### Before You Restore

⚠️ **WARNING:** Restoring replaces the current database completely!

**Checklist:**
- [ ] Create a current backup first (safety net)
- [ ] Identify the correct backup file to restore
- [ ] Stop sending new emails (if applicable)
- [ ] Have 5-10 minutes for downtime

### Restore from Backup

**1. List Available Backups:**
```bash
ssh mailgoat@91.98.35.3
ls -lh /var/backups/postal/database/
```

**2. Run Restore Script:**
```bash
~/postal/restore-database.sh postal_backup_20260216_075508.sql.gz
```

**3. Confirm the Restore:**
```
⚠️  WARNING: This will REPLACE the current database. Continue? (yes/no): yes
```

**4. Restart Postal Containers:**
```bash
cd ~/postal
docker-compose restart
```

**5. Verify Services:**
```bash
docker ps
# All containers should show "Up" status
```

### Restore Output

```
[2026-02-16 08:00:00] === Starting Postal Database Restore ===
[2026-02-16 08:00:00] Backup file: postal_backup_20260216_075508.sql.gz
[2026-02-16 08:00:00] Verifying backup integrity...
[2026-02-16 08:00:01] Restoring database...
[2026-02-16 08:00:03] SUCCESS: Database restored
[2026-02-16 08:00:03] === Restore Complete ===
⚠️  Remember to restart Postal containers
```

## Backup Verification

### Check Backup Integrity

The backup script automatically verifies integrity, but you can manually check:

```bash
gunzip -t /var/backups/postal/database/postal_backup_20260216_075508.sql.gz
# No output = valid backup
```

### View Backup Contents

```bash
# List tables in backup
gunzip < /var/backups/postal/database/postal_backup_20260216_075508.sql.gz | \
  grep "^CREATE TABLE" | head -10
```

### Backup Size Monitoring

```bash
# Total backup directory size
du -sh /var/backups/postal/database/

# Individual backup sizes
ls -lh /var/backups/postal/database/
```

## Monitoring & Logs

### Check Backup Logs

```bash
ssh mailgoat@91.98.35.3
tail -f /var/log/postal-backup.log
```

**Log Entries:**
- Backup start/completion timestamps
- Success/failure status
- Backup file sizes
- Rotation statistics

### Check Last Backup

```bash
ls -lt /var/backups/postal/database/ | head -3
```

### Verify Cron Job

```bash
ssh mailgoat@91.98.35.3
crontab -l | grep postal
```

## Disaster Recovery Scenarios

### Scenario 1: Database Corruption

**Symptoms:**
- Postal containers won't start
- SQL errors in logs
- Data inconsistencies

**Recovery:**
```bash
# 1. Stop Postal services
cd ~/postal
docker-compose down

# 2. Restore from last good backup
~/postal/restore-database.sh postal_backup_YYYYMMDD_HHMMSS.sql.gz

# 3. Start services
docker-compose up -d

# 4. Verify
docker ps
docker logs postal-web
```

### Scenario 2: Accidental Data Deletion

**If you deleted emails/accounts by mistake:**

```bash
# 1. Create immediate backup (preserve current state)
~/postal/backup-database.sh

# 2. Restore from before deletion
~/postal/restore-database.sh postal_backup_<before_deletion>.sql.gz

# 3. Restart services
cd ~/postal && docker-compose restart
```

### Scenario 3: Complete Server Failure

**Starting with a fresh VPS:**

```bash
# 1. Set up new server (follow deployment guide)
# 2. Copy backup files to new server
scp mailgoat@91.98.35.3:/var/backups/postal/database/*.gz new-server:/tmp/

# 3. Move to backup directory
ssh new-server
sudo mkdir -p /var/backups/postal/database
sudo mv /tmp/*.gz /var/backups/postal/database/
sudo chown mailgoat:mailgoat /var/backups/postal/database/*.gz

# 4. Restore database
~/postal/restore-database.sh postal_backup_<latest>.sql.gz

# 5. Start Postal
cd ~/postal && docker-compose up -d
```

## Backup Strategy

### Retention Policy

**Current:** 7 days (7 backup files)

**Modify Retention:**
Edit `~/postal/backup-database.sh`:
```bash
RETENTION_DAYS=14  # Keep 14 days instead
```

### Storage Requirements

**Estimate:** ~10-50 KB per backup initially

**Growth:** As email volume increases:
- 1,000 emails: ~50-100 MB
- 10,000 emails: ~500 MB - 1 GB
- 100,000 emails: ~5-10 GB

**Monitor disk usage:**
```bash
df -h /var  # Check available space
du -sh /var/backups/postal/database/  # Check backup size
```

### Off-Site Backups (Recommended)

For production, add off-site backup sync:

```bash
# Example: Daily sync to S3
0 3 * * * aws s3 sync /var/backups/postal/database/ s3://your-bucket/postal-backups/
```

Or use rsync to another server:
```bash
0 3 * * * rsync -avz /var/backups/postal/database/ backup-server:/backups/postal/
```

## Testing Backups

### Monthly Backup Test (Recommended)

**Best Practice:** Test restore monthly to ensure backups work

```bash
# 1. Create test environment (optional separate VPS)
# 2. Copy latest backup
# 3. Restore and verify
# 4. Document any issues
```

**Quick Test on Production:**
```bash
# 1. Create immediate backup
~/postal/backup-database.sh

# 2. Verify integrity
gunzip -t /var/backups/postal/database/postal_backup_*.sql.gz

# 3. Check logs
tail /var/log/postal-backup.log
```

## Backup Script Details

### Location & Files

```
~/postal/
├── backup-database.sh    # Backup script
├── restore-database.sh   # Restore script
├── .env                  # Database credentials (used by scripts)
└── docker-compose.yml

/var/backups/postal/database/    # Backup storage
/var/log/postal-backup.log       # Backup logs
```

### Script Features

**backup-database.sh:**
- ✅ Automated daily execution via cron
- ✅ Compressed backups (gzip)
- ✅ Integrity verification
- ✅ Automatic rotation (7-day retention)
- ✅ Detailed logging
- ✅ Error handling & exit codes
- ✅ Single-transaction dumps (consistency)

**restore-database.sh:**
- ✅ Interactive confirmation prompt
- ✅ Integrity verification before restore
- ✅ Detailed logging
- ✅ Error handling
- ✅ Flexible file path handling

### Manual Modifications

**Change backup schedule:**
```bash
crontab -e
# Modify: 0 2 * * * to desired schedule
```

**Change retention:**
Edit `~/postal/backup-database.sh` and modify `RETENTION_DAYS`

**Change backup location:**
Edit both scripts and modify `BACKUP_DIR`

## Troubleshooting

### Backup Fails

**Check logs:**
```bash
tail -20 /var/log/postal-backup.log
```

**Common issues:**
1. **MariaDB container not running**
   ```bash
   docker ps | grep postal-mariadb
   docker-compose up -d postal-mariadb
   ```

2. **Disk space full**
   ```bash
   df -h /var
   # Clean old backups manually if needed
   ```

3. **Permission errors**
   ```bash
   sudo chown mailgoat:mailgoat /var/backups/postal/database
   sudo chown mailgoat:mailgoat /var/log/postal-backup.log
   ```

### Restore Fails

**Check backup integrity first:**
```bash
gunzip -t /var/backups/postal/database/postal_backup_*.sql.gz
```

**Check database credentials:**
```bash
cat ~/postal/.env | grep DB_ROOT_PASSWORD
# Verify matches docker-compose.yml
```

**Check MariaDB container:**
```bash
docker logs postal-mariadb
docker exec postal-mariadb mysql -u root -p"${DB_ROOT_PASSWORD}" -e "SHOW DATABASES;"
```

### Cron Job Not Running

**Check cron service:**
```bash
systemctl status cron
```

**Check crontab:**
```bash
crontab -l
```

**Test script manually:**
```bash
~/postal/backup-database.sh
echo $?  # Should be 0 for success
```

**Check system mail for errors:**
```bash
mail  # Check for cron error messages
```

## Security Notes

### Backup File Security

**Permissions:**
```bash
ls -l /var/backups/postal/database/
# Should be: -rw-r--r-- mailgoat mailgoat
```

**Contains sensitive data:**
- Email content
- User passwords (hashed)
- API keys
- Configuration secrets

**Protect backups:**
- Restrict access to mailgoat user only
- Use encrypted off-site storage
- Secure backup transfer (SSH/SFTP, not FTP)

### Credential Security

Database credentials stored in `~/postal/.env`:
```bash
# Protect this file!
chmod 600 ~/postal/.env
```

Scripts read credentials from `.env` - keep this file secure.

## What's NOT Backed Up

This backup strategy covers the database only. Not included:

❌ **Docker volumes:** `postal_postal-config`, `postal_postal-data`  
❌ **RabbitMQ queue data:** `postal_rabbitmq-data`  
❌ **Postal configuration:** `postal.yml` (backup separately)  
❌ **Docker images:** Re-pull from registry  
❌ **System configuration:** UFW rules, SSH keys, etc.

**To backup configuration separately:**
```bash
# Backup Postal config
cp ~/postal/postal.yml ~/postal/backups/postal.yml.backup
cp ~/postal/.env ~/postal/backups/.env.backup
cp ~/postal/docker-compose.yml ~/postal/backups/docker-compose.yml.backup
```

## Future Enhancements

**Possible improvements:**

1. **Docker volume backups** - Backup postal-config and postal-data volumes
2. **Off-site sync** - Automated S3 or rsync to remote server
3. **Email notifications** - Alert on backup failures (via Postal once configured!)
4. **Backup encryption** - Encrypt backups at rest (GPG)
5. **Point-in-time recovery** - Enable binary logs for incremental backups
6. **Monitoring integration** - Send metrics to monitoring system

## Summary

**Daily Routine:**
- ✅ Backups run automatically at 2 AM UTC
- ✅ 7 days of backups retained
- ✅ Logs written to `/var/log/postal-backup.log`

**Emergency Restore:**
```bash
~/postal/restore-database.sh postal_backup_YYYYMMDD_HHMMSS.sql.gz
cd ~/postal && docker-compose restart
```

**Verification:**
```bash
ls -lh /var/backups/postal/database/
tail /var/log/postal-backup.log
```

---

## Related Documentation

- [Postal Deployment Guide](./postal-deployment-guide.md)
- [Self-Hosting Guide](./self-hosting-guide.md)
- Docker Compose configuration: `~/postal/docker-compose.yml`

---

**Last Updated:** 2026-02-16  
**Maintained By:** DevOps Agent  
**VPS:** 91.98.35.3 (mailgoat@mailgoat.ai)
