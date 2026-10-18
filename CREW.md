# Automatic factory crew

Enable AUTOMATIC ALLOCATION in the local MANAGE CREW panel or authenticated hosted operator CREW section. The policy persists in SQLite; new installations keep manual mode until enabled. Disable automatic allocation to edit department headcounts manually.

Every 15 seconds while running, NEO compares the saved roster with queued/active production and configured lane limits. Website, QA and publishing each receive up to the number of required lanes (maximum four). Thumbnail demand uses its existing single render lane. Original/core roles remain deployed for research, maintenance and existing services. Flexible manual/scaled roles can move between departments and receive the corresponding capability.

Surplus flexible workers enter reserve after 90 seconds idle. REBALANCE NOW bypasses that cooldown but never interrupts an active task or inspection. Workers retain their IDs, completion history and metrics. Reserve workers reactivate before any new identity would be needed; this allocator never creates workers. Existing jobs and core roles take precedence if the configured maximum is below their combined headcount. New allocations respect global and per-department limits. No changes to inference concurrency, financial budgets, product queues or marketplace permissions are made.

Assignments and new crew docks commit together in SQLite. Docks use the existing modular bay system. With no available bay, a target may remain unfilled. The interface shows actual deployed counts separately from targets. Idle crew return to their home station/dock instead of collecting in the last visited department. START/STOP preserves the policy; paused factories defer redistribution until started.

For the 70-role regression fixture (50 website, 6 research, 6 QA, 2 product, 2 sales, 4 thumbnail), an empty queue leaves 18 original/core roles deployed and 52 saved in reserve. Three queued lanes reactivate two QA roles and one publishing role, including cross-department reassignment. This is demand-based staffing, not 70 simultaneous model requests. An empty product queue or waiting planner still needs new validated briefs before production can use more workers.
