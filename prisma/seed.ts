// Demo data: platform admin, an ACTIVE tenant ("Acme Digital" at acme.<root>)
// with clients + a technician + scheduled visits, and a second tenant on a
// free trial ("BrightPath Coaching" at bright.<root>).
// Appointments use relative dates so "Today" always has content.
// All demo passwords are listed in the README.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const hash = (pw: string) => bcrypt.hashSync(pw, 10);

const now = new Date();
/** Local date at hh:mm, shifted by dayOffset days. */
const at = (dayOffset: number, hh: number, mm = 0) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hh, mm);

async function main() {
  const existing = await db.tenant.findUnique({ where: { slug: "acme" } });
  if (existing) {
    console.log("Seed data already present — skipping. Delete prisma/dev.db to reseed.");
    return;
  }

  const admin = await db.user.findFirst({
    where: { tenantId: null, email: "admin@platform.local" },
  });
  if (!admin) {
    await db.user.create({
      data: {
        email: "admin@platform.local",
        name: "Platform Admin",
        role: "PLATFORM_ADMIN",
        passwordHash: hash("admin1234"),
      },
    });
  }

  // --- Acme Digital: established, ACTIVE tenant ---------------------------
  const tenant = await db.tenant.create({
    data: {
      slug: "acme",
      name: "Acme Digital",
      brandColor: "#0d9488",
      supportEmail: "help@acmedigital.example",
      planStatus: "ACTIVE",
    },
  });

  const [owner, staff, tech] = await Promise.all([
    db.user.create({
      data: {
        tenantId: tenant.id,
        email: "owner@acme.local",
        name: "Alex Rivera",
        role: "OWNER",
        passwordHash: hash("owner1234"),
      },
    }),
    db.user.create({
      data: {
        tenantId: tenant.id,
        email: "staff@acme.local",
        name: "Sam Chen",
        role: "STAFF",
        passwordHash: hash("staff1234"),
      },
    }),
    db.user.create({
      data: {
        tenantId: tenant.id,
        email: "tech@acme.local",
        name: "Jordan Lee",
        role: "TECH",
        passwordHash: hash("tech1234"),
      },
    }),
  ]);

  const northwind = await db.clientCompany.create({
    data: {
      tenantId: tenant.id,
      name: "Northwind Traders",
      contactName: "Maria Anders",
      contactEmail: "maria@northwind.example",
      address: "412 Harbor Ave, Portland, OR",
    },
  });
  const contoso = await db.clientCompany.create({
    data: {
      tenantId: tenant.id,
      name: "Contoso Coffee",
      contactName: "Ben Walters",
      contactEmail: "ben@contoso.example",
      address: "88 Roastery Row, Portland, OR",
    },
  });

  const clientUser = await db.user.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      email: "client@northwind.local",
      name: "Maria Anders",
      role: "CLIENT",
      passwordHash: hash("client1234"),
    },
  });
  await db.user.create({
    data: {
      tenantId: tenant.id,
      companyId: contoso.id,
      email: "client@contoso.local",
      name: "Ben Walters",
      role: "CLIENT",
      passwordHash: hash("client1234"),
    },
  });

  const website = await db.project.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      name: "Website redesign",
      description: "Full redesign of northwind.example with a new CMS and analytics.",
      dueDate: at(64, 0),
      milestones: {
        create: [
          { title: "Discovery & sitemap", done: true, sortOrder: 0 },
          { title: "Design system & homepage comps", done: true, sortOrder: 1 },
          { title: "CMS build-out", done: false, dueDate: at(20, 0), sortOrder: 2 },
          { title: "Content migration", done: false, sortOrder: 3 },
          { title: "Launch", done: false, dueDate: at(64, 0), sortOrder: 4 },
        ],
      },
    },
  });
  await db.project.create({
    data: {
      tenantId: tenant.id,
      companyId: contoso.id,
      name: "Local SEO campaign",
      description: "Rank Contoso Coffee in the top 3 map pack for 12 target keywords.",
      milestones: {
        create: [
          { title: "Keyword research", done: true, sortOrder: 0 },
          { title: "GBP optimization", done: true, sortOrder: 1 },
          { title: "Citation cleanup", done: false, sortOrder: 2 },
        ],
      },
    },
  });

  await db.deliverable.createMany({
    data: [
      {
        tenantId: tenant.id,
        companyId: northwind.id,
        projectId: website.id,
        title: "Homepage design comps (v2)",
        description: "Desktop + mobile comps with the revised hero.",
        linkUrl: "https://example.com/figma/northwind-home",
        status: "DELIVERED",
        deliveredAt: at(-11, 10),
      },
      {
        tenantId: tenant.id,
        companyId: northwind.id,
        projectId: website.id,
        title: "Brand photography shot list",
        status: "APPROVED",
        deliveredAt: at(-30, 10),
      },
      {
        tenantId: tenant.id,
        companyId: contoso.id,
        title: "June SEO audit PDF",
        linkUrl: "https://example.com/reports/contoso-june",
        status: "IN_PROGRESS",
      },
    ],
  });

  // Tickets — #1 assigned to the technician so the field portal has real work.
  const ticket1 = await db.ticket.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      subject: "Contact form not sending emails",
      status: "IN_PROGRESS",
      priority: "HIGH",
      createdById: clientUser.id,
      assignedToId: tech.id,
      messages: {
        create: [
          {
            authorId: clientUser.id,
            body: "Hi team — submissions from the contact page stopped arriving in our inbox on Tuesday. Can you take a look?",
          },
          {
            authorId: staff.id,
            body: "Thanks for flagging, Maria. We traced it to an expired SMTP key — Jordan will verify the fix during today's on-site visit.",
          },
        ],
      },
    },
  });
  await db.ticket.create({
    data: {
      tenantId: tenant.id,
      companyId: contoso.id,
      subject: "Add new seasonal menu page",
      status: "OPEN",
      priority: "NORMAL",
      createdById: owner.id,
      messages: {
        create: [
          { authorId: owner.id, body: "Ben requested a fall menu landing page by end of August. Scoping this week." },
        ],
      },
    },
  });
  const ticket3 = await db.ticket.create({
    data: {
      tenantId: tenant.id,
      companyId: contoso.id,
      subject: "Espresso bar POS terminal offline",
      status: "OPEN",
      priority: "URGENT",
      createdById: staff.id,
      assignedToId: tech.id,
      messages: {
        create: [
          {
            authorId: staff.id,
            body: "Ben called — the POS at the espresso bar won't reconnect to Wi-Fi since this morning. Needs someone on site today.",
          },
        ],
      },
    },
  });

  // Field schedule for Jordan (relative dates keep "Today" populated).
  await db.appointment.createMany({
    data: [
      {
        tenantId: tenant.id,
        companyId: contoso.id,
        ticketId: ticket3.id,
        techId: tech.id,
        title: "POS terminal repair — espresso bar",
        notes: "Ask for Ben. Spare router in the van; check switch port 7 first.",
        address: "88 Roastery Row, Portland, OR",
        scheduledStart: at(0, 9, 30),
        scheduledEnd: at(0, 11, 0),
        status: "EN_ROUTE",
      },
      {
        tenantId: tenant.id,
        companyId: northwind.id,
        ticketId: ticket1.id,
        techId: tech.id,
        title: "Verify contact-form fix on site",
        address: "412 Harbor Ave, Portland, OR",
        scheduledStart: at(0, 14, 0),
        scheduledEnd: at(0, 15, 0),
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        companyId: contoso.id,
        techId: tech.id,
        title: "Seasonal menu photo shoot setup",
        notes: "Bring lighting kit.",
        address: "88 Roastery Row, Portland, OR",
        scheduledStart: at(1, 10, 0),
        scheduledEnd: at(1, 12, 0),
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        companyId: northwind.id,
        techId: tech.id,
        title: "Quarterly network maintenance",
        address: "412 Harbor Ave, Portland, OR",
        scheduledStart: at(4, 9, 0),
        scheduledEnd: at(4, 13, 0),
        status: "SCHEDULED",
      },
      {
        tenantId: tenant.id,
        companyId: northwind.id,
        techId: tech.id,
        title: "Router replacement — front office",
        address: "412 Harbor Ave, Portland, OR",
        scheduledStart: at(-1, 14, 0),
        scheduledEnd: at(-1, 15, 30),
        status: "COMPLETED",
      },
    ],
  });

  await db.order.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      title: "August retainer + photography add-on",
      notes: "Retainer per MSA; photography is a one-time add-on for the redesign.",
      status: "PENDING",
      items: {
        create: [
          { description: "Monthly marketing retainer — August", quantity: 1, unitPriceCents: 250000 },
          { description: "On-site product photography (half day)", quantity: 1, unitPriceCents: 85000 },
        ],
      },
    },
  });
  await db.order.create({
    data: {
      tenantId: tenant.id,
      companyId: contoso.id,
      title: "Q3 SEO sprint",
      status: "IN_PROGRESS",
      items: {
        create: [{ description: "SEO sprint (July–Sept)", quantity: 3, unitPriceCents: 120000 }],
      },
    },
  });

  await db.report.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      title: "June performance report",
      periodLabel: "June 2026",
      publishedAt: at(-9, 9),
      body: [
        "Highlights",
        "• Organic sessions up 18% month-over-month (42.3k total).",
        "• Contact-form conversions: 312 (+9%).",
        "• Homepage redesign comps delivered and awaiting your approval.",
        "",
        "What we did",
        "We completed the design system for the new site, shipped v2 homepage comps, and began CMS build-out. The blog migration plan is drafted and scheduled for early August.",
        "",
        "Next month",
        "CMS build-out completes, content migration begins, and we'll share a staging link for your review in the portal.",
      ].join("\n"),
    },
  });
  await db.report.create({
    data: {
      tenantId: tenant.id,
      companyId: northwind.id,
      title: "July performance report (draft)",
      periodLabel: "July 2026",
      body: "Draft — numbers land after month end.",
    },
  });

  // --- BrightPath Coaching: fresh tenant on a 14-day trial ----------------
  await db.tenant.create({
    data: {
      slug: "bright",
      name: "BrightPath Coaching",
      brandColor: "#db2777",
      planStatus: "TRIAL",
      trialEndsAt: at(10, 12),
      users: {
        create: {
          email: "owner@bright.local",
          name: "Priya Shah",
          role: "OWNER",
          passwordHash: hash("owner1234"),
        },
      },
    },
  });

  console.log("Seeded demo data:");
  console.log("  Platform admin:  admin@platform.local / admin1234   (http://localhost:3000/admin)");
  console.log("  Tenant owner:    owner@acme.local / owner1234       (http://acme.localhost:3000)");
  console.log("  Tenant staff:    staff@acme.local / staff1234");
  console.log("  Technician:      tech@acme.local / tech1234         (mobile field portal)");
  console.log("  Client login:    client@northwind.local / client1234");
  console.log("  Trial tenant:    owner@bright.local / owner1234     (http://bright.localhost:3000)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
