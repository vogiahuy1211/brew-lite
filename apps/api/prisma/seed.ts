import { PrismaClient, user_role, item_size } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Bắt đầu seed lại dữ liệu chuẩn cho BrewLite...');

  // ── Xóa dữ liệu cũ theo thứ tự quan hệ khóa ngoại ──
  await prisma.cartItemToppings.deleteMany();
  await prisma.cartItems.deleteMany();
  await prisma.carts.deleteMany();
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

  await prisma.users.create({
    data: {
      email: 'admin@brewlite.vn',
      password_hash: adminPass,
      role: user_role.ADMIN,
      loyalty_points: 100,
    },
  });

  await prisma.users.create({
    data: {
      email: 'barista@brewlite.vn',
      password_hash: staffPass,
      role: user_role.STAFF,
      loyalty_points: 50,
    },
  });

  await prisma.users.create({
    data: {
      email: 'customer@brewlite.vn',
      password_hash: custPass,
      role: user_role.CUSTOMER,
      loyalty_points: 20,
    },
  });
  console.log('  ✅ 3 tài khoản RBAC đã tạo (admin@brewlite.vn, barista@brewlite.vn, customer@brewlite.vn)');

  // ── 2. Seed Nguyên liệu kho chuẩn F&B (Ingredients) ──
  const ingRobusta = await prisma.ingredients.create({
    data: { name: 'Hạt cà phê Robusta Đắk Lắk', unit: 'g', stock_quantity: 15000, min_threshold: 1500, cost_per_unit: 0.2 },
  });
  const ingArabica = await prisma.ingredients.create({
    data: { name: 'Hạt cà phê Arabica Cầu Đất', unit: 'g', stock_quantity: 12000, min_threshold: 1200, cost_per_unit: 0.35 },
  });
  const ingCondensedMilk = await prisma.ingredients.create({
    data: { name: 'Sữa đặc Phương Nam', unit: 'ml', stock_quantity: 15000, min_threshold: 2000, cost_per_unit: 0.08 },
  });
  const ingFreshMilk = await prisma.ingredients.create({
    data: { name: 'Sữa tươi thanh trùng Dalat Milk', unit: 'ml', stock_quantity: 25000, min_threshold: 3000, cost_per_unit: 0.04 },
  });
  const ingRichCream = await prisma.ingredients.create({
    data: { name: 'Kem béo thực vật Rich’s', unit: 'ml', stock_quantity: 8000, min_threshold: 1000, cost_per_unit: 0.07 },
  });
  const ingMatcha = await prisma.ingredients.create({
    data: { name: 'Bột Matcha Uji Nhật Bản', unit: 'g', stock_quantity: 3000, min_threshold: 400, cost_per_unit: 1.2 },
  });
  const ingChocolate = await prisma.ingredients.create({
    data: { name: 'Bột Cacao nguyên chất', unit: 'g', stock_quantity: 4000, min_threshold: 500, cost_per_unit: 0.4 },
  });
  const ingBlackTea = await prisma.ingredients.create({
    data: { name: 'Trà đen Phúc Long', unit: 'g', stock_quantity: 8000, min_threshold: 1000, cost_per_unit: 0.15 },
  });
  const ingJasmineTea = await prisma.ingredients.create({
    data: { name: 'Trà lài tự nhiên', unit: 'g', stock_quantity: 6000, min_threshold: 800, cost_per_unit: 0.16 },
  });
  const ingPeachSyrup = await prisma.ingredients.create({
    data: { name: 'Syrup Đào Monin', unit: 'ml', stock_quantity: 4000, min_threshold: 500, cost_per_unit: 0.12 },
  });
  const ingLycheeSyrup = await prisma.ingredients.create({
    data: { name: 'Syrup Vải Monin', unit: 'ml', stock_quantity: 4000, min_threshold: 500, cost_per_unit: 0.12 },
  });
  const ingCaramel = await prisma.ingredients.create({
    data: { name: 'Sốt Caramel Davinci', unit: 'ml', stock_quantity: 3500, min_threshold: 500, cost_per_unit: 0.18 },
  });
  const ingSugarSyrup = await prisma.ingredients.create({
    data: { name: 'Nước đường mía pha chế', unit: 'ml', stock_quantity: 15000, min_threshold: 2000, cost_per_unit: 0.03 },
  });
  const ingSaltCream = await prisma.ingredients.create({
    data: { name: 'Kem béo vị muối biển', unit: 'ml', stock_quantity: 5000, min_threshold: 800, cost_per_unit: 0.15 },
  });
  const ingEggCream = await prisma.ingredients.create({
    data: { name: 'Kem trứng bông mịn', unit: 'ml', stock_quantity: 5000, min_threshold: 800, cost_per_unit: 0.16 },
  });
  const ingBobaBlack = await prisma.ingredients.create({
    data: { name: 'Trân châu đen khô', unit: 'g', stock_quantity: 10000, min_threshold: 1200, cost_per_unit: 0.06 },
  });
  const ingBobaWhite = await prisma.ingredients.create({
    data: { name: 'Trân châu trắng 3Q', unit: 'g', stock_quantity: 8000, min_threshold: 1000, cost_per_unit: 0.09 },
  });
  const ingPudding = await prisma.ingredients.create({
    data: { name: 'Bột pudding trứng', unit: 'g', stock_quantity: 4000, min_threshold: 500, cost_per_unit: 0.12 },
  });
  const ingCoffeeJelly = await prisma.ingredients.create({
    data: { name: 'Thạch rau câu cà phê', unit: 'g', stock_quantity: 5000, min_threshold: 600, cost_per_unit: 0.1 },
  });
  console.log('  ✅ 19 nguyên liệu kho chuẩn F&B đã được tạo');

  // ── 3. Seed Toppings ──
  const topBobaBlack = await prisma.toppings.create({ data: { name: 'Trân châu đen', price: 5000 } });
  const topBobaWhite = await prisma.toppings.create({ data: { name: 'Trân châu trắng', price: 5000 } });
  const topCheeseCream = await prisma.toppings.create({ data: { name: 'Kem phô mai', price: 8000 } });
  const topCoffeeJelly = await prisma.toppings.create({ data: { name: 'Thạch cà phê', price: 6000 } });
  const topPudding = await prisma.toppings.create({ data: { name: 'Pudding trứng', price: 7000 } });
  console.log('  ✅ 5 toppings đã được tạo');

  // Định lượng cho Topping
  await prisma.recipeItems.createMany({
    data: [
      { topping_id: topBobaBlack.id, ingredient_id: ingBobaBlack.id, amount_needed: 40 },
      { topping_id: topBobaWhite.id, ingredient_id: ingBobaWhite.id, amount_needed: 40 },
      { topping_id: topCheeseCream.id, ingredient_id: ingRichCream.id, amount_needed: 40 },
      { topping_id: topCoffeeJelly.id, ingredient_id: ingCoffeeJelly.id, amount_needed: 40 },
      { topping_id: topPudding.id, ingredient_id: ingPudding.id, amount_needed: 35 },
    ],
  });

  // ── 4. Seed 15 Sản phẩm Đồ uống (Products) ──
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
    data: { name: 'Trà vải hoa hồng', price: 48000, image_url: '/img/tra-vai.jpg', stock: 35 },
  });
  const pChocoIce = await prisma.products.create({
    data: { name: 'Chocolate Đá Xay', price: 55000, image_url: '/img/chocolate-da-xay.jpg', stock: 25 },
  });
  const pMatchaIce = await prisma.products.create({
    data: { name: 'Matcha Đá Xay', price: 55000, image_url: '/img/matcha-da-xay.jpg', stock: 25 },
  });
  console.log('  ✅ 15 sản phẩm đã được tạo');

  // ── 5. Seed Công thức (RecipeItems) cho toàn bộ 15 sản phẩm theo cả 3 Size S, M, L ──
  const recipesData = [
    // 1. Cà phê sữa (Robusta + Sữa đặc)
    { product_id: pCaPheSua.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pCaPheSua.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pCaPheSua.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pCaPheSua.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pCaPheSua.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 30 },
    { product_id: pCaPheSua.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 45 },

    // 2. Cà phê đen đá (Robusta + Nước đường)
    { product_id: pCaPheDen.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 22 },
    { product_id: pCaPheDen.id, size: item_size.S, ingredient_id: ingSugarSyrup.id, amount_needed: 10 },
    { product_id: pCaPheDen.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 28 },
    { product_id: pCaPheDen.id, size: item_size.M, ingredient_id: ingSugarSyrup.id, amount_needed: 15 },
    { product_id: pCaPheDen.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 35 },
    { product_id: pCaPheDen.id, size: item_size.L, ingredient_id: ingSugarSyrup.id, amount_needed: 20 },

    // 3. Bạc xỉu (Robusta + Sữa đặc + Sữa tươi)
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 15 },
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pBacXiu.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 70 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 40 },
    { product_id: pBacXiu.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 90 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 50 },
    { product_id: pBacXiu.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 120 },

    // 4. Americano (Hạt Arabica)
    { product_id: pAmericano.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 18 },
    { product_id: pAmericano.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pAmericano.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 28 },

    // 5. Cappuccino (Arabica + Sữa tươi)
    { product_id: pCappuccino.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 18 },
    { product_id: pCappuccino.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 120 },
    { product_id: pCappuccino.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pCappuccino.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 160 },
    { product_id: pCappuccino.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 28 },
    { product_id: pCappuccino.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 200 },

    // 6. Caramel Macchiato (Arabica + Sữa tươi + Sốt Caramel)
    { product_id: pCaramelMacchiato.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 18 },
    { product_id: pCaramelMacchiato.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 120 },
    { product_id: pCaramelMacchiato.id, size: item_size.S, ingredient_id: ingCaramel.id, amount_needed: 15 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 22 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 150 },
    { product_id: pCaramelMacchiato.id, size: item_size.M, ingredient_id: ingCaramel.id, amount_needed: 25 },
    { product_id: pCaramelMacchiato.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 28 },
    { product_id: pCaramelMacchiato.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 190 },
    { product_id: pCaramelMacchiato.id, size: item_size.L, ingredient_id: ingCaramel.id, amount_needed: 35 },

    // 7. Cold Brew (Arabica ngâm ủ lạnh)
    { product_id: pColdBrew.id, size: item_size.S, ingredient_id: ingArabica.id, amount_needed: 20 },
    { product_id: pColdBrew.id, size: item_size.M, ingredient_id: ingArabica.id, amount_needed: 25 },
    { product_id: pColdBrew.id, size: item_size.L, ingredient_id: ingArabica.id, amount_needed: 32 },

    // 8. Cà phê muối (Robusta + Sữa đặc + Kem béo vị muối biển)
    { product_id: pCaPheMuoi.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pCaPheMuoi.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 20 },
    { product_id: pCaPheMuoi.id, size: item_size.S, ingredient_id: ingSaltCream.id, amount_needed: 35 },
    { product_id: pCaPheMuoi.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pCaPheMuoi.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pCaPheMuoi.id, size: item_size.M, ingredient_id: ingSaltCream.id, amount_needed: 50 },
    { product_id: pCaPheMuoi.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 30 },
    { product_id: pCaPheMuoi.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pCaPheMuoi.id, size: item_size.L, ingredient_id: ingSaltCream.id, amount_needed: 65 },

    // 9. Cà phê trứng (Robusta + Sữa đặc + Kem trứng)
    { product_id: pCaPheTrung.id, size: item_size.S, ingredient_id: ingRobusta.id, amount_needed: 20 },
    { product_id: pCaPheTrung.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 20 },
    { product_id: pCaPheTrung.id, size: item_size.S, ingredient_id: ingEggCream.id, amount_needed: 40 },
    { product_id: pCaPheTrung.id, size: item_size.M, ingredient_id: ingRobusta.id, amount_needed: 25 },
    { product_id: pCaPheTrung.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pCaPheTrung.id, size: item_size.M, ingredient_id: ingEggCream.id, amount_needed: 55 },
    { product_id: pCaPheTrung.id, size: item_size.L, ingredient_id: ingRobusta.id, amount_needed: 30 },
    { product_id: pCaPheTrung.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pCaPheTrung.id, size: item_size.L, ingredient_id: ingEggCream.id, amount_needed: 70 },

    // 10. Trà sữa trân châu (Trà đen + Sữa tươi + Sữa đặc + Trân châu đen)
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingBlackTea.id, amount_needed: 10 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 80 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pTraSua.id, size: item_size.S, ingredient_id: ingBobaBlack.id, amount_needed: 30 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingBlackTea.id, amount_needed: 15 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 110 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pTraSua.id, size: item_size.M, ingredient_id: ingBobaBlack.id, amount_needed: 40 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingBlackTea.id, amount_needed: 20 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 140 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 45 },
    { product_id: pTraSua.id, size: item_size.L, ingredient_id: ingBobaBlack.id, amount_needed: 50 },

    // 11. Trà đào cam sả (Trà đen + Syrup Đào + Nước đường mía)
    { product_id: pTraDao.id, size: item_size.S, ingredient_id: ingBlackTea.id, amount_needed: 10 },
    { product_id: pTraDao.id, size: item_size.S, ingredient_id: ingPeachSyrup.id, amount_needed: 25 },
    { product_id: pTraDao.id, size: item_size.S, ingredient_id: ingSugarSyrup.id, amount_needed: 10 },
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingBlackTea.id, amount_needed: 14 },
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingPeachSyrup.id, amount_needed: 35 },
    { product_id: pTraDao.id, size: item_size.M, ingredient_id: ingSugarSyrup.id, amount_needed: 15 },
    { product_id: pTraDao.id, size: item_size.L, ingredient_id: ingBlackTea.id, amount_needed: 18 },
    { product_id: pTraDao.id, size: item_size.L, ingredient_id: ingPeachSyrup.id, amount_needed: 45 },
    { product_id: pTraDao.id, size: item_size.L, ingredient_id: ingSugarSyrup.id, amount_needed: 20 },

    // 12. Trà vải hoa hồng (Trà lài + Syrup Vải + Nước đường mía)
    { product_id: pTraVai.id, size: item_size.S, ingredient_id: ingJasmineTea.id, amount_needed: 10 },
    { product_id: pTraVai.id, size: item_size.S, ingredient_id: ingLycheeSyrup.id, amount_needed: 25 },
    { product_id: pTraVai.id, size: item_size.S, ingredient_id: ingSugarSyrup.id, amount_needed: 10 },
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingJasmineTea.id, amount_needed: 14 },
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingLycheeSyrup.id, amount_needed: 35 },
    { product_id: pTraVai.id, size: item_size.M, ingredient_id: ingSugarSyrup.id, amount_needed: 15 },
    { product_id: pTraVai.id, size: item_size.L, ingredient_id: ingJasmineTea.id, amount_needed: 18 },
    { product_id: pTraVai.id, size: item_size.L, ingredient_id: ingLycheeSyrup.id, amount_needed: 45 },
    { product_id: pTraVai.id, size: item_size.L, ingredient_id: ingSugarSyrup.id, amount_needed: 20 },

    // 13. Matcha Latte (Bột Matcha + Sữa tươi + Sữa đặc)
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingMatcha.id, amount_needed: 8 },
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 120 },
    { product_id: pMatchaLatte.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 20 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingMatcha.id, amount_needed: 12 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 150 },
    { product_id: pMatchaLatte.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 30 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingMatcha.id, amount_needed: 16 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 180 },
    { product_id: pMatchaLatte.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 40 },

    // 14. Chocolate Đá Xay (Bột Cacao + Sữa tươi + Sữa đặc + Kem béo)
    { product_id: pChocoIce.id, size: item_size.S, ingredient_id: ingChocolate.id, amount_needed: 20 },
    { product_id: pChocoIce.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 80 },
    { product_id: pChocoIce.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pChocoIce.id, size: item_size.S, ingredient_id: ingRichCream.id, amount_needed: 20 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingChocolate.id, amount_needed: 28 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 110 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pChocoIce.id, size: item_size.M, ingredient_id: ingRichCream.id, amount_needed: 30 },
    { product_id: pChocoIce.id, size: item_size.L, ingredient_id: ingChocolate.id, amount_needed: 35 },
    { product_id: pChocoIce.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 140 },
    { product_id: pChocoIce.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 45 },
    { product_id: pChocoIce.id, size: item_size.L, ingredient_id: ingRichCream.id, amount_needed: 40 },

    // 15. Matcha Đá Xay (Bột Matcha + Sữa tươi + Sữa đặc + Kem béo)
    { product_id: pMatchaIce.id, size: item_size.S, ingredient_id: ingMatcha.id, amount_needed: 10 },
    { product_id: pMatchaIce.id, size: item_size.S, ingredient_id: ingFreshMilk.id, amount_needed: 80 },
    { product_id: pMatchaIce.id, size: item_size.S, ingredient_id: ingCondensedMilk.id, amount_needed: 25 },
    { product_id: pMatchaIce.id, size: item_size.S, ingredient_id: ingRichCream.id, amount_needed: 20 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingMatcha.id, amount_needed: 14 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingFreshMilk.id, amount_needed: 110 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingCondensedMilk.id, amount_needed: 35 },
    { product_id: pMatchaIce.id, size: item_size.M, ingredient_id: ingRichCream.id, amount_needed: 30 },
    { product_id: pMatchaIce.id, size: item_size.L, ingredient_id: ingMatcha.id, amount_needed: 18 },
    { product_id: pMatchaIce.id, size: item_size.L, ingredient_id: ingFreshMilk.id, amount_needed: 140 },
    { product_id: pMatchaIce.id, size: item_size.L, ingredient_id: ingCondensedMilk.id, amount_needed: 45 },
    { product_id: pMatchaIce.id, size: item_size.L, ingredient_id: ingRichCream.id, amount_needed: 40 },
  ];

  await prisma.recipeItems.createMany({ data: recipesData });
  console.log(`  ✅ ${recipesData.length} định lượng công thức pha chế chuẩn cho 15 sản phẩm đã được tạo`);

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

  console.log('\n🎉 Seed dữ liệu BrewLite chuẩn F&B thành công rực rỡ!');
}

main()
  .catch((e) => {
    console.error('❌ Seed thất bại:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
