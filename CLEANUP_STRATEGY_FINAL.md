# TERRAFUSION CODEBASE CLEANUP - FINAL STRATEGY

## Current Status: 1,109 TypeScript Errors Remaining

### PHASE 1: Critical Template Literal Fixes (PRIORITY 1)

**Target: 80% error reduction**

#### Highest Impact Files:

1. **server/services/gis/agents/ai-insights-agent.ts** (183 errors)
2. **server/services/gis/agents/spatial-query-agent.ts** (183 errors)
3. **server/services/gis/agents/schema-conversion-agent.ts** (107 errors)
4. **server/services/agents/command-structure/architect-prime.ts** (96 errors)
5. **server/services/gis/agent-orchestration-service.ts** (92 errors)
6. **server/services/agent-framework/base-agent.ts** (90 errors)

#### Manual Fix Pattern:

```typescript
// BROKEN:
if (this.options.logOperations) {
  `);
}

// FIXED:
if (this.options.logOperations) {
  console.log(`Operation completed`);
}
```

### PHASE 2: Archive Unused Code (PRIORITY 2)

**Target: Clean workspace**

#### Create Archive Structure:

```
archive/
├── deprecated-components/
├── legacy-services/
├── unused-utilities/
├── old-configurations/
└── reference-code/
```

#### Archival Commands:

```bash
# Identify unused exports
npx ts-unused-exports tsconfig.json

# Find unused dependencies
npx depcheck

# Find unimported files
npx unimported
```

### PHASE 3: Production Validation (PRIORITY 3)

**Target: Deployment ready**

#### Quality Pipeline:

```bash
npm run type-check      # 0 errors
npm run lint:fix        # Auto-fix linting
npm run format          # Prettier formatting
npm run test            # Test suite pass
npm run build:production # Build validation
```

## EXECUTION PLAN

### Day 1-2: Template Literal Crisis

- Fix top 6 files manually (covers ~741 errors)
- Run type-check after each file
- Target: <400 errors remaining

### Day 3: Code Organization

- Archive unused code to /archive folder
- Clean up duplicate implementations
- Remove dead code branches

### Day 4: Quality Assurance

- Run full quality pipeline
- Fix remaining linting issues
- Validate build process

### Day 5: Production Readiness

- Final type-check (0 errors)
- Production build test
- Deploy validation

## SUCCESS METRICS

- ✅ TypeScript compilation: 0 errors
- ✅ ESLint: No errors, warnings acceptable
- ✅ Build process: Successful
- ✅ Test suite: All passing
- ✅ Archive: Unused code organized
- ✅ Documentation: Updated README

## TOOLS & AUTOMATION

### Quality Scripts (package.json):

```json
{
  "scripts": {
    "cleanup": "npm run quality:fix && npm prune && npm audit fix",
    "quality:check": "npm run type-check && npm run lint && npm run format:check",
    "quality:fix": "npm run format && npm run lint:fix",
    "production:check": "npm run quality:check && npm run test && npm run build"
  }
}
```

### Git Integration:

```bash
# Pre-commit hooks
npm run pre-commit

# Branch protection
git checkout -b cleanup/template-literals
git checkout -b cleanup/archive-unused
git checkout -b cleanup/production-ready
```

## POST-CLEANUP MAINTENANCE

### Automated Quality Gates:

- Pre-commit hooks for type checking
- CI/CD pipeline validation
- Regular dependency audits
- Monthly code quality reviews

### Development Standards:

- No unterminated template literals
- Mandatory error handling
- Complete function implementations
- Clean import/export patterns

---

**Next Immediate Action**: Fix template literals in the top 6 files manually to achieve 80% error reduction.
