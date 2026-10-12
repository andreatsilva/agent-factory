Continue developing the EXISTING AI Agent Factory project. Do NOT redesign or rebuild the current UI/factory from scratch. Preserve the current visual style, rooms, NEO, agents, animations, console, dashboard and existing architecture wherever possible.

The project has now reached the point where visual work is secondary.

THE NEXT MILESTONE IS TO TURN THE FACTORY INTO A FUNCTIONAL, SELF-OPERATING DIGITAL PRODUCT BUSINESS SYSTEM.

The core loop must become:

RESEARCH → OPPORTUNITY SCORING → PRODUCT DECISION → PRODUCTION → QA → LISTING → SALES MONITORING → LEARNING → SCALE/KILL DECISION

NEO is the autonomous manager coordinating this system.

## 1. MAIN BUSINESS MODEL

The factory should focus primarily on DIGITAL PRODUCTS and DIGITAL SERVICES that have already demonstrated demand.

The Research Lab should NOT spend most of its time inventing completely new products.

Instead it should research publicly available market signals and identify:

- digital products already selling successfully
- popular service categories
- recurring customer problems
- marketplace trends
- high-volume search terms
- successful pricing ranges
- popular deliverable formats
- underserved variants/niches
- services that can be fulfilled primarily by AI/software
- opportunities that require little or no manual intervention

Examples:

- website creation
- landing pages
- CV/resume templates
- social media templates
- business document templates
- spreadsheet templates
- Notion templates
- prompts/workflows
- simple websites
- icon packs
- printable products
- digital planners
- presentation templates
- data cleanup services
- formatting services
- research services
- thumbnail design
- basic graphic design
- copywriting
- product descriptions
- SEO content
- simple automation setups

The system should study successful products and reproduce MARKET-PROVEN CONCEPTS, not copy copyrighted files, proprietary assets, seller identities, branding or text.

Think:

"this type of product sells"

rather than:

"copy this exact seller's product."

## 2. RESEARCH LAB — MAKE THIS REAL FIRST

The Research Lab becomes one of the most important parts of the factory.

Create a proper Opportunity object/schema.

Each opportunity should contain fields such as:

id
title
category
marketplace
source
sourceUrl
observedDemand
competition
estimatedPrice
estimatedProductionCost
estimatedTokenCost
estimatedProductionTime
estimatedProfit
automationDifficulty
qualityRisk
legalRisk
platformRisk
confidence
trendScore
repeatability
scalability
requiredCapabilities
reasoning
status

Possible status values:

DISCOVERED
ANALYZING
APPROVED
REJECTED
PRODUCING
READY
LISTED
SELLING
PAUSED
KILLED

The Research Lab should continuously populate an Opportunity Queue.

Do not just generate random fake opportunities.

Build the architecture so research providers can be connected to real external sources later.

For now support:

- live provider adapters where already possible
- mock/demo providers as fallback
- manual opportunity injection
- imported JSON research
- web research adapter interface

Clearly label simulated data vs live data.

## 3. NEO OPPORTUNITY SCORING

NEO should rank every opportunity.

Create an Opportunity Score from 0-100.

Example weighted criteria:

Demand: 25%
Competition opportunity: 15%
Profit margin: 15%
Ease of production: 10%
Automation potential: 15%
Repeatability: 10%
Scalability: 10%

Apply penalties for:

- high legal/IP risk
- high marketplace-policy risk
- excessive generation cost
- excessive manual work
- poor demand evidence
- saturated markets

NEO should explain WHY an opportunity was selected.

Example:

NEO APPROVED:
"Editable restaurant menu template"

Demand: 84
Competition opportunity: 67
Automation: 91
Margin: 94
Risk: 8

FINAL SCORE: 82

Do not use random scores. Scores should be deterministically calculated from available data.

## 4. PRODUCT FACTORY

Once NEO approves an opportunity, create a Product Job.

Each Product Job should contain:

productId
opportunityId
productType
workerAgent
creationStrategy
requiredTools
estimatedCost
actualCost
status
files
qualityScore
iterations
listingStatus

The Product Factory should select the cheapest capable creation method.

IMPORTANT:

Do not automatically use expensive LLM/image generation for everything.

Prefer:

1. deterministic templates/scripts
2. reusable templates
3. existing internal assets/components
4. local models
5. inexpensive AI calls
6. premium AI generation only when required

Examples:

CSV/template generation → code

Simple website → reusable site generator/templates

Document templates → programmatic templates

Basic graphics → template/composition system

Complex thumbnails/graphics → external ChatGPT/image generation provider

Complex copy → external LLM provider

Build provider interfaces so premium AI services can later be plugged in.

## 5. PRODUCT REUSE

This is important for profitability.

The factory should maintain an internal:

PRODUCT LIBRARY

COMPONENT LIBRARY

TEMPLATE LIBRARY

ASSET LIBRARY

If NEO discovers another opportunity similar to something already created, reuse the existing product components instead of rebuilding everything.

Example:

Existing:
"Restaurant landing page"

New opportunity:
"Dentist landing page"

The factory should reuse:

- layout
- navigation
- responsive components
- contact system
- deployment pipeline

and change only niche-specific content/design.

Track:

reusePercentage
creationCostSaved
timeSaved

## 6. QUALITY CONTROL

No product should reach marketplace automation without passing Quality Control.

Create automated QA checks depending on product type.

Examples:

Website:
- HTML validity
- broken links
- responsive layout
- missing assets
- console errors
- Lighthouse-style metrics where possible

Documents:
- missing fields
- formatting errors
- broken exports
- placeholder text

Images:
- required dimensions
- file size
- obvious generation failures
- text overflow

General:
- product matches listing description
- no copyrighted/trademarked material copied
- files open correctly
- deliverables exist
- naming is correct

Generate a Quality Score 0-100.

Require configurable minimum score, initially:

80/100

Failed products return to Product Factory automatically.

Limit automatic revision loops to prevent infinite token spending.

## 7. MARKETPLACE / SALES CHANNEL ARCHITECTURE

Create a Marketplace Adapter interface.

Potential adapters:

Fiverr
Upwork
Facebook Marketplace where applicable
Etsy
Gumroad
Ko-fi
other digital product platforms

IMPORTANT:

Do not implement account creation through botting, CAPTCHA bypassing, identity impersonation or platform-rule circumvention.

Marketplace accounts should be USER-AUTHORIZED accounts.

Where official APIs or permitted automation exist, adapters may automate supported actions.

Where automation is not permitted, create an ACTION REQUIRED state and prepare everything for the user.

Example:

NEO:
"Fiverr listing prepared. Manual approval/login required."

The system should be designed so listings can eventually:

- generate title
- generate description
- generate tags
- choose price
- choose category
- create thumbnails
- prepare product files
- publish through supported integration
- monitor views
- monitor clicks
- monitor orders
- monitor conversions
- monitor revenue

Create a unified Listing object independent of marketplace.

## 8. SALES FEEDBACK LOOP

This is critical.

Research should NOT be isolated from sales.

Every listing/product should track:

views
clicks
messages
orders
conversionRate
revenue
refunds
productionCost
AI/API cost
marketplaceFees
netProfit

NEO should learn from this data.

Examples:

High views + no sales:
→ improve listing/price/product presentation.

Low views:
→ poor market demand/search visibility.

High sales:
→ scale.

High support burden:
→ lower scalability score.

Negative profit:
→ pause.

## 9. NEO SCALE / KILL SYSTEM

Implement automatic business decisions.

Example configuration:

After sufficient data:

IF conversion is strong AND profit positive:
SCALE

IF views high but conversion weak:
OPTIMIZE LISTING

IF no meaningful traction after configurable threshold:
PAUSE

IF consistently unprofitable:
KILL PRODUCT

If a product performs very well:

NEO may create:

- variants
- bundles
- related products
- niche versions
- additional listings
- additional worker capacity

Example:

"Real estate social media template" sells well.

NEO creates:

Real Estate Instagram Pack
Real Estate Facebook Pack
Luxury Realtor Pack
Property Listing Bundle

without rebuilding everything from zero.

## 10. AUTONOMOUS AGENT SCALING

NEO should manage agents dynamically.

