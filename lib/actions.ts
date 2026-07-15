"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { getTenantFromRequest, portalUrl } from "@/lib/tenant";
import { seatCount, TRIAL_DAYS, trialExpired } from "@/lib/billing";
import {
  createBillingPortalSession,
  createCheckoutSession,
  stripeEnabled,
  syncSeatQuantity,
} from "@/lib/stripe";
import { SEAT_ROLES } from "@/lib/constants";

const STAFF_ROLES = ["OWNER", "STAFF"];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function refreshPortal() {
  revalidatePath("/portal/[tenant]", "layout");
}

/** Server actions are reachable by POST regardless of what the layouts render,
 *  so the suspended/trial-expired lockout must be enforced here too. Owners
 *  stay allowed — they need billing actions to fix the situation. */
function assertTenantOperational(
  tenant: {
    planStatus: string;
    trialEndsAt: Date | null;
    stripeSubscriptionId: string | null;
  },
  user: { role: string }
) {
  if (user.role === "OWNER") return;
  if (tenant.planStatus === "SUSPENDED" || trialExpired(tenant)) {
    throw new Error("This portal is currently unavailable");
  }
}

/** Tenant team member (OWNER or STAFF) for the current request's tenant. */
async function requireStaff() {
  const user = await getCurrentUser();
  const tenant = await getTenantFromRequest();
  if (!user || !tenant || user.tenantId !== tenant.id || !STAFF_ROLES.includes(user.role)) {
    throw new Error("Not authorized");
  }
  assertTenantOperational(tenant, user);
  return { user, tenant };
}

async function requireOwner() {
  const { user, tenant } = await requireStaff();
  if (user.role !== "OWNER") throw new Error("Not authorized");
  return { user, tenant };
}

/** Any signed-in portal user (client or team) for the current request's tenant. */
async function requirePortalUser() {
  const user = await getCurrentUser();
  const tenant = await getTenantFromRequest();
  if (!user || !tenant || user.tenantId !== tenant.id) throw new Error("Not authorized");
  assertTenantOperational(tenant, user);
  return { user, tenant };
}

/** Assert a company belongs to the tenant; returns it. */
async function tenantCompany(tenantId: string, companyId: string) {
  const company = await db.clientCompany.findFirst({ where: { id: companyId, tenantId } });
  if (!company) throw new Error("Unknown client company");
  return company;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function portalLogin(formData: FormData) {
  const tenant = await getTenantFromRequest();
  if (!tenant) redirect("/");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const user = await db.user.findFirst({
    where: { tenantId: tenant.id, email, active: true },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=1");
  }
  await createSession(user.id);
  // Technicians live in the mobile field portal.
  redirect(user.role === "TECH" ? "/tech" : "/");
}

export async function portalLogout() {
  await destroySession();
  redirect("/login");
}

export async function adminLogin(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const user = await db.user.findFirst({
    where: { tenantId: null, role: "PLATFORM_ADMIN", email, active: true },
  });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/admin/login?error=1");
  }
  await createSession(user.id);
  redirect("/admin");
}

export async function adminLogout() {
  await destroySession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export async function createTicket(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  const priority = str(formData, "priority") || "NORMAL";
  if (!subject || !body) throw new Error("Subject and message are required");

  // Clients file tickets for their own company; staff pick the company.
  let companyId: string;
  if (user.role === "CLIENT") {
    if (!user.companyId) throw new Error("No company on account");
    companyId = user.companyId;
  } else if (STAFF_ROLES.includes(user.role)) {
    companyId = (await tenantCompany(tenant.id, str(formData, "companyId"))).id;
  } else {
    throw new Error("Not authorized");
  }

  const ticket = await db.ticket.create({
    data: {
      tenantId: tenant.id,
      companyId,
      subject,
      priority,
      createdById: user.id,
      messages: { create: { authorId: user.id, body } },
    },
  });
  refreshPortal();
  redirect(`/tickets/${ticket.id}`);
}

export async function replyToTicket(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  const ticketId = Number(str(formData, "ticketId"));
  const body = str(formData, "body");
  if (!body) return;

  const ticket = await db.ticket.findFirst({ where: { id: ticketId, tenantId: tenant.id } });
  if (!ticket) throw new Error("Ticket not found");
  if (user.role === "CLIENT" && ticket.companyId !== user.companyId) {
    throw new Error("Not authorized");
  }
  // Technicians may only post on tickets assigned to them.
  if (user.role === "TECH" && ticket.assignedToId !== user.id) {
    throw new Error("Not authorized");
  }

  // Client reply reopens the loop; an OWNER/STAFF reply hands it back to the
  // client. A technician's field note is just an update — it must NOT flip the
  // ticket to "waiting on client" mid-job.
  let status = ticket.status;
  if (ticket.status !== "CLOSED" && ticket.status !== "RESOLVED") {
    if (user.role === "CLIENT") status = "OPEN";
    else if (STAFF_ROLES.includes(user.role)) status = "WAITING_ON_CLIENT";
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      messages: { create: { authorId: user.id, body } },
      status,
    },
  });
  refreshPortal();
}

