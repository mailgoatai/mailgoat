### Configuration Service

Enhanced configuration management with profile support for MailGoat.

## Features

- **Profile Support** - Multiple configurations in `~/.mailgoat/profiles/`
- **Environment Overrides** - Override any config value with `MAILGOAT_*` variables
- **Hierarchical Resolution** - Env variables > Profile > Default config
- **Metadata Tracking** - Track creation/update times and descriptions
- **Cache Integration** - Automatic caching for performance
- **Backward Compatible** - Works with existing single config file

## Quick Start

### Basic Usage

```typescript
import { configService } from './lib/config-service';

// Load default config
const config = configService.load();

// Load specific profile
const stagingConfig = configService.load({ profile: 'staging' });

// Save config
configService.save(config);

// Save to profile
configService.save(config, 'production');
```

### Command Line Usage

```bash
# Use default config
mailgoat send --to user@example.com --subject "Hello"

# Use specific profile
mailgoat send --profile staging --to user@example.com --subject "Hello"

# Or use environment variable
export MAILGOAT_PROFILE=staging
mailgoat send --to user@example.com --subject "Hello"
```

## Directory Structure

```
~/.mailgoat/
├── config.yml              # Default configuration
└── profiles/               # Profile configurations
    ├── staging.yml
    ├── production.yml
    └── development.yml
```

## Configuration Priority

Config values are resolved in this order (highest priority first):

1. **Environment Variables** (`MAILGOAT_*`)
2. **Profile Config** (if `--profile` specified)
3. **Default Config** (`~/.mailgoat/config.yml`)

### Example

```yaml
# ~/.mailgoat/config.yml (default)
server: https://postal.example.com
email: default@example.com
api_key: default_key
```

```yaml
# ~/.mailgoat/profiles/staging.yml
server: https://staging.example.com
email: staging@example.com
api_key: staging_key
metadata:
  name: staging
  description: Staging environment
  created_at: '2024-01-01T00:00:00.000Z'
  updated_at: '2024-01-15T10:30:00.000Z'
```

```bash
# This uses staging profile with server override
export MAILGOAT_SERVER=https://local.example.com
mailgoat send --profile staging --to user@example.com

# Effective config:
# server: https://local.example.com (from env)
# email: staging@example.com (from profile)
# api_key: staging_key (from profile)
```

## Environment Variables

Override any config value:

- `MAILGOAT_SERVER` - Postal server URL
- `MAILGOAT_EMAIL` - From email address
- `MAILGOAT_API_KEY` - API authentication key
- `MAILGOAT_PROFILE` - Profile to use

### Example

```bash
# Override server for one command
MAILGOAT_SERVER=https://temp.example.com mailgoat send --to user@example.com

# Set profile globally
export MAILGOAT_PROFILE=production
mailgoat send --to user@example.com

# Override everything
MAILGOAT_SERVER=https://override.com \
MAILGOAT_EMAIL=override@example.com \
MAILGOAT_API_KEY=override_key \
mailgoat send --to user@example.com
```

## API Reference

### ConfigService

#### `load(options?: ConfigOptions): MailGoatConfig`

Load configuration with hierarchical resolution.

**Options:**
- `profile?: string` - Profile name to load
- `skipEnv?: boolean` - Skip environment variable overrides
- `skipCache?: boolean` - Skip cache lookup/storage

**Returns:** Resolved configuration

**Example:**
```typescript
// Load default config
const config = configService.load();

// Load profile
const stagingConfig = configService.load({ profile: 'staging' });

// Load without env overrides
const pureConfig = configService.load({ skipEnv: true });

// Load without cache
const freshConfig = configService.load({ skipCache: true });
```

#### `save(config: MailGoatConfig, profileName?: string): void`

Save configuration to file.

**Parameters:**
- `config` - Configuration object
- `profileName?` - Profile name (saves to profile if specified, default config otherwise)