Agents should NOT just be decorative sprites.

Each Agent must have:

agentId
name
role
capabilities
status
currentTask
queue
jobsCompleted
failures
averageCost
averageCompletionTime
qualityAverage

Possible states:

IDLE
MOVING
WORKING
WAITING
ERROR
OFFLINE

NEO evaluates worker load.

Example:

Research queue > capacity for sustained period
→ create additional Research Agent.

Product jobs piling up
→ create another Production Agent.

Agents idle for long periods
→ deactivate surplus agent.

DO NOT allow uncontrolled agent spawning.

Create configurable constraints:

maxAgents
maxAgentsPerDepartment
dailyBudget
hourlyAIBudget
maxConcurrentJobs
minimumQueueBeforeScaling
scaleCooldown

NEO should justify scaling.

Example log:

NEO // CAPACITY DECISION

Product Factory queue: 14
Active workers: 2
Average completion: 18m
Estimated backlog: 126m

ACTION:
Deploy Product Agent #03

Estimated cost increase: €0.42/day
Expected throughput increase: +43%

## 11. AGENT MOVEMENT MUST REPRESENT REAL WORK

The visual factory should reflect backend state.

When an agent receives a Product Factory task:

agent physically moves toward Product Factory.

When researching:

move to Research Lab.

When performing QA:

move to Quality Control.

When idle:

return to appropriate workstation / idle location.

Do not create random movement disconnected from the task system.

Agent animation must be driven by actual agent/task state.

## 12. COST CONTROL

Every meaningful action must eventually have a measurable cost.

Implement a central Cost Ledger.

Track:

LLM calls
tokens
image generations
API calls
hosting
marketplace fees
advertising
other operating costs

Display:

TODAY COST
TODAY REVENUE
TODAY PROFIT
MONTH COST
MONTH REVENUE
MONTH PROFIT

NEO should optimize for:

NET PROFIT

not number of products.

A factory generating 100 products and €0 is failing.

A factory generating 5 products and €200 profit is succeeding.

## 13. BUDGET GOVERNOR

Create a Budget Governor.

Default development/test configuration:

dailyBudget
maxCostPerProduct
maxResearchSpendPerOpportunity
maxAutomaticRevisionCost
minimumExpectedMargin

When budget is reached:

NEO stops optional AI operations.

Critical operations may continue only if configured.

NEO should log:

BUDGET LIMIT REACHED
NONESSENTIAL PRODUCTION PAUSED

## 14. SELF-SUFFICIENCY

The long-term objective is:

NEO receives business performance data and determines what the factory should do next.

Example:

Research Lab discovers 100 products.

NEO approves 4.

Factory produces 4.

QA approves 3.

3 listings launch.

After data is collected:

Product A:
€0 revenue → pause.

Product B:
€18 revenue / €1.40 cost → continue.

Product C:
€92 revenue / €5 cost → SCALE.

NEO then allocates additional production/research resources around Product C's niche.

That is the autonomous growth loop we want.

## 15. PERSISTENCE

All important information must survive refresh/restart.

Persist:

agents
products
opportunities
jobs
listings
sales
costs
NEO decisions
NEO chat/history
factory configuration
budgets
performance metrics

Use the project's existing persistence system if one exists.

Do not introduce unnecessary infrastructure yet.

## 16. DEVELOPMENT MODE VS LIVE MODE

Add an explicit mode:

DEMO
LIVE

DEMO:
simulated research
simulated orders
simulated sales
no marketplace writes
safe development

LIVE:
real providers
real API costs
real marketplace integrations
real sales metrics

The UI must clearly show which mode is active.

Never silently substitute simulated sales for real sales.

## 17. DASHBOARD CHANGES

Keep the existing pixel-art factory UI.

Do not redesign it.

Make the existing dashboard actually show useful business information.

Priority metrics:

NET PROFIT
REVENUE
COST
ACTIVE PRODUCTS
LIVE LISTINGS
ORDERS
CONVERSION
OPPORTUNITIES
ACTIVE AGENTS
CURRENT FACTORY LOAD

Clicking a department should expose its current queue and workers.