/** Status changes a technician can make on their own assigned tickets —
 *  deliberately narrower than staff triage. */
export async function techSetTicketStatus(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  if (user.role !== "TECH") throw new Error("Not authorized");
  const status = str(formData, "status");
  if (!["IN_PROGRESS", "WAITING_ON_CLIENT", "RESOLVED"].includes(status)) {
    throw new Error("Bad status");
  }
  const ticket = await db.ticket.findFirst({
    where: { id: Number(str(formData, "ticketId")), tenantId: tenant.id, assignedToId: user.id },
  });
  if (!ticket) throw new Error("Ticket not found");
  await db.ticket.update({ where: { id: ticket.id }, data: { status } });
  refreshPortal();
}

export async function updateTicket(formData: FormData) {
  const { user, tenant } = await requireStaff();
  const ticketId = Number(str(formData, "ticketId"));
  const ticket = await db.ticket.findFirst({ where: { id: ticketId, tenantId: tenant.id } });
  if (!ticket) throw new Error("Ticket not found");

  const status = str(formData, "status");
  const priority = str(formData, "priority");
  const assignedToId = str(formData, "assignedToId");

  // Never trust a client-supplied assignee id — it must be an active team
  // member of THIS tenant.
  if (assignedToId) {
    const assignee = await db.user.findFirst({
      where: { id: assignedToId, tenantId: tenant.id, active: true, role: { in: [...SEAT_ROLES] } },
    });
    if (!assignee) throw new Error("Unknown team member");
  }

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      assignedToId: assignedToId ? assignedToId : null,
    },
  });
  void user;
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Projects & milestones
// ---------------------------------------------------------------------------

export async function createProject(formData: FormData) {
  const { tenant } = await requireStaff();
  const company = await tenantCompany(tenant.id, str(formData, "companyId"));
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  const dueDate = str(formData, "dueDate");

  const project = await db.project.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      name,
      description: str(formData, "description") || null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  refreshPortal();
  redirect(`/projects/${project.id}`);
}

export async function updateProjectStatus(formData: FormData) {
  const { tenant } = await requireStaff();
  const project = await db.project.findFirst({
    where: { id: str(formData, "projectId"), tenantId: tenant.id },
  });
  if (!project) throw new Error("Project not found");
  await db.project.update({
    where: { id: project.id },
    data: { status: str(formData, "status") || project.status },
  });
  refreshPortal();
}

export async function addMilestone(formData: FormData) {
  const { tenant } = await requireStaff();
  const project = await db.project.findFirst({
    where: { id: str(formData, "projectId"), tenantId: tenant.id },
    include: { _count: { select: { milestones: true } } },
  });
  if (!project) throw new Error("Project not found");
  const title = str(formData, "title");
  if (!title) return;
  const dueDate = str(formData, "dueDate");
  await db.milestone.create({
    data: {
      projectId: project.id,
      title,
      dueDate: dueDate ? new Date(dueDate) : null,
      sortOrder: project._count.milestones,
    },
  });
  refreshPortal();
}

export async function toggleMilestone(formData: FormData) {
  const { tenant } = await requireStaff();
  const milestone = await db.milestone.findFirst({
    where: { id: str(formData, "milestoneId"), project: { tenantId: tenant.id } },
  });
  if (!milestone) throw new Error("Milestone not found");
  await db.milestone.update({
    where: { id: milestone.id },
    data: { done: !milestone.done },
  });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Deliverables
// ---------------------------------------------------------------------------

export async function createDeliverable(formData: FormData) {
  const { tenant } = await requireStaff();
  const company = await tenantCompany(tenant.id, str(formData, "companyId"));
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");

  const projectId = str(formData, "projectId");
  if (projectId) {
    const project = await db.project.findFirst({
      where: { id: projectId, tenantId: tenant.id, companyId: company.id },
    });
    if (!project) throw new Error("Project does not belong to that client");
  }

  await db.deliverable.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      projectId: projectId || null,
      title,
      description: str(formData, "description") || null,
      linkUrl: str(formData, "linkUrl") || null,
    },
  });
  refreshPortal();
}

