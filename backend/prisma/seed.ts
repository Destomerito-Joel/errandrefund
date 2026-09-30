import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const customers = [
  ['Ava Martinez', 'ava.martinez@example.com'],
  ['Noah Bennett', 'noah.bennett@example.com'],
  ['Mia Chen', 'mia.chen@example.com'],
  ['Liam Brooks', 'liam.brooks@example.com'],
  ['Sofia Patel', 'sofia.patel@example.com'],
  ['Ethan Rivera', 'ethan.rivera@example.com'],
  ['Isabella Wright', 'isabella.wright@example.com'],
  ['Lucas Kim', 'lucas.kim@example.com'],
  ['Amelia Foster', 'amelia.foster@example.com'],
  ['Oliver Davis', 'oliver.davis@example.com'],
  ['Harper Nguyen', 'harper.nguyen@example.com'],
  ['Elijah Turner', 'elijah.turner@example.com'],
  ['Charlotte Reed', 'charlotte.reed@example.com'],
  ['James Cooper', 'james.cooper@example.com'],
  ['Grace Morgan', 'grace.morgan@example.com'],
] as const;

const products = [
  { name: 'Everyday Cotton Crew Tee', sku: 'APP-TEE-01', quantity: 1 },
  { name: 'Insulated Travel Tumbler', sku: 'HOME-TMB-14', quantity: 1 },
  { name: 'Canvas Weekend Tote', sku: 'BAG-TOT-08', quantity: 1 },
  { name: 'Wireless Charging Stand', sku: 'ELEC-CHG-22', quantity: 1 },
  { name: 'Merino Blend Scarf', sku: 'APP-SCF-06', quantity: 1 },
  { name: 'Ceramic Pour-over Set', sku: 'HOME-COF-11', quantity: 1 },
];

async function main(): Promise<void> {
  const customerRows = await Promise.all(customers.map(([name, email]) =>
    prisma.customer.upsert({ where: { email }, create: { name, email }, update: { name } }),
  ));
  const now = new Date();
  const scenarios = [
    { days: 5, total: 89.99, finalSale: false },
    { days: 25, total: 145.5, finalSale: false },
    { days: 31, total: 72, finalSale: false },
    { days: 60, total: 220, finalSale: false },
    { days: 4, total: 629.99, finalSale: false },
    { days: 12, total: 58.5, finalSale: true },
    { days: 8, total: 119.95, finalSale: false },
    { days: 18, total: 340, finalSale: false },
    { days: 2, total: 24.99, finalSale: false },
    { days: 28, total: 499.99, finalSale: false },
    { days: 35, total: 510, finalSale: true },
    { days: 6, total: 76, finalSale: false },
    { days: 15, total: 205, finalSale: false },
    { days: 9, total: 39.5, finalSale: false },
    { days: 7, total: 560, finalSale: false },
    { days: 22, total: 132, finalSale: false },
    { days: 5, total: 84, finalSale: false },
    { days: 26, total: 300, finalSale: false },
    { days: 31, total: 95, finalSale: false },
    { days: 10, total: 74, finalSale: true },
    { days: 3, total: 145, finalSale: false },
    { days: 14, total: 250, finalSale: false },
    { days: 60, total: 480, finalSale: false },
    { days: 25, total: 510, finalSale: false },
    { days: 5, total: 65, finalSale: false },
    { days: 17, total: 190, finalSale: false },
    { days: 11, total: 88, finalSale: false },
    { days: 23, total: 315, finalSale: false },
    { days: 31, total: 160, finalSale: false },
    { days: 5, total: 54, finalSale: false },
    { days: 30, total: 500, finalSale: false },
    { days: 1, total: 650, finalSale: false },
    { days: 12, total: 98, finalSale: false },
    { days: 27, total: 405, finalSale: false },
    { days: 8, total: 120, finalSale: false },
    { days: 19, total: 87, finalSale: false },
    { days: 24, total: 260, finalSale: false },
    { days: 3, total: 48, finalSale: false },
    { days: 13, total: 179, finalSale: false },
    { days: 29, total: 325, finalSale: false },
    { days: 7, total: 112, finalSale: false },
    { days: 16, total: 230, finalSale: false },
  ] as const;

  const orders = await Promise.all(scenarios.map((scenario, index) => {
    const product = products[index % products.length]!;
    const customer = customerRows[index % customerRows.length]!;
    const deliveredAt = new Date(now.getTime() - scenario.days * 86_400_000);
    return prisma.order.upsert({
      where: { orderNumber: `ORD-${String(10421 + index)}` },
      create: {
        customerId: customer.id,
        orderNumber: `ORD-${String(10421 + index)}`,
        items: [{ ...product, unitPrice: scenario.total }],
        total: scenario.total,
        deliveredAt,
        finalSale: scenario.finalSale,
        status: index === 14 ? 'REFUNDED' : 'DELIVERED',
      },
      update: {},
    });
  }));

  // Seed recent prior requests to exercise the three-request escalation threshold.
  const frequentRefundCustomer = customerRows[2]!;
  for (let index = 0; index < 3; index += 1) {
    const message = `Seeded historical request ${index + 1}`;
    const existing = await prisma.refundRequest.findFirst({ where: { customerEmail: frequentRefundCustomer.email, message } });
    if (!existing) await prisma.refundRequest.create({
      data: {
        customerEmail: frequentRefundCustomer.email,
        orderNumber: orders[[2, 17, 32][index]!]!.orderNumber,
        message,
        decision: 'APPROVED',
        reasonCodes: ['ELIGIBLE_WITHIN_WINDOW'],
        aiReply: 'Your historical refund request was approved.',
        status: 'RESOLVED',
        createdAt: new Date(now.getTime() - (index + 2) * 86_400_000),
      },
    });
  }

  const damageMessage = 'Seeded historical damaged-item request';
  const existingDamageRequest = await prisma.refundRequest.findFirst({ where: { message: damageMessage } });
  if (!existingDamageRequest) await prisma.refundRequest.create({
    data: {
      customerEmail: customerRows[0]!.email,
      orderNumber: orders[0]!.orderNumber,
      message: damageMessage,
      decision: 'APPROVED',
      reasonCodes: ['DAMAGED_OR_INCORRECT'],
      aiReply: 'Your historical refund was approved.',
      status: 'RESOLVED',
      createdAt: new Date(now.getTime() - 45 * 86_400_000),
    },
  });

  console.info(`Seeded ${customerRows.length} customers, ${orders.length} orders, and 4 historical requests.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());