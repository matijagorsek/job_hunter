# job_hunter

Stack: Unknown

<!-- BRAIN-LEARNED-RULES-START -->
## 🧠 Brain-learned rules
_Auto-updated by Brain Platform on 2026-03-30. Do not edit this section manually._

### ✅ Apply these patterns
- **Environment variables for runtime configuration** (5 projects)
  → Standardise with a .env.example committed to every repo; add startup validation that fails fast on missing required vars
- **Environment variables for runtime configuration** (7 projects)
  → Add a startup validation step in every project entrypoint that enumerates required vars, fails fast with a human-readable message, and ships an .env.example documenting each one
- **Projects are monitoring or notification systems** (this project)
  → Extract a shared poller/notifier scaffold with built-in run-metrics logging, structured error handling, and a consistent retry/backoff interface
- **Webhook / event-driven external integration** (this project)
  → Validate webhook signatures server-side on receipt (HMAC-SHA256 or platform equivalent), reject unsigned payloads with 401, and never let the raw body reach business logic untrusted
- **Telegram as primary notification channel** (this project)
  → Centralise Telegram dispatch into a shared wrapper that validates token presence at startup, handles send failures visibly, and enforces chat-ID allowlisting before any message is sent
- **Telegram as primary notification channel** (this project)
  → Extract a shared Telegram notification utility with retry logic, error reporting, and rate-limit awareness to avoid duplicating fragile send-failure-swallowing code across projects.
- **Environment variables for runtime configuration** (4 projects)
  → Add a startup validation step in every project that asserts required env vars are present and well-typed before any server or process starts. Commit a .env.example to every repo.
- **Projects are monitoring or notification systems** (4 projects)
  → Define a shared contract (source → diff → notify) and reuse it; this pattern is frequent enough to warrant a small internal framework rather than bespoke implementations
- **Monitoring and alerting as primary use case** (this project)
  → Extract a shared monitoring harness (run-loop, error reporting, Telegram dispatch, metrics emission) to eliminate the duplicated scaffolding that currently drifts inconsistently across these projects
- **Telegram as primary notification channel** (this project)
  → Centralise bot scaffolding (auth guard, error handler, rate limiter) into a shared library so all three projects inherit fixes instead of each re-implementing the same gaps.
- **Git commits as part of automated data pipeline** (this project)
  → Add a pre-commit validation step that rejects commits exceeding a size threshold or containing sensitive file patterns; log meaningful commit messages programmatically

### ❌ Avoid these anti-patterns
- **No test infrastructure across the majority of projects** (seen here)
  → Add at minimum one happy-path and one failure-path test for every security boundary (auth check, token validation, input sanitisation). A CI gate that runs these tests on every push is the minimum viable safety net.
- **Sensitive endpoints with no authentication** (seen here)
  → Apply an auth middleware by default on every route; opt-out explicitly for genuinely public endpoints; never enforce access control only on the client
- **Errors silently swallowed — failures invisible at runtime** (5 projects)
  → Every catch block must either re-throw, log with stack trace, or emit an alert. Bare catch{} is a bug. Add a process-level uncaughtException / unhandledRejection handler that at minimum logs before exit.
- **Fix branches created but never committed or merged** (seen here)
  → Enforce a branch hygiene rule: any fix branch with dirty files and no new commits within 48h is automatically flagged. Commit partial fixes as WIP commits rather than leaving them unstaged — something is always better than nothing on disk.
- **Security and architectural debt recurring across review cycles** (seen here)
  → Enforce a rule: any finding marked high/critical that is unresolved after two cycles blocks all feature work on that project until closed
- **Persistent dirty working tree — fixes never committed** (seen here)
  → Adopt a rule: no analysis session closes without at least one atomic commit. Use `git stash` as a last resort before any branch switch. A fix that is not committed does not exist.
- **Errors silently swallowed rather than surfaced** (4 projects)
  → Establish an error-handling contract: every caught exception must either be re-thrown, logged with sufficient context to diagnose, or trigger a notification. Silent catch blocks should fail CI review.