export async function setDeliverableStatus(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  const deliverable = await db.deliverable.findFirst({
    where: { id: str(formData, "deliverableId"), tenantId: tenant.id },
  });
  if (!deliverable) throw new Error("Deliverable not found");
  const status = str(formData, "status");

  if (user.role === "CLIENT") {
    // Clients may only approve something that has been delivered to them.
    if (
      deliverable.companyId !== user.companyId ||
      status !== "APPROVED" ||
      deliverable.status !== "DELIVERED"
    ) {
      throw new Error("Not authorized");
    }
  } else if (!STAFF_ROLES.includes(user.role)) {
    throw new Error("Not authorized");
  }

  await db.deliverable.update({
    where: { id: deliverable.id },
    data: {
      status,
      deliveredAt:
        status === "DELIVERED" && !deliverable.deliveredAt ? new Date() : deliverable.deliveredAt,
    },
  });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function createOrder(formData: FormData) {
  const { tenant } = await requireStaff();
  const company = await tenantCompany(tenant.id, str(formData, "companyId"));
  const title = str(formData, "title");
  if (!title) throw new Error("Title is required");
  const order = await db.order.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      title,
      notes: str(formData, "notes") || null,
    },
  });
  refreshPortal();
  redirect(`/orders/${order.id}`);
}

export async function addOrderItem(formData: FormData) {
  const { tenant } = await requireStaff();
  const order = await db.order.findFirst({
    where: { id: Number(str(formData, "orderId")), tenantId: tenant.id },
  });
  if (!order) throw new Error("Order not found");
  const description = str(formData, "description");
  const quantity = Math.min(100_000, Math.max(1, parseInt(str(formData, "quantity") || "1", 10) || 1));
  const price = Math.round(parseFloat(str(formData, "unitPrice") || "0") * 100);
  // Guard against Infinity/NaN and Postgres Int4 overflow ($1M/line cap).
  if (!description || !Number.isSafeInteger(price) || price < 0 || price > 100_000_000) return;
  await db.orderItem.create({
    data: { orderId: order.id, description, quantity, unitPriceCents: price },
  });
  refreshPortal();
}

export async function deleteOrderItem(formData: FormData) {
  const { tenant } = await requireStaff();
  const item = await db.orderItem.findFirst({
    where: { id: str(formData, "itemId"), order: { tenantId: tenant.id } },
  });
  if (!item) return;
  await db.orderItem.delete({ where: { id: item.id } });
  refreshPortal();
}

export async function setOrderStatus(formData: FormData) {
  const { tenant } = await requireStaff();
  const order = await db.order.findFirst({
    where: { id: Number(str(formData, "orderId")), tenantId: tenant.id },
  });
  if (!order) throw new Error("Order not found");
  await db.order.update({
    where: { id: order.id },
    data: { status: str(formData, "status") || order.status },
  });
  refreshPortal();
}

