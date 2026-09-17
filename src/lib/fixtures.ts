import type { AIBill, DataCenter, StateProfile } from "@/lib/types";

const states = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"], ["DC", "District of Columbia"],
] as const;

function bill(
  state: string,
  billId: number,
  number: string,
  title: string,
  productStatus: AIBill["product_status"],
  lastAction: string,
  date: string,
  chamber = "House",
): AIBill {
  const enacted = productStatus === "enacted";
  return {
    bill_id: billId,
    number,
    title,
    status: enacted ? 4 : 2,
    status_date: date,
    last_action: lastAction,
    last_action_date: date,
    url: `https://legiscan.com/${state}/bill/${number.replace(/\s/g, "")}/${billId}`,
    state,
    chamber,
    session: "2025-2026 Regular Session",
    history: [
      { date: "2025-01-14", action: "Introduced and referred to committee", chamber },
      { date, action: lastAction, chamber },
    ],
    sponsors: [{ name: "Primary sponsor", party: "Bipartisan", role: "Sponsor" }],
    texts: [{ date: "2025-01-14", type: "Introduced", url: `https://legiscan.com/${state}/text/${billId}` }],
    progress: [
      { event_date: "2025-01-14", event: 1, event_text: "Introduced" },
      { event_date: date, event: enacted ? 4 : 2, event_text: lastAction },
    ],
    product_status: productStatus,
  };
}

export const fixtureBills: AIBill[] = [
  bill("CA", 1871001, "SB 53", "Frontier Artificial Intelligence Models: Safety and Security", "enacted", "Chaptered by Secretary of State", "2025-09-29", "Senate"),
  bill("CA", 1871002, "AB 2013", "Generative Artificial Intelligence: Training Data Transparency", "enacted", "Chaptered by Secretary of State", "2025-09-28"),
  bill("CA", 1871003, "SB 1047", "Safe and Secure Innovation for Frontier Artificial Intelligence Models", "proposed", "Placed on suspense file", "2025-08-15", "Senate"),
  bill("CO", 1872001, "SB 24-205", "Consumer Protections for Artificial Intelligence", "enacted", "Signed by the Governor", "2024-05-17", "Senate"),
  bill("CO", 1872002, "HB 25-1260", "Artificial Intelligence Consumer Protection Amendments", "proposed", "House committee amended and referred", "2025-04-22"),
  bill("CT", 1873001, "SB 2", "Artificial Intelligence and Automated Decision-Making", "proposed", "Public hearing held", "2025-03-07", "Senate"),
  bill("HI", 1874001, "SB 2250", "Artificial Intelligence: Government Use and Inventory", "proposed", "Passed second reading", "2025-02-26", "Senate"),
  bill("IL", 1875001, "HB 3773", "Artificial Intelligence Systems and Consumer Rights", "proposed", "Referred to Rules Committee", "2025-03-18"),
  bill("IL", 1875002, "SB 2501", "Digital Voice and Likeness Protection Act", "enacted", "Public Act 104-0185", "2025-07-11", "Senate"),
  bill("NJ", 1876001, "S 332", "Artificial Intelligence: Disclosure of Generated Content", "proposed", "Reported from committee", "2025-02-24", "Senate"),
  bill("NY", 1877001, "S 6955", "New York Artificial Intelligence Consumer Protection Act", "proposed", "Referred to Consumer Protection Committee", "2025-01-24", "Senate"),
  bill("NY", 1877002, "A 7688", "Synthetic Media in Political Communications", "proposed", "Assembly committee reported", "2025-05-06"),
  bill("OR", 1878001, "SB 1571", "Artificial Intelligence Systems Used by Public Bodies", "proposed", "Referred to Ways and Means", "2025-03-20", "Senate"),
  bill("TX", 1879001, "HB 149", "Texas Responsible Artificial Intelligence Governance Act", "enacted", "Signed by the Governor", "2025-06-22"),
  bill("TX", 1879002, "SB 1966", "Artificial Intelligence: Biometric Identifier Protections", "proposed", "Left pending in committee", "2025-04-01", "Senate"),
  bill("UT", 1880001, "SB 149", "Artificial Intelligence Policy Act Amendments", "enacted", "Chaptered", "2025-03-25", "Senate"),
  bill("VA", 1881001, "HB 2094", "High-Risk Artificial Intelligence Developer and Deployer Act", "proposed", "Passed by indefinitely in committee", "2025-02-04"),
  bill("VA", 1881002, "SB 1051", "Synthetic Media: Election Communications", "enacted", "Approved by Governor", "2025-03-18", "Senate"),
  bill("WA", 1882001, "SB 5838", "Artificial Intelligence: State Government Use", "proposed", "Referred to Rules Committee", "2025-02-12", "Senate"),
  bill("MD", 1883001, "HB 956", "Artificial Intelligence: Consumer Protection", "proposed", "Hearing scheduled", "2025-02-28"),
  bill("MA", 1884001, "S 31", "Artificial Intelligence and Automated Decision Systems", "proposed", "Joint committee hearing held", "2025-06-03", "Senate"),
  bill("DC", 1885001, "B25-0501", "Artificial Intelligence Transparency Amendment Act", "proposed", "Committee hearing held", "2025-05-13", "Council"),
];