- **Critical issues unresolved across multiple review cycles** (seen here)
  → Institute a hard SLA: any critical/high finding unresolved after two cycles triggers a feature freeze on that project. Treat repeat findings as process failures, not just code failures.
- **Fix branches with large dirty working trees never committed** (seen here)
  → Commit work-in-progress with a 'WIP:' prefix at minimum; consider a pre-push hook that warns if a fix branch has been open for more than 48 hours with uncommitted files
- **Zero test infrastructure across the codebase** (seen here)
  → Add at minimum a single test suite with CI enforcement before any security-critical or auth path ships; use Jest/Vitest for JS, pytest for Python, JUnit for Kotlin
- **Critical fixes stall across 5+ review cycles** (seen here)
  → Treat any finding unresolved after 2 cycles as a process failure; block new feature work on critical findings; assign explicit owners and deadlines
- **Dirty working trees block or obscure fixes** (seen here)
  → Commit or stash all changes before beginning a fix; keep fix branches focused on a single concern; never let unrelated dirty files accumulate alongside security changes
- **Missing or bypassed authentication on sensitive endpoints** (seen here)
  → Apply an auth middleware at the router level so every new route is protected by default. Treat unauthenticated access to any mutation endpoint as a critical defect; block deployment until resolved.
- **Same critical issues persist 6–13 cycles without resolution** (seen here)
  → Treat a critical finding that persists beyond 2 cycles as a project blocker. Gate new feature work on closing open criticals; use a JIRA/Linear ticket per finding with an owner and deadline
- **Critical findings persist across 7–13 review cycles without resolution** (seen here)
  → Treat any finding that survives three cycles as a blocker: freeze feature work on that project until it is resolved and verified in the committed tree, not just the working directory
- **Missing or incomplete .gitignore allows generated/sensitive files to be committed** (4 projects)
  → Generate a .gitignore from gitignore.io for each stack at project creation. Audit with `git ls-files --others` regularly. Add output/, cache/, *.core, and .env to every project's ignore list immediately.
- **No .env.example — environment requirements undocumented** (4 projects)
  → Add .env.example listing every required and optional variable with a description and safe placeholder value. Automate a startup check that errors on missing required vars with a clear message referencing .env.example.
- **Credentials committed to git history** (seen here)
  → Immediately rotate all exposed credentials, use git-filter-repo to purge history, add pre-commit hooks (e.g. gitleaks, truffleHog) to prevent future commits, and enforce .env files in .gitignore
- **Unbounded resource accumulation without housekeeping** (3 projects)
  → Add automated housekeeping: a cron to delete core files older than 24h, git gc scheduled weekly, and log rotation. For epg-iptv, add a pre-commit validation hook to prevent committing EPG data files before the fix branch merges.
- **Secrets unguarded or leaked into git history** (seen here)
  → Run `git secrets` or `truffleHog` as a pre-commit hook across all repos immediately. Rotate any credential that may have been exposed. Treat a missing secret as a hard fatal error at startup, never a silent no-op.
- **Duplicate or meaningless commit messages destroy audit trail** (seen here)
  → For automated commits, generate messages that include a timestamp, record count, or content hash. For human commits, enforce a commit-msg hook that rejects generic messages. Consider Conventional Commits.
- **User-controlled input reaches system boundaries unsanitised** (3 projects)
  → Validate and sanitise at every trust boundary: shell arguments must use array exec form (never string interpolation), numeric env vars must be parsed with explicit NaN checks, and all external inputs must be schema-validated before use.
- **Public endpoints and background tasks have no resource limits** (3 projects)
  → Add a browser/worker pool with a fixed concurrency ceiling in ja-dranko. Apply per-IP rate limiting on all unauthenticated endpoints. Size caches to the actual use-case (live streams need no seek buffer).