/** Client-side approval of a pending order. */
export async function approveOrder(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  if (user.role !== "CLIENT") throw new Error("Only clients approve orders");
  const order = await db.order.findFirst({
    where: {
      id: Number(str(formData, "orderId")),
      tenantId: tenant.id,
      companyId: user.companyId ?? "",
      status: "PENDING",
    },
  });
  if (!order) throw new Error("Order not found");
  await db.order.update({ where: { id: order.id }, data: { status: "APPROVED" } });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Appointments (field service scheduling)
// ---------------------------------------------------------------------------

export async function createAppointment(formData: FormData) {
  const { tenant } = await requireStaff();
  const techId = str(formData, "techId");
  const tech = await db.user.findFirst({
    where: { id: techId, tenantId: tenant.id, active: true, role: { in: [...SEAT_ROLES] } },
  });
  if (!tech) throw new Error("Unknown team member");

  // If the visit is for a ticket, the company comes from the ticket.
  const ticketIdRaw = str(formData, "ticketId");
  let companyId: string;
  let ticketId: number | null = null;
  if (ticketIdRaw) {
    const ticket = await db.ticket.findFirst({
      where: { id: Number(ticketIdRaw), tenantId: tenant.id },
    });
    if (!ticket) throw new Error("Ticket not found");
    ticketId = ticket.id;
    companyId = ticket.companyId;
  } else {
    companyId = (await tenantCompany(tenant.id, str(formData, "companyId"))).id;
  }

  const title = str(formData, "title");
  const date = str(formData, "date");
  const time = str(formData, "time");
  const durationMin = parseInt(str(formData, "duration") || "60", 10) || 60;
  if (!title || !date || !time) throw new Error("Title, date and time are required");
  const scheduledStart = new Date(`${date}T${time}`);
  if (isNaN(scheduledStart.getTime())) throw new Error("Invalid date/time");
  const scheduledEnd = new Date(scheduledStart.getTime() + durationMin * 60_000);

  const company = await db.clientCompany.findUniqueOrThrow({ where: { id: companyId } });
  await db.appointment.create({
    data: {
      tenantId: tenant.id,
      companyId,
      ticketId,
      techId: tech.id,
      title,
      notes: str(formData, "notes") || null,
      address: str(formData, "address") || company.address || null,
      scheduledStart,
      scheduledEnd,
    },
  });
  refreshPortal();
}

/** Staff can move any appointment through its lifecycle; a technician only
 *  their own, and never into CANCELED (that's dispatch's call). */
export async function setAppointmentStatus(formData: FormData) {
  const { user, tenant } = await requirePortalUser();
  const status = str(formData, "status");
  if (!["SCHEDULED", "EN_ROUTE", "ON_SITE", "COMPLETED", "CANCELED"].includes(status)) {
    throw new Error("Bad status");
  }
  const isStaff = STAFF_ROLES.includes(user.role);
  if (!isStaff && user.role !== "TECH") throw new Error("Not authorized");
  if (user.role === "TECH" && status === "CANCELED") throw new Error("Not authorized");

  const appointment = await db.appointment.findFirst({
    where: {
      id: str(formData, "appointmentId"),
      tenantId: tenant.id,
      ...(user.role === "TECH" ? { techId: user.id } : {}),
    },
  });
  if (!appointment) throw new Error("Appointment not found");
  await db.appointment.update({ where: { id: appointment.id }, data: { status } });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function createReport(formData: FormData) {
  const { tenant } = await requireStaff();
  const company = await tenantCompany(tenant.id, str(formData, "companyId"));
  const title = str(formData, "title");
  const body = str(formData, "body");
  if (!title || !body) throw new Error("Title and body are required");
  await db.report.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      title,
      periodLabel: str(formData, "periodLabel") || null,
      body,
      publishedAt: formData.get("publish") ? new Date() : null,
    },
  });
  refreshPortal();
  redirect("/reports");
}

