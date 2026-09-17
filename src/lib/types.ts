export type BillStatus = "proposed" | "enacted";
export type FacilityStatus = "operational" | "construction" | "announced" | "proposed";

export type LegiScanProgress = {
  event_date: string;
  event: number;
  event_text: string;
};

export type AIBill = {
  bill_id: number;
  number: string;
  title: string;
  status: number;
  status_date: string;
  last_action: string;
  last_action_date: string;
  url: string;
  state: string;
  chamber: string;
  session: string;
  history: Array<{ date: string; action: string; chamber: string }>;
  sponsors: Array<{ name: string; party: string; role: string }>;
  texts: Array<{ date: string; type: string; url: string }>;
  progress: LegiScanProgress[];
  product_status: BillStatus;
};

export type DataCenter = {
  id: string;
  name: string;
  state: string;
  city: string;
  county?: string;
  capacity_mw: number;
  status: FacilityStatus;
  operator: string;
  description: string;
  source_url?: string;
};

export type StateProfile = {
  code: string;
  name: string;
  bills: AIBill[];
  datacenters: DataCenter[];
};

export type StateSummary = {
  code: string;
  name: string;
  billCount: number;
  proposedBills: number;
  enactedBills: number;
  datacenterCount: number;
  capacityMw: number;
  computeSignal: "high" | "developing" | "limited";
};
