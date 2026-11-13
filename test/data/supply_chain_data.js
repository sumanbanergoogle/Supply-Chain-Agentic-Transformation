/* ============================================================================
 * Supply Chain Agentic Transformation — Master Data Corpus
 * Source: Supply Chain Process - Consolidated (6 Pillars, 20 Sub-processes,
 *         60 Personas, 60 Gemini Enterprise Agents)
 * ============================================================================ */

window.SUPPLY_CHAIN_DATA = {
  pillars: [
    {
      id: "planning",
      num: "01",
      title: "Planning & Strategy",
      subtitle: "Supply Chain Planning & Strategy",
      lifecycle: "Core Planning Lifecycle",
      tagline: "Demand signals and strategic S&OP alignment.",
      color: "var(--g-blue)",
      ink: "var(--blue-ink)",
      cssClass: "p-blue",
      page: "pillars/01_planning.html",
      demoTitle: "S&OP Digital War-Room",
      demoDesc: "Live demand-supply reconciliation & OTIF scenario simulation",
      kpis: [
        { val: "7–14d", lbl: "Earlier demand shift detection" },
        { val: "90-day", lbl: "NPI launch forecast error cut" },
        { val: "Days → Hrs", lbl: "IBP pre-read & claim cycle" }
      ],
      subprocesses: [
        {
          name: "Demand Forecasting",
          items: [
            {
              id: "SC-01",
              persona: "Demand Planner / Forecaster",
              mandate: "Synthesizes POS velocity, weather anomalies, and macro trends.",
              impact: "Detects demand shifts 7–14 days earlier",
              agent: "Demand Sensing Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["BigQuery POS", "Weather API", "SAP IBP"],
              promptHint: "Correlate regional POS velocity with 14-day weather & promo calendars to flag SKU-level demand inflections."
            },
            {
              id: "SC-02",
              persona: "Commercial Planning Lead",
              mandate: "Identifies unmodeled drivers across eCommerce and retail channels.",
              impact: "Replaces black-box variance models",
              agent: "Forecast Reconciliation",
              buildMode: "No-Code Gemini Gem",
              sources: ["Channel BI", "Google Sheets", "E-Comm Feeds"],
              promptHint: "Explain forecast-vs-actual variance by decomposing price, distribution, and digital promo drivers."
            },
            {
              id: "SC-03",
              persona: "Brand & Innovation Manager",
              mandate: "Matches launch packaging and attributes to historical lookalikes.",
              impact: "Cuts 90-day launch forecast errors",
              agent: "NPI Demand Profiler",
              buildMode: "No-Code Gemini Gem",
              sources: ["PLM Specs", "Historical NPI DB", "Drive Decks"],
              promptHint: "Match new SKU attributes (pack size, flavor, price tier) to top 5 historical launches to generate Day 1–90 curve."
            }
          ]
        },
        {
          name: "Trade Promotion",
          items: [
            {
              id: "SC-04",
              persona: "Trade Marketing Manager",
              mandate: "Simulates price elasticity, shelf lift, and incremental spend return.",
              impact: "Prevents break-even trade leakage",
              agent: "Promo ROI Simulator",
              buildMode: "Low-Code Agent Studio",
              sources: ["TPM System", "BigQuery POS", "Margin Tables"],
              promptHint: "Simulate net incremental margin and cannibalization for proposed trade scheme slabs before circular approval."
            },
            {
              id: "SC-05",
              persona: "Key Account Manager (KAM)",
              mandate: "Creates customized sell-in story decks and joint promotional calendars.",
              impact: "Aligns buyer margins and volume goals",
              agent: "JBP Negotiation Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["Account P&L", "Drive Templates", "Category Trends"],
              promptHint: "Draft a Joint Business Plan narrative showing retailer gross margin uplift and category growth share."
            },
            {
              id: "SC-06",
              persona: "Revenue / Trade Finance Lead",
              mandate: "Audits scanned proof-of-performance circulars and invoices via OCR.",
              impact: "Resolves claim disputes in hours",
              agent: "Deduction Audit Agent",
              buildMode: "Multimodal + Agent Studio",
              sources: ["Scanned Invoices", "SAP Claims", "Scheme PDFs"],
              promptHint: "Extract claim line items from scanned distributor receipts and cross-verify against approved scheme dates."
            }
          ]
        },
        {
          name: "S&OP / IBP",
          items: [
            {
              id: "SC-07",
              persona: "S&OP / Supply Planning Dir.",
              mandate: "Reconciles unconstrained demand with factory plant bottleneck limits.",
              impact: "Highlights margin-dilutive imbalances",
              agent: "Consensus & Gap Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["SAP APO/IBP", "Plant Capacity", "Demand Plan"],
              promptHint: "Identify plant line overloads in the 12-week horizon and rank rebalancing options by contribution margin."
            },
            {
              id: "SC-08",
              persona: "Supply Chain VP / COO",
              mandate: "Evaluates co-packer shifts and allocation trade-offs during supply outages.",
              impact: "Rapid OTIF impact scenario brief",
              agent: "Digital War-Room Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["Control Tower", "Co-Packer Contracts", "Customer SLAs"],
              promptHint: "Model 3 allocation scenarios during a Tier-1 plant outage, quantifying OTIF % and margin impact per customer tier."
            },
            {
              id: "SC-09",
              persona: "IBP Lead / Chief Planning Off.",
              mandate: "Generates pre-read decks and tracks sign-offs across cross-functional leads.",
              impact: "Reduces deck preparation by days",
              agent: "Executive Copilot",
              buildMode: "No-Code Gemini Gem",
              sources: ["Google Workspace", "S&OP Scorecards", "Action Logs"],
              promptHint: "Synthesize Finance, Sales, and Ops inputs into an executive S&OP pre-read highlighting unresolved risks."
            }
          ]
        },
        {
          name: "Portfolio & SKU",
          items: [
            {
              id: "SC-10",
              persona: "Category Manager",
              mandate: "Scores velocity, plant changeover cost, and shelf revenue yield.",
              impact: "Unlocks tail working capital",
              agent: "SKU Pruning Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["SKU P&L", "Changeover Matrix", "POS Velocity"],
              promptHint: "Flag bottom-decile SKUs where changeover downtime and working capital exceed net contribution margin."
            },
            {
              id: "SC-11",
              persona: "Lifecycle / Materials Mgr",
              mandate: "Orchestrates transition buffers to sync packaging and formulation cuts.",
              impact: "Eliminates stranded write-offs",
              agent: "PIPO Run-Out Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["BOM Master", "Packing Inventory", "Open POs"],
              promptHint: "Synchronize Phase-In/Phase-Out cutover dates so old packaging film depletes to zero before new artwork launch."
            },
            {
              id: "SC-12",
              persona: "Commercial Finance Director",
              mandate: "Calculates net-net margin across Club, Grocery, and eCommerce packs.",
              impact: "Re-engineers MOQ and pack rules",
              agent: "Cost-to-Serve Diagnostic",
              buildMode: "No-Code Gemini Gem",
              sources: ["ERP Freight", "Channel Rebates", "Pack Specs"],
              promptHint: "Compare true cost-to-serve per case across Club, GT, and eCommerce channels and recommend minimum order rules."
            }
          ]
        }
      ]
    },
    {
      id: "procurement",
      num: "02",
      title: "Sourcing & Procurement",
      subtitle: "Strategic Procurement",
      lifecycle: "Procurement Lifecycle Spine",
      tagline: "Tier vendor networks and EDI order routing.",
      color: "var(--g-purple)",
      ink: "var(--purple-ink)",
      cssClass: "p-purple",
      page: "pillars/02_procurement.html",
      demoTitle: "Disruption Sensing & Expediting",
      demoDesc: "Multi-tier risk radar & autonomous PO split-shipment",
      kpis: [
        { val: "2–3 wks", lbl: "Advance disruption warning" },
        { val: "<48 hrs", lbl: "Supplier onboarding cycle" },
        { val: "~70%", lbl: "Standard PO delays resolved" }
      ],
      subprocesses: [
        {
          name: "Supplier Network",
          items: [
            {
              id: "SC-13",
              persona: "Procurement Dir. / Risk Mgr",
              mandate: "Monitors multi-tier supply feeds, port delays, and vendor financials.",
              impact: "2–3 week advance disruption warning",
              agent: "Disruption Sensing Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["Port/AIS Feeds", "Supplier News", "SAP Ariba"],
              promptHint: "Scan global port congestion, weather alerts, and Tier-2 vendor filings to flag at-risk raw material shipments."
            },
            {
              id: "SC-14",
              persona: "Procurement Operations Lead",
              mandate: "Parses BRC/ISO audits, food-safety filings, and tax registrations.",
              impact: "Cuts onboarding from weeks to <48h",
              agent: "Onboarding & Qual. Agent",
              buildMode: "Multimodal + Gem",
              sources: ["Audit PDFs", "ISO Certs", "Vendor Portal"],
              promptHint: "Verify completeness and expiry of BRC, FSSAI/FDA, and GST/tax filings from uploaded supplier onboarding packets."
            },
            {
              id: "SC-15",
              persona: "Chief Sustainability Officer",
              mandate: "Standardizes chain-of-custody certificates (RSPO/FSC) and packaging LCAs.",
              impact: "Automates Scope 3 disclosure audits",
              agent: "ESG & Scope 3 Auditor",
              buildMode: "No-Code Gemini Gem",
              sources: ["RSPO/FSC Certs", "LCA Databases", "Spend Ledger"],
              promptHint: "Audit supplier sustainability certificates and compute Scope 3 emissions factors across direct material categories."
            }
          ]
        },
        {
          name: "Material & Packaging",
          items: [
            {
              id: "SC-16",
              persona: "Category Sourcing Mgr (Direct)",
              mandate: "Correlates CBOT/Platts feedstocks with depletion to advise hedging.",
              impact: "Optimizes forward-contract windows",
              agent: "Commodity Index Advisor",
              buildMode: "Low-Code Agent Studio",
              sources: ["CBOT/Platts Feeds", "ERP Depletion", "Contract Book"],
              promptHint: "Compare spot feedstock indices against 6-month coverage requirements to recommend forward-buy tranches."
            },
            {
              id: "SC-17",
              persona: "Strategic Sourcing Lead",
              mandate: "Deconstructs packaging specs (resin weight, corrugate, conversion energy).",
              impact: "Fact-based margin leverage in RFPs",
              agent: "Dynamic Should-Cost Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["CAD/Spec Sheets", "Resin Indices", "RFP Quotes"],
              promptHint: "Build a bottom-up should-cost model from resin weight, corrugate flute grade, and regional conversion rates."
            },
            {
              id: "SC-18",
              persona: "Packaging R&D Engineer",
              mandate: "Evaluates PCR resins and barrier materials against line runnability & taxes.",
              impact: "Mitigates EPR and landfill taxation",
              agent: "Sustainable Packaging Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["EPR Regulations", "Material Trials", "Line Speed Logs"],
              promptHint: "Evaluate PCR resin alternatives against moisture barrier thresholds and state-level EPR plastic tax liabilities."
            }
          ]
        },
        {
          name: "Contract & PO Mgmt",
          items: [
            {
              id: "SC-19",
              persona: "Commercial Sourcing / Legal",
              mandate: "Reconciles live spend against negotiated rebate tiers and volume discount scales.",
              impact: "Recovers missed rebates & surcharges",
              agent: "Contract Leakage Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["Contract PDFs", "SAP Spend", "Credit Notes"],
              promptHint: "Compare YTD cumulative PO volume against supplier contract rebate tiers and draft recovery claims."
            },
            {
              id: "SC-20",
              persona: "Buyer / Procurement Coord.",
              mandate: "Monitors EDI 855/856 delay feeds and orchestrates supplier split-shipments.",
              impact: "Resolves ~70% of standard PO delays",
              agent: "PO Expediting Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["EDI 855/856", "Plant Run Schedule", "Vendor Email"],
              promptHint: "Detect unacknowledged or delayed ASNs impacting next week's production run and draft split-shipment requests."
            },
            {
              id: "SC-21",
              persona: "Accounts Payable Lead",
              mandate: "Diagnoses price/quantity discrepancies across POs, GRNs, and carrier invoices.",
              impact: "Prevents vendor holds & saves discounts",
              agent: "Three-Way Match Dispute",
              buildMode: "Multimodal + Agent Studio",
              sources: ["SAP PO/GRN", "Invoice PDFs", "Rate Cards"],
              promptHint: "Pinpoint the exact root cause of 3-way match blocks (price variance vs short GRN) and route for rapid clearance."
            }
          ]
        }
      ]
    },
    {
      id: "manufacturing",
      num: "03",
      title: "Manufacturing & Production",
      subtitle: "Intelligent Shop Floor",
      lifecycle: "Manufacturing Operations Lifecycle",
      tagline: "Optimized runs and zero-defect QA protocols.",
      color: "var(--g-green)",
      ink: "var(--green-ink)",
      cssClass: "p-green",
      page: "pillars/03_manufacturing.html",
      demoTitle: "Changeover & Defect Triager",
      demoDesc: "Allergen run sequencing & high-speed visual QA inspection",
      kpis: [
        { val: "15–25%", lbl: "Sanitation downtime cut" },
        { val: "<3 min", lbl: "WIP line reallocation" },
        { val: "60–80%", lbl: "Faster batch release review" }
      ],
      subprocesses: [
        {
          name: "Production Scheduling",
          items: [
            {
              id: "SC-22",
              persona: "Master Production Scheduler",
              mandate: "Sequences allergen, kosher, and packaging runs to minimize washdowns.",
              impact: "Cuts sanitation downtime by 15–25%",
              agent: "Changeover Optimizer",
              buildMode: "Low-Code Agent Studio",
              sources: ["MES Schedule", "Allergen Matrix", "Open Orders"],
              promptHint: "Sequence weekly SKU runs from allergen-free to allergen-containing to minimize full CIP washdown cycles."
            },
            {
              id: "SC-23",
              persona: "Shop Floor / Shift Lead",
              mandate: "Detects machine halts and re-routes perishable WIP to alternate lines.",
              impact: "Line reallocation in <3 minutes",
              agent: "Disruption Re-sequencer",
              buildMode: "Low-Code Agent Studio",
              sources: ["SCADA/PLC Alerts", "Line Specs", "WIP Buffers"],
              promptHint: "On Line-2 filler halt, identify compatible lines with idle capacity to absorb perishable WIP within 15 minutes."
            },
            {
              id: "SC-24",
              persona: "Plant Operations Manager",
              mandate: "Maps shift skill certifications and fatigue constraints to line speeds.",
              impact: "Prevents certified skill bottlenecks",
              agent: "Labor & Line Balancing",
              buildMode: "No-Code Gemini Gem",
              sources: ["HRMS Rosters", "Skill Matrix", "Shift Plan"],
              promptHint: "Verify every scheduled high-speed packaging shift has certified operators and flag overtime fatigue risks."
            }
          ]
        },
        {
          name: "Capacity Planning",
          items: [
            {
              id: "SC-25",
              persona: "Supply Chain Ops Director",
              mandate: "Assesses CIP utilities, boiler loads, and cold storage holding limits.",
              impact: "Flags facility constraints 3–6 mos out",
              agent: "Bottleneck Diagnostic",
              buildMode: "No-Code Gemini Gem",
              sources: ["Utility Telemetry", "Cold Storage Cap", "IBP Volume"],
              promptHint: "Overlay 6-month peak seasonal production against plant boiler, water CIP, and blast-chiller limits."
            },
            {
              id: "SC-26",
              persona: "External Sourcing / CMO Lead",
              mandate: "Models internal conversion costs against co-packer tolling agreements.",
              impact: "Optimizes net gross margin per case",
              agent: "Co-Packer Allocation",
              buildMode: "Low-Code Agent Studio",
              sources: ["CMO Rate Cards", "Plant Conversion", "Freight Matrix"],
              promptHint: "Compare delivered cost per case (conversion + inbound + outbound freight) between internal plants and CMOs."
            },
            {
              id: "SC-27",
              persona: "VP Manufacturing Engineering",
              mandate: "Simulates multi-year volume trends to test high-speed line expansions.",
              impact: "Delivers defensible board CapEx ROI",
              agent: "CapEx Simulator",
              buildMode: "No-Code Gemini Gem",
              sources: ["5-Yr Demand Plan", "OEM Quotes", "OEE Benchmarks"],
              promptHint: "Stress-test payback period and IRR of a new high-speed line under conservative and upside volume scenarios."
            }
          ]
        },
        {
          name: "Quality & Compliance",
          items: [
            {
              id: "SC-28",
              persona: "QA Manager / Line Inspector",
              mandate: "Inspects high-speed video frames for crimped seals, lot codes, and labels.",
              impact: "Prevents full pallet scrap & holds",
              agent: "Visual Defect Triager",
              buildMode: "Multimodal Vision",
              sources: ["Line Camera Frames", "QA Spec Book", "MES Hold Log"],
              promptHint: "Inspect captured package images for seal crimping defects, smeared date codes, or skewed labels."
            },
            {
              id: "SC-29",
              persona: "Regulatory Compliance Lead",
              mandate: "Parses BPR and COA documents to flag pasteurization & CCP deviations.",
              impact: "60–80% faster batch release review",
              agent: "Batch Record Auditor",
              buildMode: "Multimodal + Agent Studio",
              sources: ["Batch Prod Records", "Vendor COAs", "HACCP Limits"],
              promptHint: "Audit scanned Batch Production Records against CCP temperature and hold-time limits prior to QA sign-off."
            },
            {
              id: "SC-30",
              persona: "Continuous Improvement Lead",
              mandate: "Correlates consumer complaints with ingredient lots and machine telemetry.",
              impact: "Speeds 5-Why investigation closures",
              agent: "RCA & CAPA Copilot",
              buildMode: "No-Code Gemini Gem",
              sources: ["Complaint Logs", "Lot Genealogy", "CAPA Archive"],
              promptHint: "Trace a cluster of consumer quality complaints back to common raw material lots, shifts, and line parameters."
            }
          ]
        }
      ]
    },
    {
      id: "warehousing",
      num: "04",
      title: "Inventory & Warehousing",
      subtitle: "Dynamic Fulfillment",
      lifecycle: "Inventory & DC Lifecycle Spine",
      tagline: "Multi-node staging and enterprise visibility.",
      color: "var(--g-teal, #0097A7)",
      ink: "#00796B",
      cssClass: "p-teal",
      page: "pillars/04_warehousing.html",
      demoTitle: "Multi-Echelon Rebalancer",
      demoDesc: "Dynamic safety stock, SLOB disposition & DC slotting",
      kpis: [
        { val: "10–18%", lbl: "Working capital reduction" },
        { val: "15–30%", lbl: "Picker transit time saved" },
        { val: "<24 hrs", lbl: "Sellable return restocking" }
      ],
      subprocesses: [
        {
          name: "Positioning & Optimization",
          items: [
            {
              id: "SC-31",
              persona: "Inventory Optimization Lead",
              mandate: "Recalibrates multi-echelon buffers using live lead-time and demand variance.",
              impact: "Cuts working capital by 10–18%",
              agent: "Safety Stock Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["MEIO Tables", "Supplier Lead Times", "Service SLAs"],
              promptHint: "Recompute dynamic safety stock targets per DC node based on trailing 30-day lead-time volatility."
            },
            {
              id: "SC-32",
              persona: "Inventory Controller / Buyer",
              mandate: "Analyzes shelf-life risk and triggers promotional bundles or liquidations.",
              impact: "Prevents expired stock write-offs",
              agent: "SLOB Disposition Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["WMS Batch Expiry", "Run-Rate", "Promo Playbook"],
              promptHint: "Flag inventory batches approaching 60% shelf-life threshold and recommend targeted wholesale bundle clearances."
            },
            {
              id: "SC-33",
              persona: "Replenishment Planner",
              mandate: "Generates automated inter-DC and store transfers to balance localized gluts.",
              impact: "Eliminates regional out-of-stocks",
              agent: "Inter-Facility Rebalancer",
              buildMode: "Low-Code Agent Studio",
              sources: ["Network On-Hand", "Transfer Rates", "Regional POS"],
              promptHint: "Match surplus inventory in Neighboring DCs against projected stock-outs and draft net-positive STOs."
            }
          ]
        },
        {
          name: "Warehouse Operations",
          items: [
            {
              id: "SC-34",
              persona: "DC Operations Mgr / IE Lead",
              mandate: "Evaluates co-pick affinity matrices to recommend fast-pick zone re-slotting.",
              impact: "Reduces picker transit time by 15–30%",
              agent: "Dynamic Slotting Agent",
              buildMode: "No-Code Gemini Gem",
              sources: ["WMS Pick Logs", "DC Floor Map", "SKU Cube/Weight"],
              promptHint: "Analyze top co-picked SKU pairs and recommend golden-zone re-slotting to minimize picker travel distance."
            },
            {
              id: "SC-35",
              persona: "Inbound Receiving Supervisor",
              mandate: "Parses scanned BOLs and pallet photos to reconcile open ASN variances.",
              impact: "Dock turnaround in minutes vs. hours",
              agent: "Dock-to-Stock Agent",
              buildMode: "Multimodal + Agent Studio",
              sources: ["BOL Scans", "Pallet Photos", "WMS ASN"],
              promptHint: "Compare uploaded Bill of Lading and pallet count photos against open ASN lines to flag short/overages."
            },
            {
              id: "SC-36",
              persona: "DC Shift Floor Lead",
              mandate: "Balances picker lines dynamically to protect carrier pickup cutoff times.",
              impact: "Prevents missed dispatch windows (OTIF)",
              agent: "Wave Fulfillment Copilot",
              buildMode: "Low-Code Agent Studio",
              sources: ["WMS Wave Queue", "Labor Active", "Dock Schedule"],
              promptHint: "Alert shift lead when Wave-3 pick velocity risks missing the 4:00 PM carrier cutoff and suggest labor shift."
            }
          ]
        },
        {
          name: "Omnichannel Visibility",
          items: [
            {
              id: "SC-37",
              persona: "Store Operations / Omni Lead",
              mandate: "Identifies shrinkage anomalies when on-hand stock stops scanning at POS.",
              impact: "Triggers targeted floor cycle counts",
              agent: "Phantom Inventory Sensor",
              buildMode: "Low-Code Agent Studio",
              sources: ["POS Zero-Sales", "Store On-Hand", "BOPIS Cancels"],
              promptHint: "Detect high-velocity SKUs with positive book inventory but zero POS scans for 72h to trigger cycle counts."
            },
            {
              id: "SC-38",
              persona: "Omnichannel Fulfillment Dir.",
              mandate: "Selects lowest-cost fulfillment nodes based on store labor and parcel zones.",
              impact: "Lowers parcel costs & split rates",
              agent: "SFS / BOPIS Sourcing",
              buildMode: "Low-Code Agent Studio",
              sources: ["DOM Rules", "Parcel Rate Zones", "Store Capacity"],
              promptHint: "Optimize ship-from-store vs. DC routing to avoid split shipments and minimize Zone 4+ parcel surcharges."
            },
            {
              id: "SC-39",
              persona: "Reverse Logistics Lead",
              mandate: "Evaluates item condition scans to triage restock, vendor return, or liquidation.",
              impact: "Restocks sellable returns within 24h",
              agent: "Returns Triage Agent",
              buildMode: "Multimodal Vision",
              sources: ["Return Photos", "Grade Rules", "Resale Value"],
              promptHint: "Inspect return item photos and immediately route Grade-A items back to sellable pick bins."
            }
          ]
        }
      ]
    },
    {
      id: "distribution",
      num: "05",
      title: "Distribution & Logistics",
      subtitle: "End-to-End Fulfillment",
      lifecycle: "Logistics Fulfillment Lifecycle",
      tagline: "Store replenishment and last-mile dispatch.",
      color: "var(--g-yellow)",
      ink: "#B06000",
      cssClass: "p-amber",
      page: "pillars/05_distribution.html",
      demoTitle: "Dynamic Rerouter & Fleet Cockpit",
      demoDesc: "Live traffic rerouting, load consolidation & cold-chain audit",
      kpis: [
        { val: "12–18%", lbl: "Higher trailer fill rate" },
        { val: "30–45%", lbl: "Drop in failed deliveries" },
        { val: "Up to 60%", lbl: "Reduction in WISMO calls" }
      ],
      subprocesses: [
        {
          name: "First & Mid-Mile",
          items: [
            {
              id: "SC-40",
              persona: "Transport Planner / Inbound Mgr",
              mandate: "Consolidates vendor LTLs into multi-stop FTL linehauls via cube & weight modeling.",
              impact: "12–18% higher trailer fill rate",
              agent: "Load Consolidation",
              buildMode: "Low-Code Agent Studio",
              sources: ["TMS Open Orders", "Lane Rates", "Pallet Cube"],
              promptHint: "Group overlapping regional LTL shipments into multi-stop FTL milk-runs maximizing cubic trailer utilization."
            },
            {
              id: "SC-41",
              persona: "Yard Master / Plant Logistics",
              mandate: "Parses GPS & gate feeds to flag delays and reassign dock staging doors dynamically.",
              impact: "Eliminates demurrage & line starvation",
              agent: "Yard Disruption Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["ELD/GPS Feeds", "YMS Gate Logs", "Dock Matrix"],
              promptHint: "Detect inbound trailer ETA delays >45m and dynamically swap dock door assignments to prevent idle crews."
            },
            {
              id: "SC-42",
              persona: "Cold Chain QA / Logistics Dir.",
              mandate: "Analyzes reefer IoT telemetry to flag thermal excursions and file carrier claims.",
              impact: "Prevents perishable food spoilage",
              agent: "Cold-Chain Auditor",
              buildMode: "Low-Code Agent Studio",
              sources: ["Reefer IoT", "Thermal Curves", "Carrier SLAs"],
              promptHint: "Monitor real-time trailer temperature telemetry, alert drivers on door-open excursions, and compile claim logs."
            }
          ]
        },
        {
          name: "Store Replenishment",
          items: [
            {
              id: "SC-43",
              persona: "Outbound Lead / Industrial Eng.",
              mandate: "Sequences DC pick waves to match individual store planograms and shelf layouts.",
              impact: "Cuts store stocking labor by 20–35%",
              agent: "Aisle-Aligned Pallet",
              buildMode: "No-Code Gemini Gem",
              sources: ["Store Planograms", "WMS Pick Paths", "Pallet Rules"],
              promptHint: "Build pallet layer instructions grouped by destination store aisle to enable direct shelf-ready restocking."
            },
            {
              id: "SC-44",
              persona: "Store Replenishment Lead",
              mandate: "Throttles push replenishment based on store backroom limits and live POS velocity.",
              impact: "Reduces backroom stock by 25%",
              agent: "Store Capacity Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["Backroom Cap", "Live POS", "In-Transit ASNs"],
              promptHint: "Cap store push allocations when backroom utilization exceeds 85% and route excess to high-velocity stores."
            },
            {
              id: "SC-45",
              persona: "Retail Logistics Dispatcher",
              mandate: "Coordinates municipal delivery curfews and store dock shift schedules dynamically.",
              impact: "98%+ on-time store window compliance",
              agent: "Curfew Orchestrator",
              buildMode: "No-Code Gemini Gem",
              sources: ["City Curfew DB", "Store Dock Hours", "Dispatch Plan"],
              promptHint: "Validate all urban store dispatch schedules against municipal no-entry hours and local store receiving shifts."
            }
          ]
        },
        {
          name: "Last-Mile Delivery",
          items: [
            {
              id: "SC-46",
              persona: "Last-Mile Operations Lead",
              mandate: "Interprets gate codes, apartment delivery notes, and aerial imagery to guide drivers.",
              impact: "Drops failed deliveries by 30–45%",
              agent: "Geocoding Intelligence",
              buildMode: "Multimodal + Maps API",
              sources: ["Google Maps", "Driver Notes", "Aerial Imagery"],
              promptHint: "Extract exact service entrance pins and gate instructions from unstructured customer notes and aerial maps."
            },
            {
              id: "SC-47",
              persona: "E-Commerce Logistics Dir.",
              mandate: "Routes parcels dynamically across internal fleet, 3PL, and gig couriers by rate card.",
              impact: "Lowers last-mile cost by 8–14%",
              agent: "Courier Allocation",
              buildMode: "Low-Code Agent Studio",
              sources: ["3PL Rate Cards", "Courier SLAs", "Order Density"],
              promptHint: "Select the optimal carrier (Internal vs 3PL vs Gig) per pin code balancing promised SLA and marginal drop cost."
            },
            {
              id: "SC-48",
              persona: "Customer Support Ops Lead",
              mandate: "Detects en-route exceptions and updates customers proactively with reschedule links.",
              impact: "Decreases WISMO calls by up to 60%",
              agent: "Delivery Exception Copilot",
              buildMode: "Low-Code Agent Studio",
              sources: ["Carrier Webhooks", "CRM Contacts", "WhatsApp/SMS"],
              promptHint: "Detect weather/traffic delivery delays and send proactive localized reschedule options before customers call."
            }
          ]
        },
        {
          name: "Route & Carrier",
          items: [
            {
              id: "SC-49",
              persona: "Fleet Dispatcher / Central Ops",
              mandate: "Recalculates multi-stop routes using live Google Maps traffic, radar, and bridge limits.",
              impact: "Cuts fleet fuel usage by 6–10%",
              agent: "Dynamic Rerouter",
              buildMode: "Low-Code + Maps Platform",
              sources: ["Google Maps API", "Weather Radar", "Truck Specs"],
              promptHint: "Re-sequence remaining afternoon stops dynamically around live highway closures and low-bridge restrictions."
            },
            {
              id: "SC-50",
              persona: "Transport Procurement Lead",
              mandate: "Tracks carrier tender acceptance & OTIF to reprioritize waterfall routing guides.",
              impact: "Reduces spot freight by 15–20%",
              agent: "Routing Guide Compliance",
              buildMode: "No-Code Gemini Gem",
              sources: ["TMS Tender Logs", "Spot Market Rates", "Carrier OTIF"],
              promptHint: "Identify lanes where primary carriers reject >20% of tenders and recommend routing guide re-ranking."
            },
            {
              id: "SC-51",
              persona: "Freight Controller / Claims",
              mandate: "Extracts signed PODs and rate contracts via OCR to audit accessorial surcharges.",
              impact: "Captures 3–7% in overbilled fees",
              agent: "Freight Bill Audit Agent",
              buildMode: "Multimodal + Agent Studio",
              sources: ["Signed PODs", "Carrier Contracts", "Detention Logs"],
              promptHint: "Audit carrier detention and lumper accessorials against GPS geofence timestamps and signed PODs."
            }
          ]
        }
      ]
    },
    {
      id: "reverse",
      num: "06",
      title: "Returns & Reverse Logistics",
      subtitle: "Circularity & Value Recovery",
      lifecycle: "Reverse Value Stream Lifecycle",
      tagline: "Triage inspection and upstream defect loops.",
      color: "var(--g-red)",
      ink: "var(--red-ink)",
      cssClass: "p-red",
      page: "pillars/06_reverse.html",
      demoTitle: "Return Fraud & Circularity",
      demoDesc: "Visual return triage, dynamic markdowns & RTI reclamation",
      kpis: [
        { val: "25–40%", lbl: "Return fraud abuse cut" },
        { val: "20–35%", lbl: "Perishable scrap reduction" },
        { val: "30%", lbl: "Eliminated RTI non-return fines" }
      ],
      subprocesses: [
        {
          name: "Returns & Claims Mgmt",
          items: [
            {
              id: "SC-52",
              persona: "Reverse Logistics / Fraud Lead",
              mandate: "Analyzes item photos and packaging video feeds to detect wear or swapped tags.",
              impact: "Cuts returns fraud abuse by 25–40%",
              agent: "Return Fraud Sentinel",
              buildMode: "Multimodal Vision",
              sources: ["Return Photos", "Packing Video", "Order History"],
              promptHint: "Compare returned item images against outbound pack-out photos to detect tag swaps, wear, or empty boxes."
            },
            {
              id: "SC-53",
              persona: "Customer Experience (CX) Lead",
              mandate: "Evaluates salvage margins vs reverse freight to determine keep-it instant refunds.",
              impact: "Lowers net return costs by 15–22%",
              agent: "Keep-It & Routing Advisor",
              buildMode: "Low-Code Agent Studio",
              sources: ["Item Margin", "Return Freight", "Customer LTV"],
              promptHint: "Calculate whether reverse shipping + restocking exceeds net salvage value to authorize instant keep-it refunds."
            },
            {
              id: "SC-54",
              persona: "Claims Specialist / Controller",
              mandate: "Reconciles eBOLs, dock damage logs, and carrier contracts to auto-file disputes.",
              impact: "Resolves carrier claims in <72 hours",
              agent: "OS&D Freight Claims",
              buildMode: "Multimodal + Agent Studio",
              sources: ["eBOLs", "Dock Photos", "Carrier Liability"],
              promptHint: "Assemble Over, Short & Damaged (OS&D) evidence packets with timestamped dock photos and file carrier claims."
            }
          ]
        },
        {
          name: "Expiry & Markdowns",
          items: [
            {
              id: "SC-55",
              persona: "Merchandising / Store Ops Mgr",
              mandate: "Correlates days-to-expiry (DTE) with sales velocity to trigger ESL shelf price cuts.",
              impact: "Cuts perishable scrap by 20–35%",
              agent: "Dynamic Markdown Agent",
              buildMode: "Low-Code Agent Studio",
              sources: ["DTE Inventory", "Hourly POS", "ESL Pricing API"],
              promptHint: "Compute optimal markdown % curve for short-dated perishables to clear stock before end-of-day expiry."
            },
            {
              id: "SC-56",
              persona: "Inventory Disposition Lead",
              mandate: "Matches near-date DC lots with discounters or food banks before acceptance cutoffs.",
              impact: "Diverts bulk perishables from landfill",
              agent: "Short-Dated Redistributor",
              buildMode: "No-Code Gemini Gem",
              sources: ["DC Expiry Lots", "Secondary Buyers", "Food Bank Net"],
              promptHint: "Match near-code DC pallets to secondary liquidators or local food banks with cold-chain pickup readiness."
            },
            {
              id: "SC-57",
              persona: "Chief Sustainability Officer",
              mandate: "Aggregates store shrink and organic haul logs to generate audited GHG diversion filings.",
              impact: "Automates annual circularity reporting",
              agent: "Food Waste & ESG Copilot",
              buildMode: "No-Code Gemini Gem",
              sources: ["Shrink Logs", "Compost Hauls", "ESG Frameworks"],
              promptHint: "Consolidate food waste diversion weights into audit-ready Scope 3 & zero-waste-to-landfill disclosures."
            }
          ]
        },
        {
          name: "Pallet & Tote Reclamation",
          items: [
            {
              id: "SC-58",
              persona: "Asset Recovery / RTI Manager",
              mandate: "Reconciles RFID portal scans with CHEP/PECO statements to detect hoarding nodes.",
              impact: "Eliminates 30% in non-return fee fines",
              agent: "RTI Balance Reconciler",
              buildMode: "Low-Code Agent Studio",
              sources: ["RFID Gate Scans", "CHEP/PECO Bills", "Node Balances"],
              promptHint: "Identify distributor or store nodes with accumulating unreturned pallets/totes and issue automated recovery alerts."
            },
            {
              id: "SC-59",
              persona: "Reverse Transport Planner",
              mandate: "Schedules dynamic backhauls to collect empty roll cages and RPCs from retail stores.",
              impact: "Boosts backhaul fill rate by 25–40%",
              agent: "Milk-Run Consolidation",
              buildMode: "Low-Code Agent Studio",
              sources: ["Empty RTI Queue", "Outbound Trucks", "Store Routes"],
              promptHint: "Pair empty inbound store deliveries with nearby empty roll-cage and RPC pickups on the return leg."
            },
            {
              id: "SC-60",
              persona: "Packaging QA / Food Safety",
              mandate: "Inspects return photos and wash logs for structural fatigue and chemical compliance.",
              impact: "Extends reusable lifecycle by 15–20%",
              agent: "Sanitation & Health Agent",
              buildMode: "Multimodal Vision",
              sources: ["Tote Photos", "Wash Cycle Logs", "Food Safety Spec"],
              promptHint: "Inspect returned reusable plastic crates (RPCs) for cracks and verify sanitizer wash-cycle compliance."
            }
          ]
        }
      ]
    }
  ]
};
