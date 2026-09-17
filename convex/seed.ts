import { mutation } from "./_generated/server";
import { v } from "convex/values";

const states = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"], ["DC", "District of Columbia"],
] as const;

const billDefinitions = [
  ["CA", "SB 53", "Frontier Artificial Intelligence Models: Safety and Security", "enacted", "Chaptered by Secretary of State", "2025-09-29", "Senate"],
  ["CA", "AB 2013", "Generative Artificial Intelligence: Training Data Transparency", "enacted", "Chaptered by Secretary of State", "2025-09-28", "House"],
  ["CA", "SB 1047", "Safe and Secure Innovation for Frontier Artificial Intelligence Models", "proposed", "Placed on suspense file", "2025-08-15", "Senate"],
  ["CO", "SB 24-205", "Consumer Protections for Artificial Intelligence", "enacted", "Signed by the Governor", "2024-05-17", "Senate"],
  ["CO", "HB 25-1260", "Artificial Intelligence Consumer Protection Amendments", "proposed", "House committee amended and referred", "2025-04-22", "House"],
  ["CT", "SB 2", "Artificial Intelligence and Automated Decision-Making", "proposed", "Public hearing held", "2025-03-07", "Senate"],
  ["HI", "SB 2250", "Artificial Intelligence: Government Use and Inventory", "proposed", "Passed second reading", "2025-02-26", "Senate"],
  ["IL", "HB 3773", "Artificial Intelligence Systems and Consumer Rights", "proposed", "Referred to Rules Committee", "2025-03-18", "House"],
  ["IL", "SB 2501", "Digital Voice and Likeness Protection Act", "enacted", "Public Act 104-0185", "2025-07-11", "Senate"],
  ["NJ", "S 332", "Artificial Intelligence: Disclosure of Generated Content", "proposed", "Reported from committee", "2025-02-24", "Senate"],
  ["NY", "S 6955", "New York Artificial Intelligence Consumer Protection Act", "proposed", "Referred to Consumer Protection Committee", "2025-01-24", "Senate"],
  ["NY", "A 7688", "Synthetic Media in Political Communications", "proposed", "Assembly committee reported", "2025-05-06", "House"],
  ["OR", "SB 1571", "Artificial Intelligence Systems Used by Public Bodies", "proposed", "Referred to Ways and Means", "2025-03-20", "Senate"],
  ["TX", "HB 149", "Texas Responsible Artificial Intelligence Governance Act", "enacted", "Signed by the Governor", "2025-06-22", "House"],
  ["TX", "SB 1966", "Artificial Intelligence: Biometric Identifier Protections", "proposed", "Left pending in committee", "2025-04-01", "Senate"],
  ["UT", "SB 149", "Artificial Intelligence Policy Act Amendments", "enacted", "Chaptered", "2025-03-25", "Senate"],
  ["VA", "HB 2094", "High-Risk Artificial Intelligence Developer and Deployer Act", "proposed", "Passed by indefinitely in committee", "2025-02-04", "House"],
  ["VA", "SB 1051", "Synthetic Media: Election Communications", "enacted", "Approved by Governor", "2025-03-18", "Senate"],
  ["WA", "SB 5838", "Artificial Intelligence: State Government Use", "proposed", "Referred to Rules Committee", "2025-02-12", "Senate"],
  ["MD", "HB 956", "Artificial Intelligence: Consumer Protection", "proposed", "Hearing scheduled", "2025-02-28", "House"],
  ["MA", "S 31", "Artificial Intelligence and Automated Decision Systems", "proposed", "Joint committee hearing held", "2025-06-03", "Senate"],
  ["DC", "B25-0501", "Artificial Intelligence Transparency Amendment Act", "proposed", "Committee hearing held", "2025-05-13", "Council"],
] as const;