- **Credentials at risk of leaking into git history** (seen here)
  → Add a pre-commit hook (e.g. gitleaks or detect-secrets) repo-wide; rotate any token that touched a commit; add a .gitignore and .env.example to every project immediately
- **Input accepted and acted on without validation** (3 projects)
  → Validate and sanitise at the boundary before any processing; never pass raw request data to shell commands — use argument arrays, never string interpolation
- **Mutation endpoints exposed without authentication** (3 projects)
  → Apply authentication middleware at the router level as a default-deny; require explicit opt-out for genuinely public routes; never combine unauthenticated access with shell execution
- **Credentials committed or at risk of being committed** (seen here)
  → Add a pre-commit hook (e.g. gitleaks or detect-secrets); ensure .gitignore excludes .env files before first commit; rotate any token whose history is unconfirmed clean
- **Security-sensitive endpoints exposed without authentication** (3 projects)
  → Add an auth middleware as the first layer on every non-public route. For brain-platform specifically, remove --dangerously-skip-permissions and gate all agent-execution endpoints behind verified tokens immediately.
- **Production fixes sitting uncommitted in working tree for multiple cycles** (seen here)
  → Establish a rule: any working-tree fix for a production regression must be committed within 30 minutes of being written, even as a WIP commit. The branch-switch-discards-work pattern in stadialive and job-hunter is a direct consequence of this discipline gap.
- **No .gitignore or .env.example at project inception** (3 projects)
  → Add .gitignore and .env.example as the very first commit in every project; use a shared template across the portfolio
- **Fix branches created but never committed** (3 projects)
  → Treat an uncommitted fix as no fix. Require atomic commits that contain the actual code change; use CI to block merges if a branch is functionally identical to its branch point
- **package.json / lockfile changes left uncommitted** (3 projects)
  → Commit package.json and lockfile atomically with the code change that requires them; add a CI check that fails if the lockfile is out of sync with package.json
- **Credentials and tokens exposed in git history or world-readable files** (seen here)
  → Rotate all exposed credentials immediately. Use `git filter-repo` or BFG to scrub history. Add a pre-commit hook (e.g. detect-secrets or truffleHog) to prevent future commits of secret-shaped strings. Write sensitive files with mode 0o600.
- **Public-facing endpoints and bots have no authentication or rate limiting** (seen here)
  → Every externally reachable endpoint needs identity (who is calling) and a rate limit (how often). For Telegram bots: allowlist chat IDs at the handler entry point. For webhooks: verify HMAC before processing.
- **No startup validation of required environment variables** (3 projects)
  → Write a validateEnv() function called before any other initialisation. For each required var: check presence, parse and validate type, throw a descriptive error on failure. Libraries like envalid or zod make this trivial.
- **Logic duplicated by copy-paste instead of shared module** (3 projects)
  → Extract any logic that appears in more than one file into a named shared module or package. In monorepos, use a packages/shared workspace. The rule: if you copy a block, you owe the codebase a refactor.
- **Branch switches without committing destroy in-progress fix work** (3 projects)
  → Establish a personal rule: `git status` must be clean before any `git checkout` or `git switch`. Use `git stash push -m 'description'` when a context switch is unavoidable. Better: commit a WIP commit and amend it after.
- **package.json / lock file changes left uncommitted** (3 projects)
  → Dependency manifest changes (package.json, package-lock.json, requirements.txt) must be committed atomically with the code change that required them. A package-lock.json divergence is a reproducibility bug.
- **Branch switching without committing discards in-progress work** (seen here)
  → Configure a pre-checkout hook that refuses the switch if the working tree is dirty. Use 'git stash push -m description' as the standard context-switch ritual.
- **No rate limiting or input validation on public endpoints** (seen here)
  → Apply rate limiting at the edge (e.g. express-rate-limit, nginx), require authenticated identity on every state-mutating endpoint, and validate all input schemas at the boundary

<!-- BRAIN-LEARNED-RULES-END -->
