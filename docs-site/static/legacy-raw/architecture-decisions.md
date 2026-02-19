# Architecture Decisions

## ADR-001: Use Postal as mail server dependency

**Date:** 2026-02-15  
**Status:** Accepted  
**Deciders:** CEO

### Context

MailGoat needs a reliable mail server backend. We could build from scratch, fork an existing solution, or use an existing solution as a dependency.

### Decision

We will use Postal (https://github.com/postalserver/postal) as a dependency, not a fork.

### Rationale

- **Well-maintained:** Active development, strong community
- **MIT licensed:** Compatible with our open-source strategy
- **Proven:** Already solves mail delivery, server management, security, deliverability
- **Complete:** Has client/server libraries we can leverage
- **Focus:** Let us focus on the agent-first CLI experience rather than mail infrastructure

By using Postal as a dependency, we:

1. Reduce scope and risk
2. Delegate infrastructure complexity to a proven solution
3. Focus our engineering effort on agent-specific features (CLI, auth, account provisioning, notifications)
4. Maintain upgrade path as Postal evolves

### Consequences

- We depend on Postal's release cycle and maintenance
- Our architecture must accommodate Postal's API and deployment model
- We build a thin agent-first layer on top of Postal
- Reduces time-to-MVP significantly