export const fixtureDataCenters: DataCenter[] = [
  { id: "va-ashburn-01", name: "Digital Campus Ashburn", state: "VA", city: "Ashburn", county: "Loudoun", capacity_mw: 360, status: "operational", operator: "Hyperscale campus", description: "Large Northern Virginia campus serving cloud and AI workloads." },
  { id: "va-pwc-01", name: "Innovation Park Campus", state: "VA", city: "Manassas", county: "Prince William", capacity_mw: 300, status: "announced", operator: "Cloud developer", description: "Planned high-density compute campus with phased delivery." },
  { id: "tx-temple-01", name: "Temple AI Compute Campus", state: "TX", city: "Temple", capacity_mw: 180, status: "construction", operator: "Compute infrastructure developer", description: "Purpose-built data center expansion designed for accelerated compute." },
  { id: "tx-san-antonio-01", name: "South Texas Data Campus", state: "TX", city: "San Antonio", capacity_mw: 100, status: "proposed", operator: "Colocation provider", description: "Proposed regional capacity supporting enterprise and AI demand." },
  { id: "oh-new-albany-01", name: "New Albany Data Campus", state: "OH", city: "New Albany", capacity_mw: 120, status: "construction", operator: "Hyperscale campus", description: "New Ohio capacity under construction." },
  { id: "az-mesa-01", name: "Mesa Cloud Campus", state: "AZ", city: "Mesa", capacity_mw: 75, status: "operational", operator: "Cloud provider", description: "Operating campus serving the Phoenix metro." },
  { id: "ia-council-bluffs-01", name: "Council Bluffs Campus", state: "IA", city: "Council Bluffs", capacity_mw: 200, status: "operational", operator: "Technology company", description: "Established data center campus with ongoing infrastructure investment." },
  { id: "ga-atlanta-01", name: "Atlanta Compute Hub", state: "GA", city: "Atlanta", capacity_mw: 105, status: "operational", operator: "Colocation provider", description: "Regional interconnection and compute facility." },
  { id: "nc-catawba-01", name: "Catawba Energy Campus", state: "NC", city: "Maiden", capacity_mw: 70, status: "proposed", operator: "Cloud developer", description: "Proposed AI-ready capacity in the Charlotte region." },
  { id: "or-prineville-01", name: "Prineville Data Campus", state: "OR", city: "Prineville", capacity_mw: 95, status: "operational", operator: "Technology company", description: "Operating Central Oregon data center campus." },
  { id: "in-south-bend-01", name: "St. Joseph County Campus", state: "IN", city: "South Bend", capacity_mw: 80, status: "construction", operator: "Data center developer", description: "Construction-stage project targeting high-density workloads." },
  { id: "ne-papillion-01", name: "Papillion Data Center", state: "NE", city: "Papillion", capacity_mw: 50, status: "operational", operator: "Colocation provider", description: "Operating regional data center capacity." },
  { id: "nv-storey-01", name: "Storey County Compute Site", state: "NV", city: "Reno", county: "Storey", capacity_mw: 65, status: "announced", operator: "Infrastructure developer", description: "Announced campus with access to Nevada power resources." },
  { id: "wa-quincy-01", name: "Quincy Cloud Campus", state: "WA", city: "Quincy", capacity_mw: 140, status: "operational", operator: "Technology company", description: "Hydropower-adjacent cloud and data center campus." },
];

export const fixtureProfiles: StateProfile[] = states.map(([code, name]) => ({
  code,
  name,
  bills: fixtureBills.filter((entry) => entry.state === code),
  datacenters: fixtureDataCenters.filter((entry) => entry.state === code),
}));

export const stateNames = Object.fromEntries(states);