export async function toggleReportPublished(formData: FormData) {
  const { tenant } = await requireStaff();
  const report = await db.report.findFirst({
    where: { id: str(formData, "reportId"), tenantId: tenant.id },
  });
  if (!report) throw new Error("Report not found");
  await db.report.update({
    where: { id: report.id },
    data: { publishedAt: report.publishedAt ? null : new Date() },
  });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Clients (companies + client users)
// ---------------------------------------------------------------------------

export async function createCompany(formData: FormData) {
  const { tenant } = await requireStaff();
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");
  await db.clientCompany.create({
    data: {
      tenantId: tenant.id,
      name,
      contactName: str(formData, "contactName") || null,
      contactEmail: str(formData, "contactEmail") || null,
      address: str(formData, "address") || null,
    },
  });
  refreshPortal();
}

export async function createClientUser(formData: FormData) {
  const { tenant } = await requireStaff();
  const company = await tenantCompany(tenant.id, str(formData, "companyId"));
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const password = str(formData, "password");
  if (!email || !name || password.length < 8) {
    throw new Error("Name, email and a password of 8+ characters are required");
  }
  const existing = await db.user.findFirst({ where: { tenantId: tenant.id, email } });
  if (existing) throw new Error("A user with that email already exists");
  await db.user.create({
    data: {
      tenantId: tenant.id,
      companyId: company.id,
      email,
      name,
      role: "CLIENT",
      passwordHash: hashPassword(password),
    },
  });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Team & settings (owner)
// ---------------------------------------------------------------------------

export async function createTeamMember(formData: FormData) {
  const { tenant } = await requireOwner();
  const email = str(formData, "email").toLowerCase();
  const name = str(formData, "name");
  const password = str(formData, "password");
  const requestedRole = str(formData, "role");
  const role = (SEAT_ROLES as readonly string[]).includes(requestedRole) ? requestedRole : "STAFF";
  if (!email || !name || password.length < 8) {
    throw new Error("Name, email and a password of 8+ characters are required");
  }
  const existing = await db.user.findFirst({ where: { tenantId: tenant.id, email } });
  if (existing) throw new Error("A user with that email already exists");
  await db.user.create({
    data: { tenantId: tenant.id, email, name, role, passwordHash: hashPassword(password) },
  });
  // Seat count changed — when Stripe is live this keeps the subscription in sync.
  await syncSeatQuantity(tenant.id);
  refreshPortal();
}

export async function setUserActive(formData: FormData) {
  const { user: actor, tenant } = await requireOwner();
  const target = await db.user.findFirst({
    where: { id: str(formData, "userId"), tenantId: tenant.id },
  });
  if (!target || target.id === actor.id) throw new Error("Cannot change this user");
  await db.user.update({
    where: { id: target.id },
    data: { active: str(formData, "active") === "true" },
  });
  if ((SEAT_ROLES as readonly string[]).includes(target.role)) {
    await syncSeatQuantity(tenant.id);
  }
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Subscription checkout (owner)
// ---------------------------------------------------------------------------

export async function startCheckout() {
  const { tenant } = await requireOwner();
  if (!stripeEnabled()) throw new Error("Stripe is not configured");
  // Never create a second subscription — a stale tab or the pre-webhook window
  // after checkout would otherwise double-bill the tenant.
  if (tenant.stripeSubscriptionId) redirect("/billing");
  const seats = await seatCount(tenant.id);
  let url: string;
  try {
    url = await createCheckoutSession(tenant.id, seats, `${portalUrl(tenant.slug)}/billing`);
  } catch {
    redirect("/billing"); // already subscribed (race) — nothing to buy
  }
  redirect(url);
}

export async function openBillingPortal() {
  const { tenant } = await requireOwner();
  if (!stripeEnabled()) throw new Error("Stripe is not configured");
  const url = await createBillingPortalSession(tenant.id, `${portalUrl(tenant.slug)}/billing`);
  redirect(url);
}

export async function updateBranding(formData: FormData) {
  const { tenant } = await requireOwner();
  const name = str(formData, "name");
  const brandColor = str(formData, "brandColor");
  if (!name) throw new Error("Name is required");
  if (brandColor && !/^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    throw new Error("Brand color must be a hex value like #4f46e5");
  }
  await db.tenant.update({
    where: { id: tenant.id },
    data: {
      name,
      brandColor: brandColor || tenant.brandColor,
      logoUrl: str(formData, "logoUrl") || null,
      supportEmail: str(formData, "supportEmail") || null,
    },
  });
  refreshPortal();
}

// ---------------------------------------------------------------------------
// Platform admin (us)
// ---------------------------------------------------------------------------

async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "PLATFORM_ADMIN") throw new Error("Not authorized");
  return user;
}

export async function createTenant(formData: FormData) {
  await requirePlatformAdmin();
  const name = str(formData, "name");
  const slug = str(formData, "slug").toLowerCase();
  const ownerName = str(formData, "ownerName");
  const ownerEmail = str(formData, "ownerEmail").toLowerCase();
  const ownerPassword = str(formData, "ownerPassword");

  if (!name || !ownerName || !ownerEmail || ownerPassword.length < 8) {
    throw new Error("All fields are required (password 8+ characters)");
  }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug) || slug === "www" || slug === "admin") {
    throw new Error("Slug must be lowercase letters/numbers/hyphens");
  }
  const existing = await db.tenant.findUnique({ where: { slug } });
  if (existing) throw new Error("That subdomain is taken");

  await db.tenant.create({
    data: {
      name,
      slug,
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000),
      users: {
        create: {
          name: ownerName,
          email: ownerEmail,
          role: "OWNER",
          passwordHash: hashPassword(ownerPassword),
        },
      },
    },
  });
  revalidatePath("/admin");
}

export async function setTenantStatus(formData: FormData) {
  await requirePlatformAdmin();
  const tenant = await db.tenant.findUnique({ where: { id: str(formData, "tenantId") } });
  if (!tenant) throw new Error("Tenant not found");
  const status = str(formData, "status");
  if (!["TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED"].includes(status)) {
    throw new Error("Bad status");
  }
  await db.tenant.update({ where: { id: tenant.id }, data: { planStatus: status } });
  revalidatePath("/admin");
}