NEO CENTRAL LOG should show important autonomous decisions.

Avoid flooding the log with meaningless messages.

## 18. BUILD THIS AS AN MVP, NOT A HUGE REWRITE

Before making changes:

1. Inspect the complete existing codebase.
2. Understand the current agent/task architecture.
3. Reuse existing systems.
4. Do not delete functioning features.
5. Do not replace the existing factory UI.
6. Make incremental changes.
7. Keep existing tests passing.
8. Add tests for new business logic.

DO NOT attempt every marketplace integration immediately.

We first need the internal economic engine to work correctly.

## CURRENT IMPLEMENTATION PRIORITY

Implement this order:

PHASE A — BUSINESS ENGINE

1. Opportunity schema
2. Research queue
3. deterministic Opportunity Score
4. NEO approve/reject decision
5. Product Job lifecycle
6. Agent capability/task assignment
7. real state-driven agent movement
8. Quality Control lifecycle
9. Cost Ledger
10. Product/Listing/Sales metrics
11. Scale/Optimize/Pause/Kill logic
12. automatic agent capacity scaling
13. persistence

PHASE B — FIRST COMPLETE VERTICAL SLICE

Create ONE fully functioning business flow.

Start with something simple and highly automatable such as:

WEBSITE CREATION SERVICE

Flow:

Research opportunity
→ NEO approval
→ website job
→ Website Creator Agent
→ template/component reuse
→ site generation
→ automated QA
→ create listing package
→ marketplace adapter
→ demo sale/order
→ revenue/cost recorded
→ NEO analyzes performance
→ scale/optimize/pause decision

Once this works end-to-end, the architecture can support other product types.

Do NOT implement ten half-working production lines.

Make ONE line work completely.

## FIRST MARKETPLACE IMPLEMENTATION

Create a generic marketplace adapter first.

Then prepare the architecture for Fiverr/Upwork/etc.

Use:

MarketplaceAdapter
prepareListing()
validateListing()
publishListing()
updateListing()
fetchMetrics()
fetchOrders()
pauseListing()

For unsupported actions, return:

MANUAL_ACTION_REQUIRED

and show this clearly in the UI.

Never fake success.

## IMPORTANT DESIGN PRINCIPLE

The factory should behave like a company.

RESEARCH finds demand.

NEO decides where capital/resources go.

PRODUCTION creates the deliverable.

QA protects quality.

MARKETPLACE sells it.

SALES DATA tells NEO whether the decision was correct.

NEO reallocates resources.

Agents are workers.

Departments are queues/workstations.

Money and capacity are scarce resources.

Do not make autonomy mean "random agents constantly generating things."

Autonomy means:

MEASURE → DECIDE → EXECUTE → MEASURE AGAIN.

## TESTING

Add tests for at least:

- opportunity scoring
- approval/rejection
- cost limits
- product lifecycle
- QA rejection/revision
- agent assignment
- maximum agent count
- automatic scale-up
- automatic scale-down
- product pause
- product kill
- profitable product scaling
- persistence
- duplicate opportunity prevention

The same product/opportunity should not continuously be rediscovered and recreated.

Implement fingerprinting/deduplication.

## FINAL RESULT FOR THIS ITERATION

At the end of this Codex run I want to be able to open the factory and press:

RUN NEO CYCLE

and visibly observe:

Research Lab finds opportunities
→ NEO evaluates them
→ one gets approved
→ a real Agent receives the job
→ the Agent physically travels to the relevant department
→ Product Factory produces the job
→ QA evaluates it
→ listing package is prepared
→ a simulated marketplace listing/order can run in DEMO mode
→ revenue/cost/profit updates
→ NEO analyzes the result
→ NEO decides whether to continue, optimize, scale or kill it.

This complete loop is more important than adding more graphics, departments or decorative functionality.

After implementing it:

- run the complete test suite
- fix regressions
- run at least 3 full NEO cycles
- confirm persistence after reload
- report which pieces are REAL, SIMULATED or PLACEHOLDER
- report which external APIs/accounts are required for the next LIVE milestone
- update the existing project documentation with the new architecture

Do not stop after planning. Inspect the codebase and implement the milestone.