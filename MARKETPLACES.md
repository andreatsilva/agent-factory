# Marketplace wings

Fiverr and Etsy each have a large, persistent expansion wing with a research deck, production deck, bridge, machinery, and 24 navigable stations. The supplied PNG assets and existing core station remain in place. New bays account for the wider footprint. Select either marketplace in the sector navigation to focus it; local room selection opens its workflow. Public room inspection shows aggregate activity and an operator sign-in link.

## Use the workflow

1. Open **MARKETPLACE WINGS** locally, or sign in to the hosted **OPERATOR** page and choose **FIVERR WORKFLOW** or **ETSY WORKFLOW**.
2. Choose **Website kit** or **Thumbnail pack**, then enter the product title, audience and research notes. For thumbnails, supply the headline and brand.
3. Add a comparable source URL, observed EUR price, date and scope/license. Missing or outdated evidence leaves the product at **NEEDS RESEARCH**; expand **UPDATE RESEARCH / RETRY** to supply it.
4. **START FACTORY** processes the saved queues. One lane runs per marketplace, so both sites can produce concurrently. A lane continues to the next queued brief without a browser being open.
5. Open **PREVIEW / DOWNLOAD**, inspect the files, and enter a review note. Approval moves the package to **LISTING READY**. Rejection keeps it out of the ready queue. Submit a new, corrected brief for a rejected product.

Fiverr packages contain a service-listing draft and requirements; Etsy packages contain a digital-download listing draft. Both include the deliverable ZIP and recorded pricing basis. Website kits are editable static starters that require business/contact customization. Thumbnail packs contain two 1280 × 720 text-led PNG compositions and editable companion SVG layouts; they are not AI-generated photographs or identical SVG replicas of the PNGs.

## Current boundaries

- Research analyzes operator-supplied comparable price observations; it does not yet discover products on Fiverr/Etsy or scrape those accounts. The existing live research/product workflow remains separate.
- Pricing uses the existing configured discount (default 10%) and requires evidence no older than 30 days. The form accepts EUR; non-EUR observations submitted directly require currency conversion support before production can proceed.
- Listings are local drafts. No accounts, messages, orders, publication or revenue are fabricated. Marketplace connection and publication remain a later step.
- Queues, briefs, reviews and ZIPs persist in SQLite. Interrupted production requeues its saved brief. STOP cancels both lanes and keeps the work queued for restart.
- Lanes borrow available crew, including reserve agents within the configured cap. Existing busy jobs are protected; identities and home departments remain intact. No additional agents are silently created.
- Authenticated gateway routes expose the workflow and downloads to the operator. Public snapshots contain only per-marketplace counts. Existing password/MFA/session guards apply.

## Validation

118 automated checks passed, including both product types on both marketplaces, real PNG/ZIP output, pricing blocks, concurrent lanes, stop/resume, restart persistence, busy-agent protection, all 24 station routes, expansion geometry, public-field filtering, and authenticated HTTP access. Browser verification covers the local product workflow and the hosted operator form. Test data lives only in isolated `test-output` fixtures, never the production catalog.
