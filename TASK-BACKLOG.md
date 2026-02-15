# MailGoat Task Backlog - Architecture & Features

**Generated:** 2026-02-15  
**Lead Engineer:** @lead-engineer

## Next 30 Tasks (2-4 hours each)

### P0: Architecture (Critical)

1. ✅ Extract EmailService layer
2. ✅ Create IMailProvider interface
3. ✅ Add Winston logging
4. Add Dependency Injection container (tsyringe)
5. Make all file I/O async
6. Add ConfigService with profiles
7. Create CacheManager (in-memory)
8. Add connection pooling to PostalClient
9. Extract ValidationService
10. Add health check endpoint/command

### P1: Features (Important)

11. Implement message search (filter by sender/subject/date)
12. Add message deletion command
13. Implement email threading (reply-to tracking)
14. Add template system for reusable emails
15. Create signature management
16. Add scheduled send (cron integration)
17. Implement webhook receiver for inbox
18. Add alias management (multiple from addresses)
19. Support downloading received attachments
20. Add bulk send command

### P1: Testing (Important)

21. Increase unit test coverage to 80%
22. Add integration tests with mock Postal
23. Create E2E test suite
24. Add performance benchmarks
25. Property-based testing for validators

### P2: Developer Experience (Nice to have)

26. Add TSDoc comments throughout
27. Generate API documentation
28. Create plugin system architecture
29. Add debug mode with verbose logging
30. Create development Docker environment
