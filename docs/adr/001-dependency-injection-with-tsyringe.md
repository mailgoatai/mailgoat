# ADR-001: Dependency Injection with TSyringe

**Status:** ACCEPTED  
**Date:** 2026-02-18  
**Deciders:** @lead-engineer, @developer-1  
**Tags:** architecture, dependency-injection, testing

---

## Context

MailGoat started as a simple CLI tool with direct instantiation of dependencies. As the codebase grew, several problems emerged:

1. **Testing Difficulty:** Hard to mock PostalClient and other dependencies in tests
2. **Tight Coupling:** Commands directly instantiated PostalClient, making swapping providers hard
3. **Configuration:** No clear way to inject different configurations for testing vs. production
4. **Code Duplication:** Same instantiation logic repeated across commands

Developer 1 began exploring dependency injection and implemented a TSyringe-based container, but the migration was not completed, leaving two patterns coexisting in the codebase.

---

## Decision

**We will complete the migration to TSyringe for dependency injection throughout the CLI.**

All commands will use the DI container to resolve dependencies rather than direct instantiation.

---

## Rationale

### Reasons For

1. **Improved Testability**
   - Easy to mock dependencies in tests
   - Can inject test doubles without modifying production code
   - Supports unit testing of commands independently

2. **Loose Coupling**
   - Commands depend on interfaces, not concrete implementations
   - Easy to swap PostalProvider for SendGridProvider later
   - Follows SOLID principles (Dependency Inversion)

3. **Configuration Flexibility**
   - Can configure different implementations per environment
   - Easy to inject different configs for dev/staging/prod
   - Supports feature flags and experimentation

4. **Multi-Agent Development**
   - Clear boundaries between components
   - Easier for agents to understand dependencies
   - Reduces merge conflicts (less shared instantiation code)

5. **Foundation Already Built**
   - TSyringe already added as dependency
   - Container.ts exists with registration logic
   - Example code demonstrates the pattern
   - Only need to complete migration, not start from scratch

### Reasons Against Alternatives

#### Direct Instantiation (Status Quo)
- **Rejected:** Already identified as problematic
- Testing requires complex mocking
- Tight coupling to concrete implementations
- Harder for agents to test their changes

#### Manual Dependency Passing
- **Rejected:** Too verbose, error-prone
- Every command would need constructor with all deps
- Easy to forget dependencies
- No central configuration

#### Factory Pattern Only
- **Rejected:** Insufficient for complex scenarios
- Still requires manual wiring
- Doesn't solve configuration injection
- More boilerplate than DI

---

## Consequences

### Positive

1. **Better Test Coverage:** Easier to write tests means more tests get written
2. **Cleaner Code:** Commands become thin wrappers, logic moves to services
3. **Flexibility:** Easy to add new providers or swap implementations
4. **Professional Architecture:** Industry-standard pattern, easier for new contributors
5. **Multi-Agent Friendly:** Clear patterns, less confusion

### Negative

1. **Learning Curve:** Developers need to understand DI concepts
2. **Initial Migration Effort:** 8-12 hours to complete migration
3. **Slightly More Complex:** Additional layer of indirection
4. **Dependency Added:** TSyringe adds to bundle size (~10KB)

### Neutral

1. **Pattern Change:** All new code must use DI, old pattern deprecated
2. **Documentation Needed:** Must document how to use container
3. **Code Review:** Need to ensure DI used consistently

---

## Implementation Plan

### Phase 1: Complete Container Setup (2 hours)
- Review and finalize container.ts
- Ensure all providers registered
- Update di-example.ts to show full pattern

### Phase 2: Migrate Commands (6-8 hours)
- Migrate send command (2 hours)
- Migrate read command (1 hour)
- Migrate inbox command (1 hour)
- Migrate config command (2 hours)
- Migrate template command (2 hours)

### Phase 3: Update Tests (2-3 hours)
- Update all tests to use DI for mocking
- Ensure test coverage maintained
- Validate tests still pass

### Phase 4: Documentation (1 hour)
- Update CONTRIBUTING.md with DI pattern
- Document container usage
- Add examples

---

## Usage Example

### Before (Direct Instantiation)

```typescript
// In command file
import { PostalClient } from '../lib/postal-client';
import { loadConfig } from '../lib/config';

async execute(options: SendOptions) {
  const config = loadConfig();
  const client = new PostalClient(config);  // Tight coupling
  const result = await client.sendMessage(options);
  // ...
}
```

### After (Dependency Injection)

```typescript
// In command file
import { container } from '../container';
import { IMailProvider } from '../providers/mail-provider.interface';

async execute(options: SendOptions) {
  const mailProvider = container.resolve<IMailProvider>('mailProvider');
  const result = await mailProvider.sendEmail(options);
  // ...
}
```

### In Tests

```typescript
// Easy mocking
const mockProvider = {
  sendEmail: jest.fn().mockResolvedValue({ id: '123' }),
};
container.register('mailProvider', { useValue: mockProvider });

// Run test
await command.execute(options);

// Assert
expect(mockProvider.sendEmail).toHaveBeenCalled();
```

---

## Alternatives Considered

### Alternative 1: InversifyJS

**Description:** More feature-rich DI container with decorators

**Pros:**
- More powerful than TSyringe
- Excellent TypeScript support
- Decorator-based registration

**Cons:**
- Larger bundle size (~45KB)
- More complex API
- Requires `reflect-metadata` (adds complexity)
- Overkill for CLI tool

**Why rejected:** TSyringe is simpler and sufficient for our needs

### Alternative 2: Custom DI Container

**Description:** Build our own minimal DI container

**Pros:**
- No external dependency
- Exactly what we need, nothing more
- Educational

**Cons:**
- Time investment to build
- Need to maintain
- Likely bugs in initial version
- Reinventing the wheel

**Why rejected:** TSyringe is battle-tested and maintained

### Alternative 3: Defer DI to V2

**Description:** Remove TSyringe, stick with direct instantiation for V1

**Pros:**
- Ship faster (2 hours to rollback)
- Simpler for V1
- Can add later

**Cons:**
- Technical debt grows
- Tests remain hard to write
- Multi-agent development harder
- Will need to migrate later anyway

**Why rejected:** DI foundation is already 60% done, better to complete it now

---

## Related Decisions

- ADR-002: Service Layer Architecture (depends on DI)
- ADR-003: Provider Interface Design (used with DI)

---

## References

- [TSyringe Documentation](https://github.com/microsoft/tsyringe)
- [Dependency Injection Principles](https://martinfowler.com/articles/injection.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- Previous architecture review by Developer 1

---

## Notes

**Migration Status:** 
- ✅ Container implemented
- ✅ Providers registered
- ⚠️ Commands not migrated yet
- ❌ Tests not updated

**Next Steps:**
1. Lead Engineer approves decision
2. Developer 1 assigned migration tasks
3. Code review checklist updated to require DI
4. Documentation updated

**Rollback Plan:**
If migration proves too difficult or time-consuming:
1. Remove TSyringe from dependencies
2. Remove container.ts
3. Document direct instantiation as standard
4. Defer DI to V2.0

---

**Decision made by:** @lead-engineer  
**Last Updated:** 2026-02-18
