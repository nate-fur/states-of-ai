import { fixtureDataCenters, fixtureProfiles } from "@/lib/fixtures";
import { getConvexBills } from "@/lib/convex-data";
import { getBillsForState } from "@/lib/legiscan";
import type { AIBill, DataCenter, StateProfile, StateSummary } from "@/lib/types";

export function getComputeSignal(
  datacenters: DataCenter[],
): StateSummary["computeSignal"] {
  const capacity = datacenters.reduce((sum, facility) => sum + facility.capacity_mw, 0);
  if (capacity >= 120 || datacenters.length >= 2) return "high";
  if (capacity > 0) return "developing";
  return "limited";
}

function summarize(profile: StateProfile): StateSummary {
  const capacityMw = profile.datacenters.reduce(
    (sum, facility) => sum + facility.capacity_mw,
    0,
  );
  const proposedBills = profile.bills.filter(
    (bill) => bill.product_status === "proposed",
  ).length;
  const enactedBills = profile.bills.filter(
    (bill) => bill.product_status === "enacted",
  ).length;
  return {
    code: profile.code,
    name: profile.name,
    billCount: profile.bills.length,
    proposedBills,
    enactedBills,
    datacenterCount: profile.datacenters.length,
    capacityMw,
    computeSignal: getComputeSignal(profile.datacenters),
  };
}

export async function getStateProfile(code: string): Promise<StateProfile | null> {
  const fixtureProfile = fixtureProfiles.find(
    (profile) => profile.code === code.toUpperCase(),
  );
  if (!fixtureProfile) return null;

  const bills = await getStateBills(fixtureProfile.code);
  return { ...fixtureProfile, bills };
}

export async function getStateSummaries(): Promise<StateSummary[]> {
  const profiles = await Promise.all(
    fixtureProfiles.map(async (profile) => ({
      ...profile,
      bills: await getBillsForState(profile.code),
    })),
  );
  return profiles.map(summarize);
}

export async function getStateBills(code: string): Promise<AIBill[] | null> {
  const profile = fixtureProfiles.find(
    (entry) => entry.code === code.toUpperCase(),
  );
  if (!profile) return null;
  return (await getConvexBills(profile.code)) ?? getBillsForState(profile.code);
}

export async function getAllBills(): Promise<AIBill[]> {
  const convexBills = await getConvexBills();
  if (convexBills) return convexBills;
  const billGroups = await Promise.all(
    fixtureProfiles.map((profile) => getBillsForState(profile.code)),
  );
  return billGroups
    .flat()
    .sort((first, second) => second.last_action_date.localeCompare(first.last_action_date));
}

export function getStateDataCenters(code: string): DataCenter[] | null {
  const profile = fixtureProfiles.find(
    (entry) => entry.code === code.toUpperCase(),
  );
  return profile?.datacenters ?? null;
}

export function getOverviewStats(summaries: StateSummary[]) {
  return {
    trackedStates: summaries.length,
    activeBills: summaries.reduce((sum, state) => sum + state.billCount, 0),
    enactedBills: summaries.reduce((sum, state) => sum + state.enactedBills, 0),
    capacityMw: fixtureDataCenters.reduce(
      (sum, facility) => sum + facility.capacity_mw,
      0,
    ),
  };
}