**Example:**
```typescript
const config = {
  server: 'https://postal.example.com',
  email: 'user@example.com',
  api_key: 'key_123',
};

// Save to default config
configService.save(config);

// Save to profile
configService.save(config, 'staging');
```

#### `listProfiles(): string[]`

List available profiles.

**Returns:** Array of profile names (sorted)

**Example:**
```typescript
const profiles = configService.listProfiles();
// ['development', 'production', 'staging']
```

#### `createProfile(profileName: string, config?: MailGoatConfig, description?: string): void`

Create a new profile.

**Parameters:**
- `profileName` - Name for the new profile
- `config?` - Configuration (uses default config if not provided)
- `description?` - Profile description

**Example:**
```typescript
// Create from default config
configService.createProfile('new-env', undefined, 'New environment');

// Create with custom config
const customConfig = {
  server: 'https://custom.example.com',
  email: 'custom@example.com',
  api_key: 'custom_key',
};
configService.createProfile('custom', customConfig, 'Custom setup');
```

#### `deleteProfile(profileName: string): void`

Delete a profile.

**Parameters:**
- `profileName` - Profile to delete

**Example:**
```typescript
configService.deleteProfile('old-env');
```

#### `copyProfile(sourceName: string, targetName: string): void`

Copy a profile to a new name.

**Parameters:**
- `sourceName` - Source profile name
- `targetName` - Target profile name

**Example:**
```typescript
configService.copyProfile('staging', 'staging-backup');
```

#### `profileExists(profileName: string): boolean`

Check if a profile exists.

**Returns:** `true` if profile exists

**Example:**
```typescript
if (configService.profileExists('staging')) {
  console.log('Staging profile found');
}
```

#### `defaultConfigExists(): boolean`

Check if default config exists.

**Returns:** `true` if default config exists

**Example:**
```typescript
if (!configService.defaultConfigExists()) {
  console.log('Run: mailgoat config init');
}
```

#### `getProfileMetadata(profileName: string): ProfileMetadata | null`

Get profile metadata.

**Returns:** Metadata object or `null` if not found

**Example:**
```typescript
const metadata = configService.getProfileMetadata('staging');
if (metadata) {
  console.log(`Created: ${metadata.created_at}`);
  console.log(`Description: ${metadata.description}`);
}
```

## Profile Metadata

Profiles include metadata for tracking:

```yaml
server: https://staging.example.com
email: staging@example.com
api_key: staging_key
metadata:
  name: staging
  description: Staging environment for testing
  created_at: '2024-01-01T00:00:00.000Z'
  updated_at: '2024-01-15T10:30:00.000Z'
```

**Fields:**
- `name` - Profile name
- `description` - Human-readable description
- `created_at` - ISO 8601 timestamp
- `updated_at` - ISO 8601 timestamp (updated on save)

## Validation

All configurations are validated before save:

```typescript
// Valid config
const validConfig = {
  server: 'https://postal.example.com', // Must be valid HTTPS URL
  email: 'user@example.com',            // Must be valid email
  api_key: 'key_12345678',              // Must be >= 8 characters
};

// Invalid configs throw errors
configService.save({ server: 'invalid' }); // Throws validation error
```

## Profile Names

**Rules:**
- Alphanumeric, dashes, and underscores only (`[a-zA-Z0-9_-]`)
- Maximum 50 characters
- No reserved names: `default`, `config`, `profiles`

**Valid names:**
```
staging
production
dev-local
test_env_123
```

**Invalid names:**
```
invalid name       // spaces not allowed
invalid@profile    // special chars not allowed
default            // reserved name
```

## Cache Behavior

ConfigService uses caching for performance:

- **Cache TTL:** 5 minutes (CacheTTL.MEDIUM)
- **Cache Key:** `config:profile:<name>` or `config:<path>`
- **Invalidation:** Automatic on save/delete
- **Skip:** Use `skipCache: true` option

### Cache Control

```typescript
// Use cache (default)
const config = configService.load();

// Skip cache (force fresh load)
const freshConfig = configService.load({ skipCache: true });

// Manual invalidation (rarely needed)
cacheManager.invalidate('config:profile:staging');
```

