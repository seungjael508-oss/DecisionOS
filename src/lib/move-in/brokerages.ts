export const BROKERAGE_CONTACT_ROLES = ["REP", "MANAGER1", "MANAGER2"] as const;
export type BrokerageContactRole = (typeof BROKERAGE_CONTACT_ROLES)[number];

export const BROKERAGE_CONTACT_ROLE_LABELS: Record<BrokerageContactRole, string> = {
  REP: "대표",
  MANAGER1: "실장1",
  MANAGER2: "실장2",
};

export type BrokerageContactOption = {
  id: string;
  role: BrokerageContactRole;
  name: string;
  phone: string | null;
  active: boolean;
};

export type BrokerageOfficeOption = {
  id: string;
  name: string;
  address?: string | null;
  mainPhone?: string | null;
  active: boolean;
  contacts: BrokerageContactOption[];
};

export type SaveBrokerageOfficeInput = {
  projectId: string;
  officeId?: string | null;
  name: string;
  address: string;
  mainPhone: string;
  active: boolean;
  contacts: Array<{
    role: BrokerageContactRole;
    name: string;
    phone: string;
  }>;
};

export function isBrokerageContactRole(value: string): value is BrokerageContactRole {
  return (BROKERAGE_CONTACT_ROLES as readonly string[]).includes(value);
}

export function contactNameForRole(
  office: BrokerageOfficeOption,
  role: BrokerageContactRole,
) {
  return office.contacts.find((item) => item.role === role && item.active)?.name ?? "—";
}