function makeBill(definition: (typeof billDefinitions)[number], offset: number) {
  const [state, number, title, product_status, last_action, last_action_date, chamber] = definition;
  const bill_id = 1871001 + offset;
  const status = product_status === "enacted" ? 4 : 2;
  return {
    bill_id,
    number,
    title,
    status,
    status_date: last_action_date,
    last_action,
    last_action_date,
    url: `https://legiscan.com/${state}/bill/${number.replace(/\s/g, "")}/${bill_id}`,
    state,
    chamber,
    session: "2025-2026 Regular Session",
    history: [
      { date: "2025-01-14", action: "Introduced and referred to committee", chamber },
      { date: last_action_date, action: last_action, chamber },
    ],
    sponsors: [{ name: "Primary sponsor", party: "Bipartisan", role: "Sponsor" }],
    texts: [{ date: "2025-01-14", type: "Introduced", url: `https://legiscan.com/${state}/text/${bill_id}` }],
    progress: [
      { event_date: "2025-01-14", event: 1, event_text: "Introduced" },
      { event_date: last_action_date, event: status, event_text: last_action },
    ],
    product_status,
  };
}

const dataCenters = [
  { external_id: "va-ashburn-01", name: "Digital Campus Ashburn", state: "VA", city: "Ashburn", capacity_mw: 360, status: "operational", operator: "Hyperscale campus" },
  { external_id: "va-pwc-01", name: "Innovation Park Campus", state: "VA", city: "Manassas", capacity_mw: 300, status: "announced", operator: "Cloud developer" },
  { external_id: "tx-temple-01", name: "Temple AI Compute Campus", state: "TX", city: "Temple", capacity_mw: 180, status: "construction", operator: "Compute infrastructure developer" },
  { external_id: "oh-new-albany-01", name: "New Albany Data Campus", state: "OH", city: "New Albany", capacity_mw: 120, status: "construction", operator: "Hyperscale campus" },
] as const;

async function clearTable(ctx: any, table: "states" | "bills" | "datacenters") {
  const rows = await ctx.db.query(table).collect();
  await Promise.all(rows.map((row) => ctx.db.delete(row._id)));
}

async function replaceFixtureData(ctx: any) {
  await clearTable(ctx, "states");
  await clearTable(ctx, "bills");
  await clearTable(ctx, "datacenters");
  await Promise.all(states.map(([code, name]) => ctx.db.insert("states", { code, name })));
  await Promise.all(billDefinitions.map(async (definition, offset) => {
    const raw = makeBill(definition, offset);
    await ctx.db.insert("bills", { ...raw, product_status: raw.product_status as "proposed" | "enacted", raw });
  }));
  await Promise.all(dataCenters.map((center) => ctx.db.insert("datacenters", { ...center, raw: center })));
  return { states: states.length, bills: billDefinitions.length, datacenters: dataCenters.length };
}

/** Idempotently replace records with the committed mock dataset. */
export const fixtures = mutation({
  args: {},
  handler: replaceFixtureData,
});

/** Import a pipeline document written by `pipelines/ingest.py`. */
export const importDocument = mutation({
  args: { document: v.any() },
  handler: async (ctx, { document }) => {
    await clearTable(ctx, "states");
    await clearTable(ctx, "bills");
    await clearTable(ctx, "datacenters");
    await Promise.all(document.states.map((state: { code: string; name: string }) => ctx.db.insert("states", state)));
    await Promise.all(document.bills.map((raw: Record<string, unknown>) => ctx.db.insert("bills", {
      bill_id: Number(raw.bill_id),
      number: String(raw.number),
      title: String(raw.title),
      status: Number(raw.status),
      status_date: String(raw.status_date),
      last_action: String(raw.last_action),
      last_action_date: String(raw.last_action_date),
      url: String(raw.url),
      state: String(raw.state),
      chamber: String(raw.chamber),
      session: String(raw.session),
      product_status: raw.product_status === "enacted" ? "enacted" : "proposed",
      raw,
    })));
    await Promise.all(document.datacenters.map((center: Record<string, unknown>) => ctx.db.insert("datacenters", {
      external_id: String(center.external_id),
      name: String(center.name),
      state: String(center.state),
      city: String(center.city),
      capacity_mw: Number(center.capacity_mw),
      status: String(center.status),
      operator: String(center.operator),
      raw: center,
    })));
    return { states: document.states.length, bills: document.bills.length, datacenters: document.datacenters.length };
  },
});