## Migration from ConfigManager

The new ConfigService is backward compatible with the old ConfigManager:

### Old Code (ConfigManager)

```typescript
import { ConfigManager } from './lib/config';

const manager = new ConfigManager();
const config = manager.load();
manager.save(config);
```

### New Code (ConfigService)

```typescript
import { configService } from './lib/config-service';

const config = configService.load();
configService.save(config);
```

### Migration Steps

1. **Keep existing config** - ConfigService reads `~/.mailgoat/config.yml`
2. **Add profiles** - Optionally create profiles for different environments
3. **Update imports** - Change `ConfigManager` to `ConfigService`
4. **Add profile flags** - Use `--profile` in commands

## Common Workflows

### Setup Multiple Environments

```bash
# Initialize default config
mailgoat config init

# Create staging profile
mailgoat config profile create staging --from default
mailgoat config profile set staging --server https://staging.example.com
mailgoat config profile set staging --email staging@example.com

# Create production profile
mailgoat config profile create production --from default
mailgoat config profile set production --server https://postal.example.com
mailgoat config profile set production --email prod@example.com
```

### Switch Between Environments

```bash
# Use staging
mailgoat send --profile staging --to user@example.com

# Use production
mailgoat send --profile production --to user@example.com

# Or set globally
export MAILGOAT_PROFILE=staging
mailgoat send --to user@example.com
```

### Temporary Overrides

```bash
# Test against local Postal instance
MAILGOAT_SERVER=https://localhost:5000 mailgoat send --to test@example.com

# Use different API key temporarily
MAILGOAT_API_KEY=temp_key_123 mailgoat inbox
```

### Profile Management

```bash
# List profiles
mailgoat config profile list

# Show profile details
mailgoat config profile show staging

# Copy profile
mailgoat config profile copy staging staging-backup

# Delete profile
mailgoat config profile delete old-env
```

## Best Practices

### 1. Use Profiles for Environments

```bash
~/.mailgoat/profiles/
├── development.yml   # Local development
├── staging.yml       # Staging environment
├── production.yml    # Production (careful!)
└── testing.yml       # Automated tests
```

### 2. Set MAILGOAT_PROFILE in Shell RC

```bash
# ~/.zshrc or ~/.bashrc
export MAILGOAT_PROFILE=development
```

### 3. Use Environment Variables in CI/CD

```yaml
# .github/workflows/test.yml
env:
  MAILGOAT_SERVER: ${{ secrets.POSTAL_SERVER }}
  MAILGOAT_API_KEY: ${{ secrets.POSTAL_API_KEY }}
  MAILGOAT_EMAIL: ci@example.com
```

### 4. Document Profiles

Use description field:

```yaml
metadata:
  name: staging
  description: Staging environment - shared team testing server
  created_at: '2024-01-01T00:00:00.000Z'
```

### 5. Secure API Keys

```bash
# Never commit profiles with real API keys!
echo "profiles/*.yml" >> .gitignore

# Or use environment variables in CI
export MAILGOAT_API_KEY=$SECRET_KEY
```

## Troubleshooting

### Profile not found

```
Error: Profile "staging" not found
Available profiles: development, production
```

**Solution:** Create the profile or check spelling

```bash
mailgoat config profile list
mailgoat config profile create staging
```

### Validation errors

```
Error: Configuration validation failed: Invalid server URL
```

**Solution:** Check config values meet requirements

```bash
mailgoat config validate staging
```

### Environment override not working

```bash
# Make sure variable is exported
export MAILGOAT_SERVER=https://example.com

# Or inline
MAILGOAT_SERVER=https://example.com mailgoat send ...
```

### Cache issues

```typescript
// Force fresh load
const config = configService.load({ skipCache: true });
```

## Related Documentation

- [Configuration Guide](./configuration.md)
- [ValidationService](./validation-service.md)
- [CacheManager](./cache-manager.md)
- [CLI Reference](../wiki/cli-reference.md)
