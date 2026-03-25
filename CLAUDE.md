# job_hunter

Stack: Unknown

<!-- BRAIN-LEARNED-RULES-START -->
## 🧠 Brain-learned rules
_Auto-updated by Brain Platform on 2026-03-24. Do not edit this section manually._

### ✅ Apply these patterns
- **JavaScript/TypeScript as dominant language** (6 projects)
  → Invest in shared TypeScript tooling (tsconfig base, shared ESLint config, shared auth/error utilities) to reduce duplication
- **Node.js/Express as default backend** (3 projects)
  → Lean into this by establishing a shared Express middleware baseline (auth, error handling, logging) reused across projects

### ❌ Avoid these anti-patterns
- **Critical findings persist for 4–5 review cycles** (5 projects)
  → Treat any finding that survives 2 cycles as a formal tracked ticket with an owner and deadline; block new features in that project until it clears
- **Test suite absent or contains zero assertions** (4 projects)
  → Enforce a minimum assertion count via a lint rule or CI gate; delete test files with zero assertions — they are worse than nothing because they imply coverage
- **Projects without version control** (seen here)
  → Run `git init && git add . && git commit -m 'initial'` immediately; add a pre-flight check script that refuses to run any project without a git repo
- **Authentication present in name only** (3 projects)
  → Apply auth middleware at the router level, not per-route; write an integration test that hits each protected endpoint without credentials and asserts 401
- **Shims, stale routes, and legacy files left in place** (3 projects)
  → Delete deprecated code at the point of replacement, not later; use a dead-code linter (knip, ts-prune) in CI to catch accumulation

<!-- BRAIN-LEARNED-RULES-END -->
