import { PrismaClient, user_role, item_size } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu BrewLite...');

  // ── Xóa dữ liệu cũ theo thứ tự quan hệ khóa ngoại ──
  await prisma.orderItemToppings.deleteMany();
  await prisma.orderItems.deleteMany();
  await prisma.inventoryLogs.deleteMany();
  await prisma.recipeItems.deleteMany();
  await prisma.payments.deleteMany();
  await prisma.orders.deleteMany();
  await prisma.ingredients.deleteMany();
  await prisma.toppings.deleteMany();
  await prisma.products.deleteMany();
  await prisma.promotions.deleteMany();
  await prisma.users.deleteMany();

  // ── 1. Seed Tài khoản người dùng theo RBAC ──
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('admin123', salt);
  const staffPass = await bcrypt.hash('staff123', salt);
  const custPass = await bcrypt.hash('customer123', salt);

  const admin = await prisma.users.create({
    data: {
      email: 'admin@brewlite.vn',
      password_hash: adminPass,
      role: user_role.ADMIN,
      loyalty_points: 100,
    },
  });

  const staff = await prisma.users.create({
    data: {
      email: 'barista@brewlite.vn',
      password_hash: staffPass,
      role: user_role.STAFF,
      loyalty_points: 50,
    },
  });

  const customer = await prisma.users.create({
    data: {
      email: 'customer@brewlite.vn',
      password_hash: custPass,
      role: user_role.CUSTOMER,
      loyalty_points: 20,
    },
  });
  console.log('  ✅ 3 tài khoản RBAC đã tạo (admin@brewlite.vn, barista@brewlite.vn, customer@brewlite.vn)');

  // ── 2. Seed Nguyên liệu kho (Ingredients) ──
  const ingRobusta = await prisma.ingredients.create({
    data: { name: 'Hạt cà phê Robusta Đắk Lắk', unit: 'g', stock_quantity: 10000, min_threshold: 1000, cost_per_unit: 0.2 },
  });
  const ingArabica = await prisma.ingredients.create({
    data: { name: 'Hạt cà phê Arabica Cầu Đất', unit: 'g', stock_quantity: 8000, min_threshold: 800, cost_per_unit: 0.35 },
  });
  const ingCondensedMilk = await prisma.ingredients.create({
    data: { name: 'Sữa đặc Phương Nam', unit: 'ml', stock_quantity: 12000, min_threshold: 1500, cost_per_unit: 0.08 },
  });
  const ingFreshMilk = await prisma.ingredients.create({
    data: { name: 'Sữa tươi thanh trùng Dalat Milk', unit: 'ml', stock_quantity: 20000, min_threshold: 3000, cost_per_unit: 0.04 },
  });
  const ingMatcha = await prisma.ingredients.create({
    data: { name: 'Bột Matcha Uji Nhật Bản', unit: 'g', stock_quantity: 2500, min_threshold: 300, cost_per_unit: 1.2 },
  });
  const ingChocolate = await prisma.ingredients.create({
    data: { name: 'Bột Cacao / Chocolate', unit: 'g', stock_quantity: 3000, min_threshold: 400, cost_per_unit: 0.4 },
  });
  const ingBlackTea = await prisma.ingredients.create({
    data: { name: 'Trà đen Phúc Long', unit: 'g', stock_quantity: 6000, min_threshold: 800, cost_per_unit: 0.15 },
  });
  const ingPeachSyrup = await prisma.ingredients.create({
    data: { name: 'Syrup Đào Monin', unit: 'ml', stock_quantity: 3000, min_threshold: 500, cost_per_unit: 0.12 },
  });
  const ingLycheeSyrup = await prisma.ingredients.create({
    data: { name: 'Syrup Vải Monin', unit: 'ml', stock_quantity: 3000, min_threshold: 500, cost_per_unit: 0.12 },
  });
  const ingCaramel = await prisma.ingredients.create({
    data: { name: 'Sốt Caramel Davinci', unit: 'ml', stock_quantity: 2500, min_threshold: 400, cost_per_unit: 0.18 },
  });
  const ingBobaBlack = await prisma.ingredients.create({
    data: { name: 'Trân châu đen khô', unit: 'g', stock_quantity: 8000, min_threshold: 1000, cost_per_unit: 0.06 },
  });
  const ingBobaWhite = await prisma.ingredients.create({
    data: { name: 'Trân châu trắng 3Q', unit: 'g', stock_quantity: 5000, min_threshold: 800, cost_per_unit: 0.09 },
  });
  const ingRichCream = await prisma.ingredients.create({
    data: { name: 'Kem béo thực vật Rich’s', unit: 'ml', stock_quantity: 5000, min_threshold: 600, cost_per_unit: 0.07 },
  });
  const ingCupS = await prisma.ingredients.create({
    data: { name: 'Ly giấy Size S (350ml)', unit: 'pcs', stock_quantity: 500, min_threshold: 50, cost_per_unit: 800 },
  });
  const ingCupM = await prisma.ingredients.create({
    data: { name: 'Ly giấy Size M (500ml)', unit: 'pcs', stock_quantity: 800, min_threshold: 100, cost_per_unit: 1000 },
  });
  const ingCupL = await prisma.ingredients.create({
    data: { name: 'Ly giấy Size L (700ml)', unit: 'pcs', stock_quantity: 600, min_threshold: 80, cost_per_unit: 1200 },
  });
  console.log('  ✅ 16 nguyên liệu kho đã được tạo');

  // ── 3. Seed Toppings ──
  const topBobaBlack = await prisma.toppings.create({ data: { name: 'Trân châu đen', price: 5000 } });
  const topBobaWhite = await prisma.toppings.create({ data: { name: 'Trân châu trắng', price: 5000 } });
  const topCheeseCream = await prisma.toppings.create({ data: { name: 'Kem phô mai', price: 8000 } });
  const topCoffeeJelly = await prisma.toppings.create({ data: { name: 'Thạch cà phê', price: 6000 } });
  const topPudding = await prisma.toppings.create({ data: { name: 'Pudding trứng', price: 7000 } });
  console.log('  ✅ 5 toppings đã được tạo');

  // Gán công thức cho Topping
  await prisma.recipeItems.createMany({
    data: [
      { topping_id: topBobaBlack.id, ingredient_id: ingBobaBlack.id, amount_needed: 40 },
      { topping_id: topBobaWhite.id, ingredient_id: ingBobaWhite.id, amount_needed: 40 },
      { topping_id: topCheeseCream.id, ingredient_id: ingRichCream.id, amount_needed: 50 },
    ],
  });

  // ── 4. Seed 15 Products ──
  const pCaPheSua = await prisma.products.create({
    data: { name: 'Cà phê sữa', price: 35000, image_url: '/img/ca-phe-sua.jpg', stock: 50 },
  });
  const pAmericano = await prisma.products.create({
    data: { name: 'Americano', price: 40000, image_url: '/img/americano.jpg', stock: 50 },
  });
  const pCappuccino = await prisma.products.create({
    data: { name: 'Cappuccino', price: 45000, image_url: '/img/cappuccino.jpg', stock: 30 },
  });
  const pMatchaLatte = await prisma.products.create({
    data: { name: 'Matcha Latte', price: 50000, image_url: '/img/matcha-latte.jpg', stock: 25 },
  });
  const pTraSua = await prisma.products.create({
    data: { name: 'Trà sữa trân châu', price: 45000, image_url: '/img/tra-sua-tran-chau.jpg', stock: 40 },
  });
  const pCaramelMacchiato = await prisma.products.create({
    data: { name: 'Caramel Macchiato', price: 55000, image_url: '/img/caramel-macchiato.jpg', stock: 20 },
  });
  const pColdBrew = await prisma.products.create({
    data: { name: 'Cold Brew', price: 50000, image_url: '/img/cold-brew.jpg', stock: 15 },
  });
  const pBacXiu = await prisma.products.create({
    data: { name: 'Bạc xỉu', price: 30000, image_url: '/img/bac-xiu.jpg', stock: 50 },
  });
  const pCaPheDen = await prisma.products.create({
    data: { name: 'Cà phê đen đá', price: 30000, image_url: '/img/ca-phe-den-da.jpg', stock: 50 },
  });
  const pCaPheMuoi = await prisma.products.create({
    data: { name: 'Cà phê muối', price: 40000, image_url: '/img/ca-phe-muoi.jpg', stock: 45 },
  });
  const pCaPheTrung = await prisma.products.create({
    data: { name: 'Cà phê trứng', price: 45000, image_url: '/img/ca-phe-trung.jpg', stock: 30 },
  });
  const pTraDao = await prisma.products.create({
    data: { name: 'Trà đào cam sả', price: 45000, image_url: '/img/tra-dao-cam-sa.jpg', stock: 40 },
  });
  const pTraVai = await prisma.products.create({
    data: { name: 'Trà vải hoa hồng', price: 48000, image_url: '/img/tra-vai-hoa-hong.jpg', stock: 35 },
  });
  const pChocoIce = await prisma.products.create({
    data: { name: 'Chocolate Đá Xay', price: 55000, image_url: '/img/chocolate-da-xay.jpg', stock: 25 },
  });
  const pMatchaIce = await prisma.products.create({
    data: { name: 'Matcha Đá Xay', price: 55000, image_url: '/img/matcha-da-xay.jpg', stock: 25 },
  });
  console.log('  ✅ 15 sản phẩm đã được tạo');

  // ── 5. Seed Công thức (RecipeItems) cho từng sản phẩm theo Size ──
  const recipesData = [
    // Cà phê sữa: Robusta + Sữa đặc + Ly
    { product_id: pCaPheSua.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pCaPheSua.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pCaPheSua.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pCaPheSua.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pCaPheSua.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pCaPheSua.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pCaPheSua.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 30 },
    { product_id: pCaPheSua.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 45 },
    { product_id: pCaPheSua.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Bạc xỉu: Robusta + Sữa đặc + Sữa tươi + Ly
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 15 },
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 40 },
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 80 },
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 50 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 100 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 60 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 130 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Cà phê đen đá: Robusta + Ly
    { product_id: pCaPheDen.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 22 },
    { product_id: pCaPheDen.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pCaPheDen.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 28 },
    { product_id: pCaPheDen.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pCaPheDen.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 35 },
    { product_id: pCaPheDen.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Americano: Arabica + Ly
    { product_id: pAmericano.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 18 },
    { product_id: pAmericano.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pAmericano.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pAmericano.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pAmericano.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 28 },
    { product_id: pAmericano.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Cappuccino: Arabica + Sữa tươi + Ly
    { product_id: pCappuccino.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 18 },
    { product_id: pCappuccino.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 120 },
    { product_id: pCappuccino.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pCappuccino.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pCappuccino.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 160 },
    { product_id: pCappuccino.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pCappuccino.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 28 },
    { product_id: pCappuccino.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 200 },
    { product_id: pCappuccino.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Trà sữa trân châu: Trà đen + Sữa đặc + Sữa tươi + Trân châu đen + Ly
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingBlackTea.id, amount_needed: 10 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 80 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingBobaBlack.id, amount_needed: 30 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingBlackTea.id, amount_needed: 15 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 40 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 100 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingBobaBlack.id, amount_needed: 40 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingBlackTea.id, amount_needed: 20 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 50 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 130 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingBobaBlack.id, amount_needed: 50 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Matcha Latte: Bột Matcha + Sữa đặc + Sữa tươi + Ly
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingMatcha.id, amount_needed: 8 },
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 20 },
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 120 },
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingCupS.id, amount_needed: 1 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingMatcha.id, amount_needed: 12 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 150 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingMatcha.id, amount_needed: 16 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 40 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 180 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingCupL.id, amount_needed: 1 },

    // Caramel Macchiato: Arabica + Sữa tươi + Sốt Caramel + Ly
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 150 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingCaramel.id, amount_needed: 25 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },

    // Trà đào cam sả: Trà đen + Syrup Đào + Ly
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingBlackTea.id, amount_needed: 12 },
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingPeachSyrup.id, amount_needed: 35 },
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },

    // Trà vải hoa hồng: Trà đen + Syrup Vải + Ly
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingBlackTea.id, amount_needed: 12 },
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingLycheeSyrup.id, amount_needed: 35 },
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },

    // Chocolate đá xay: Bột Chocolate + Sữa đặc + Sữa tươi + Ly
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingChocolate.id, amount_needed: 25 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 100 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },

    // Matcha đá xay: Bột Matcha + Sữa đặc + Sữa tươi + Ly
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingMatcha.id, amount_needed: 14 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 100 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingCupM.id, amount_needed: 1 },
  ];

  await prisma.recipeItems.createMany({ data: recipesData });
  console.log(`  ✅ ${recipesData.length} định lượng công thức pha chế đã được tạo`);

  // ── 6. Seed Mã khuyến mãi ──
  await prisma.promotions.create({
    data: {
      code: 'WELCOME10',
      discount_amount: 10000,
      is_active: true,
      start_at: new Date('2026-01-01'),
      end_at: new Date('2026-12-31'),
    },
  });
  await prisma.promotions.create({
    data: {
      code: 'SUMMER20',
      discount_amount: 20000,
      is_active: true,
      start_at: new Date('2026-06-01'),
      end_at: new Date('2026-08-31'),
    },
  });
  console.log('  ✅ 2 mã khuyến mãi đã được tạo');

  console.log('\n🎉 Seed dữ liệu BrewLite thành công rực rỡ!');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
