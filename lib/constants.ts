// Status vocabularies. Stored as strings (SQLite/Postgres compatible);
// these maps are the single source of truth for labels and badge styles.

export const ROLES = {
  PLATFORM_ADMIN: "Platform Admin",
  OWNER: "Owner",
  STAFF: "Staff",
  TECH: "Technician",
  CLIENT: "Client",
} as const;

export type Role = keyof typeof ROLES;

/** Billable team roles — each active one is a $/mo seat. */
export const SEAT_ROLES = ["OWNER", "STAFF", "TECH"] as const;

/** Subdomains that can never be tenant slugs (infrastructure + confusion risk). */
export const RESERVED_SLUGS = [
  "www", "admin", "api", "app", "mail", "email", "smtp", "imap", "ftp",
  "signup", "login", "locked", "portal", "tech", "billing", "help", "support",
  "docs", "blog", "status", "staging", "dev", "test", "demo", "cdn", "assets",
  "static", "ns1", "ns2",
] as const;

export const TICKET_STATUSES: Record<string, { label: string; badge: string }> = {
  OPEN: { label: "Open", badge: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "In progress", badge: "bg-amber-100 text-amber-800" },
  WAITING_ON_CLIENT: { label: "Waiting on client", badge: "bg-purple-100 text-purple-800" },
  RESOLVED: { label: "Resolved", badge: "bg-green-100 text-green-800" },
  CLOSED: { label: "Closed", badge: "bg-gray-200 text-gray-700" },
};

export const TICKET_PRIORITIES: Record<string, { label: string; badge: string }> = {
  LOW: { label: "Low", badge: "bg-gray-100 text-gray-700" },
  NORMAL: { label: "Normal", badge: "bg-blue-100 text-blue-800" },
  HIGH: { label: "High", badge: "bg-orange-100 text-orange-800" },
  URGENT: { label: "Urgent", badge: "bg-red-100 text-red-800" },
};

export const PROJECT_STATUSES: Record<string, { label: string; badge: string }> = {
  ACTIVE: { label: "Active", badge: "bg-green-100 text-green-800" },
  PAUSED: { label: "Paused", badge: "bg-amber-100 text-amber-800" },
  COMPLETED: { label: "Completed", badge: "bg-gray-200 text-gray-700" },
};

export const DELIVERABLE_STATUSES: Record<string, { label: string; badge: string }> = {
  IN_PROGRESS: { label: "In progress", badge: "bg-amber-100 text-amber-800" },
  DELIVERED: { label: "Delivered", badge: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "Approved", badge: "bg-green-100 text-green-800" },
};

export const ORDER_STATUSES: Record<string, { label: string; badge: string }> = {
  PENDING: { label: "Pending approval", badge: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", badge: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: { label: "In progress", badge: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "Completed", badge: "bg-green-100 text-green-800" },
  CANCELED: { label: "Canceled", badge: "bg-gray-200 text-gray-700" },
};

export const APPOINTMENT_STATUSES: Record<string, { label: string; badge: string }> = {
  SCHEDULED: { label: "Scheduled", badge: "bg-blue-100 text-blue-800" },
  EN_ROUTE: { label: "En route", badge: "bg-amber-100 text-amber-800" },
  ON_SITE: { label: "On site", badge: "bg-purple-100 text-purple-800" },
  COMPLETED: { label: "Completed", badge: "bg-green-100 text-green-800" },
  CANCELED: { label: "Canceled", badge: "bg-gray-200 text-gray-700" },
};

export const TENANT_STATUSES: Record<string, { label: string; badge: string }> = {
  TRIAL: { label: "Trial", badge: "bg-amber-100 text-amber-800" },
  ACTIVE: { label: "Active", badge: "bg-green-100 text-green-800" },
  PAST_DUE: { label: "Past due", badge: "bg-red-100 text-red-800" },
  SUSPENDED: { label: "Suspended", badge: "bg-gray-200 text-gray-700" },
};
