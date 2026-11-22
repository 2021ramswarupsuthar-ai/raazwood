// Seeds categories, SAMPLE products and the first admin user.
// SAMPLE products use placeholder prices/photos: replace them from /admin before launch.
// Run: npm run db:seed   (needs DATABASE_URL, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD)
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = [
  { slug: 'beds', name: 'Beds', description: 'Solid sheesham wood beds in king, queen and single sizes.', sortOrder: 1 },
  { slug: 'sofas', name: 'Sofas', description: 'Wooden-frame sofa sets for your living room.', sortOrder: 2 },
  { slug: 'dining-sets', name: 'Dining sets', description: 'Dining tables and chairs in solid sheesham wood.', sortOrder: 3 },
  { slug: 'wardrobes', name: 'Wardrobes', description: 'Spacious solid wood wardrobes and storage.', sortOrder: 4 },
  { slug: 'tables', name: 'Tables', description: 'Coffee tables, console tables and study tables.', sortOrder: 5 },
  { slug: 'chairs', name: 'Chairs & stools', description: 'Chairs, stools and benches in sheesham wood.', sortOrder: 6 },
];

type SeedProduct = { slug: string; name: string; cat: string; short: string; dims: string; featured?: boolean; variants: { sku: string; label: string; pack?: number; mrp: number; price: number; stock: number; ship: number }[] };

const products: SeedProduct[] = [
  { slug: 'sample-sheesham-king-bed', name: 'SAMPLE Sheesham King Size Bed', cat: 'beds', short: 'Solid sheesham wood king size bed with headboard.', dims: '82 x 72 x 38 in', featured: true, variants: [{ sku: 'SMP-BED-K', label: 'King (6 x 6.5 ft)', mrp: 55000, price: 42000, stock: 5, ship: 3000 }, { sku: 'SMP-BED-Q', label: 'Queen (5 x 6.5 ft)', mrp: 48000, price: 37000, stock: 5, ship: 3000 }] },
  { slug: 'sample-sheesham-three-seater-sofa', name: 'SAMPLE Three Seater Sofa', cat: 'sofas', short: 'Wooden-frame three seater sofa.', dims: '72 x 30 x 34 in', featured: true, variants: [{ sku: 'SMP-SOFA-3', label: 'Three seater', mrp: 38000, price: 29500, stock: 4, ship: 2500 }] },
  { slug: 'sample-sheesham-dining-set-6', name: 'SAMPLE Six Seater Dining Set', cat: 'dining-sets', short: 'Dining table with six chairs.', dims: 'Table 72 x 36 x 30 in', featured: true, variants: [{ sku: 'SMP-DIN-6', label: 'Table + 6 chairs', mrp: 52000, price: 41000, stock: 3, ship: 4000 }] },
  { slug: 'sample-sheesham-wardrobe', name: 'SAMPLE Three Door Wardrobe', cat: 'wardrobes', short: 'Three door wardrobe with drawers.', dims: '72 x 22 x 78 in', variants: [{ sku: 'SMP-WRD-3', label: 'Three door', mrp: 46000, price: 35500, stock: 3, ship: 3500 }] },
  { slug: 'sample-sheesham-coffee-table', name: 'SAMPLE Coffee Table', cat: 'tables', short: 'Solid wood coffee table.', dims: '42 x 24 x 18 in', featured: true, variants: [{ sku: 'SMP-CT-1', label: 'Single', mrp: 9000, price: 6800, stock: 10, ship: 800 }, { sku: 'SMP-CT-2', label: 'Set of 2', pack: 2, mrp: 17000, price: 12500, stock: 6, ship: 1400 }] },
  { slug: 'sample-sheesham-stool', name: 'SAMPLE Wooden Stool', cat: 'chairs', short: 'Sturdy solid wood stool.', dims: '16 x 16 x 18 in', variants: [{ sku: 'SMP-STL-1', label: 'Single', mrp: 2500, price: 1800, stock: 20, ship: 300 }, { sku: 'SMP-STL-2', label: 'Set of 2', pack: 2, mrp: 4800, price: 3300, stock: 12, ship: 500 }] },
];

async function main() {
  for (const c of categories) await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  const cats = new Map((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.product.create({
      data: {
        slug: p.slug, name: p.name, categoryId: cats.get(p.cat)!, shortDesc: p.short, description: `${p.short}\nSample listing: replace this text, price and photos from the admin panel.`,
        dimensions: p.dims, finish: 'Natural polish', features: ['Solid sheesham wood', 'Sample data'], isFeatured: p.featured ?? false, images: [],
        variants: { create: p.variants.map((v) => ({ sku: v.sku, label: v.label, packQty: v.pack ?? 1, mrpPaise: v.mrp * 100, pricePaise: v.price * 100, stock: v.stock, shippingPaise: v.ship * 100 })) },
      },
    });
  }

  const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD;
  if (email && password) {
    if (password.length < 10) throw new Error('ADMIN_SEED_PASSWORD must be at least 10 characters');
    await prisma.adminUser.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Admin user ready: ${email}`);
  } else {
    console.log('Skipped admin user (set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD).');
  }
  console.log('Seed complete.');
}

main().finally(() => prisma.$disconnect());
