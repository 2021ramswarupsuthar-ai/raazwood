import { prisma } from '@/server/db';
import { requireCustomer } from '@/server/customer-auth';
import OrderList from '@/components/OrderList';

export default async function AccountOrders() {
  const c = await requireCustomer('/account/orders');
  const orders = await prisma.order.findMany({
    where: { customerId: c.id },
    include: { items: { select: { productName: true, qty: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Your orders</h1>
      <div className="mt-4"><OrderList orders={orders} /></div>
    </div>
  );
}
