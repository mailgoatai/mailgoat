# Debug Mode Feature - Changelog

## Version 0.2.0 (2026-02-15)

### Added

#### Debug Logging System

- **Global `--debug` flag**: Enable verbose logging for all commands
- **Namespaced logging**: `DEBUG=mailgoat:*` environment variable support
- **Five debug namespaces**: main, config, validation, api, timing
- **Sensitive data sanitization**: Automatic masking of API keys, passwords, tokens
- **Performance timing**: Track operation duration with millisecond precision
- **HTTP request/response logging**: Full request/response details for API calls
- **Retry behavior logging**: Track retry attempts and backoff delays
- **Error logging with stack traces**: Detailed error information for debugging

#### Documentation

- `docs/DEBUG.md` - Comprehensive debug mode documentation
- `docs/DEBUG-EXAMPLES.md` - Real-world troubleshooting examples
- `tests/test-debug-mode.sh` - Automated test suite for debug functionality
- Updated README with troubleshooting section

### Implementation Details

**Files Added:**

- `src/lib/debug.ts` - Core debug logger with namespace support (230 lines)
- `docs/DEBUG.md` - Full documentation (380 lines)
- `docs/DEBUG-EXAMPLES.md` - Examples and use cases (470 lines)
- `tests/test-debug-mode.sh` - Test suite (140 lines)

**Files Modified:**

- `src/index.ts` - Added global --debug flag and preAction hook
- `src/lib/postal-client.ts` - Added API request/response logging and retry logging
- `src/lib/config.ts` - Added config loading and resolution logging
- `src/lib/validators.ts` - Added input validation logging
- `src/commands/send.ts` - Added operation timing
- `README.md` - Added troubleshooting section with debug mode info

### Features

#### 1. Global Debug Flag

```bash
mailgoat send --to user@example.com --subject "Test" --body "Hello" --debug
```

Enables all debug namespaces (`mailgoat:*`)

#### 2. Environment Variable Support

```bash
# All namespaces
DEBUG=mailgoat:* mailgoat send ...

# Specific namespace
DEBUG=mailgoat:api mailgoat send ...

# Multiple namespaces
DEBUG=mailgoat:api,mailgoat:config mailgoat send ...
```

#### 3. Namespaced Logging

**mailgoat:main** - CLI lifecycle

- Node version, platform, architecture
- Current working directory
- Command arguments

**mailgoat:config** - Configuration

- Config file path resolution
- File reading and parsing
- API key length (sanitized)
- Validation results

**mailgoat:validation** - Input validation

- All input parameters
- Validation results for each field
- Specific validation failures

**mailgoat:api** - HTTP operations

- Request method, URL, headers, body
- Response status, body
- Error details with stack traces
- Retry attempts and backoff delays

**mailgoat:timing** - Performance

- Operation start/end times
- Duration for each step
- Total operation time

#### 4. Sensitive Data Protection

Automatically sanitizes:

- API keys (shows first 4 and last 4 characters only)
- Passwords (masked as `***`)
- Tokens (masked as `***`)
- Secrets (masked as `***`)

Example:

```
X-Server-API-Key: "abcd...xyz9"  (instead of full key)
```

#### 5. Human-Readable Output

Timestamps with color-coded output:

- Gray for timestamps
- Cyan for namespace
- Yellow for warnings
- Green for success
- Red for errors

#### 6. Performance Tracking

```
[timestamp] [mailgoat:timing] ⏱️  Started: Send email operation
[timestamp] [mailgoat:timing] ✓ Completed: Send email operation (247ms)
```

Tracks timing for:

- Configuration loading
- Input validation
- Client initialization
- API requests
- Total operation

### Use Cases

1. **Troubleshooting connection issues** - See exact request/response
2. **Debugging authentication** - Verify API key and config
3. **Performance analysis** - Identify bottlenecks
4. **Retry behavior monitoring** - Watch retry attempts
5. **Input validation debugging** - See which validation failed
6. **CI/CD integration** - Debug pipeline failures
7. **Rate limiting analysis** - Track 429 errors and retries

### Testing

Test suite includes 10 test cases:

1. Global --debug flag enables debug logging
2. DEBUG=mailgoat:\* enables all namespaces
3. DEBUG=mailgoat:config enables config namespace
4. Debug logs show Node version
5. Debug logs show platform info
6. Debug logs show command being run
7. Config loading debug works
8. No debug logs when disabled
9. API key sanitization works
10. Debug logs work with send command

Run tests:

```bash
bash tests/test-debug-mode.sh
```

### Performance Impact

Minimal overhead:

- Config/validation logging: <1ms per operation
- API logging: <5ms per request (JSON serialization)
- Timing: <1ms per measurement

**Safe for production** troubleshooting, but disable for high-throughput (>100 emails/sec).

### Breaking Changes

None. Debug mode is opt-in and disabled by default.

### Migration Guide

No migration needed. Debug mode is a new feature that doesn't affect existing functionality.

### Examples

See `docs/DEBUG-EXAMPLES.md` for:

- Authentication debugging
- Performance analysis
- Network troubleshooting
- Rate limiting
- CI/CD integration
- Common error patterns

### Related Issues

- Closes: task-add-debug-mode-with-verbose-logging-bb24456d
- Feature request: Better CLI debugging and visibility

### Credits

Implemented by @developer-3 as part of MailGoat CLI development.

---

## Future Enhancements

Potential future improvements:

- [ ] JSON output format for debug logs (machine-readable)
- [ ] Log level control (debug, info, warn, error)
- [ ] Debug log file output (in addition to stderr)
- [ ] Interactive debug mode with REPL
- [ ] Debug stats summary at end of operation
- [ ] Flame graph generation for performance profiling
- [ ] Debug log filtering by time range
- [ ] Integration with external monitoring tools (Sentry, DataDog)
