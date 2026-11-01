require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 3000;
const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/freshcart";
const SECRET = process.env.JWT_SECRET || "change-this-secret";
const CATS = [
  "Fruits & Vegetables",
  "Rice, Dals & Pulses",
  "Dairy",
  "Snacks & Bakery",
  "Oils & Spices",
  "Beverages & Household",
];
const STATES = [
  "Tamil Nadu",
  "Kerala",
  "Karnataka",
  "Andhra Pradesh",
  "Telangana",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "West Bengal",
  "Other",
];
const SEED = [
  ["Apples (1 kg)", 0, "🍎", 180, 149, 40],
  ["Bananas (1 dozen)", 0, "🍌", 70, 55, 60],
  ["Tomatoes (1 kg)", 0, "🍅", 50, 38, 0],
  ["Onions (1 kg)", 0, "🧅", 45, 35, 80],
  ["Basmati Rice (5 kg)", 1, "🍚", 620, 540, 30],
  ["Wheat Atta (5 kg)", 1, "🌾", 260, 225, 45],
  ["Toor Dal (1 kg)", 1, "🫘", 170, 148, 35],
  ["Chana (1 kg)", 1, "🥜", 120, 99, 50],
  ["Milk (1 L)", 2, "🥛", 60, 56, 100],
  ["Curd (500 g)", 2, "🥣", 45, 40, 70],
  ["Butter (100 g)", 2, "🧈", 60, 54, 40],
  ["Paneer (200 g)", 2, "🧀", 95, 82, 25],
  ["Potato Chips", 3, "🍟", 30, 25, 120],
  ["Biscuits Pack", 3, "🍪", 40, 32, 90],
  ["Brown Bread", 3, "🍞", 50, 45, 35],
  ["Cake Rusk", 3, "🥐", 70, 59, 3],
  ["Sunflower Oil (1 L)", 4, "🛢️", 165, 139, 60],
  ["Turmeric Powder", 4, "🌶️", 60, 48, 70],
  ["Garam Masala", 4, "🧂", 85, 72, 55],
  ["Red Chilli Powder", 4, "🌶️", 90, 76, 40],
  ["Orange Juice (1 L)", 5, "🧃", 110, 92, 45],
  ["Tea Powder (250 g)", 5, "🍵", 130, 112, 60],
  ["Bath Soap (3 pack)", 5, "🧼", 135, 110, 50],
  ["Dish Wash Liquid", 5, "🧴", 99, 85, 40],
];

/* ---------- MongoDB models ---------- */
const { Schema, model } = mongoose;
const Counter = model(
  "Counter",
  new Schema({ _id: String, seq: { type: Number, default: 0 } }),
);
const nextSeq = async (k) =>
  (
    await Counter.findByIdAndUpdate(
      k,
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    )
  ).seq;
const Product = model(
  "Product",
  new Schema({
    pid: { type: Number, unique: true },
    name: String,
    category: String,
    emoji: String,
    mrp: Number,
    price: Number,
    stock: Number,
  }),
);
const User = model(
  "User",
  new Schema({
    name: String,
    phone: String,
    email: { type: String, unique: true },
    password: String,
    cart: [{ pid: Number, qty: Number, _id: false }],
    wish: [Number],
    created: { type: Date, default: Date.now },
  }),
);
const Admin = model(
  "Admin",
  new Schema({ email: { type: String, unique: true }, password: String }),
);
const Order = model(
  "Order",
  new Schema({
    orderId: { type: String, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: String,
    phone: String,
    addr: String,
    pin: String,
    state: String,
    pay: String,
    sub: Number,
    del: Number,
    total: Number,
    status: { type: Number, default: 0 },
    items: [
      { name: String, emoji: String, qty: Number, price: Number, _id: false },
    ],
    created: { type: Date, default: Date.now },
  }),
);

/* ---------- helpers ---------- */
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const h = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  });
const setToken = (res, payload) =>
  res.cookie("token", jwt.sign(payload, SECRET, { expiresIn: "7d" }), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 7 * 864e5,
  });
const prodOut = (p) => ({
  id: p.pid,
  n: p.name,
  c: p.category,
  e: p.emoji,
  m: p.mrp,
  o: p.price,
  s: p.stock,
});
const orderOut = (o, email) => ({
  id: o.orderId,
  email,
  name: o.name,
  phone: o.phone,
  addr: o.addr,
  pin: o.pin,
  state: o.state,
  pay: o.pay,
  items: o.items.map((i) => ({ n: i.name, e: i.emoji, q: i.qty, o: i.price })),
  sub: o.sub,
  del: o.del,
  total: o.total,
  status: o.status,
  date: o.created.toLocaleString("en-IN"),
});

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  try {
    req.auth = jwt.verify(req.cookies.token, SECRET);
  } catch (e) {
    req.auth = null;
  }
  next();
});
const needUser = (req, res, next) =>
  req.auth && !req.auth.admin ? next() : bad(res, "Please login", 401);
const needAdmin = (req, res, next) =>
  req.auth && req.auth.admin ? next() : bad(res, "Admin only", 403);

/* ---------- auth ---------- */
app.post(
  "/api/register",
  h(async (req, res) => {
    const name = String(req.body.name || "").trim(),
      phone = String(req.body.phone || "").trim();
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      pw = String(req.body.password || "");
    if (name.length < 3) return bad(res, "Enter your full name");
    if (!/^[6-9]\d{9}$/.test(phone))
      return bad(res, "Enter a valid 10-digit phone");
    if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, "Enter a valid email");
    if (pw.length < 6)
      return bad(res, "Password must be at least 6 characters");
    if (await User.findOne({ email }))
      return bad(res, "Email already registered");
    const u = await User.create({
      name,
      phone,
      email,
      password: await bcrypt.hash(pw, 10),
    });
    setToken(res, { id: u._id });
    res.json({ ok: true });
  }),
);

app.post(
  "/api/login",
  h(async (req, res) => {
    const email = String(req.body.email || "")
        .trim()
        .toLowerCase(),
      pw = String(req.body.password || "");
    if (req.body.admin) {
      const a = await Admin.findOne({ email });
      if (!a || !(await bcrypt.compare(pw, a.password)))
        return bad(res, "Wrong admin credentials", 401);
      setToken(res, { id: a._id, admin: true });
    } else {
      const u = await User.findOne({ email });
      if (!u || !(await bcrypt.compare(pw, u.password)))
        return bad(res, "Wrong email or password", 401);
      setToken(res, { id: u._id });
    }
    res.json({ ok: true });
  }),
);

app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

app.get(
  "/api/state",
  h(async (req, res) => {
    if (!req.auth) return bad(res, "Not logged in", 401);
    const products = (await Product.find().sort("pid")).map(prodOut);
    if (req.auth.admin) {
      const orders = (
        await Order.find().sort("created").populate("user", "email")
      ).map((o) => orderOut(o, o.user ? o.user.email : ""));
      const customers = (await User.find().sort("created")).map((u) => ({
        name: u.name,
        email: u.email,
        phone: u.phone,
        date: u.created.toLocaleDateString("en-IN"),
      }));
      return res.json({
        user: { email: "admin@grocery.com", name: "Admin", admin: true },
        products,
        orders,
        customers,
      });
    }
    const u = await User.findById(req.auth.id);
    if (!u) {
      res.clearCookie("token");
      return bad(res, "Not logged in", 401);
    }
    const cart = {};
    u.cart.forEach((c) => {
      cart[c.pid] = c.qty;
    });
    const orders = (await Order.find({ user: u._id }).sort("created")).map(
      (o) => orderOut(o, u.email),
    );
    res.json({
      user: { email: u.email, name: u.name, phone: u.phone },
      products,
      cart,
      wish: u.wish,
      orders,
    });
  }),
);

/* ---------- cart & wishlist ---------- */
app.post(
  "/api/cart",
  needUser,
  h(async (req, res) => {
    const pid = parseInt(req.body.id),
      delta = parseInt(req.body.delta);
    if (isNaN(pid) || isNaN(delta)) return bad(res, "Invalid request");
    const p = await Product.findOne({ pid });
    if (!p) return bad(res, "Product not found", 404);
    const u = await User.findById(req.auth.id);
    const line = u.cart.find((c) => c.pid === pid);
    const n = (line ? line.qty : 0) + delta;
    if (n > p.stock) return bad(res, `Only ${p.stock} in stock`);
    u.cart = u.cart.filter((c) => c.pid !== pid);
    if (n > 0) u.cart.push({ pid, qty: n });
    await u.save();
    res.json({ ok: true });
  }),
);

app.post(
  "/api/cart/remove",
  needUser,
  h(async (req, res) => {
    await User.updateOne(
      { _id: req.auth.id },
      { $pull: { cart: { pid: parseInt(req.body.id) } } },
    );
    res.json({ ok: true });
  }),
);

app.post(
  "/api/wish/:pid",
  needUser,
  h(async (req, res) => {
    const pid = parseInt(req.params.pid),
      u = await User.findById(req.auth.id);
    u.wish = u.wish.includes(pid)
      ? u.wish.filter((x) => x !== pid)
      : [...u.wish, pid];
    await u.save();
    res.json({ ok: true });
  }),
);

/* ---------- orders ---------- */
app.post(
  "/api/order",
  needUser,
  h(async (req, res) => {
    const b = req.body,
      f = (k) => String(b[k] || "").trim();
    const name = f("name"),
      phone = f("phone"),
      addr = f("addr"),
      pin = f("pin"),
      state = f("state"),
      pay = f("pay");
    if (!/^[A-Za-z .]{3,}$/.test(name)) return bad(res, "Enter a valid name");
    if (!/^[6-9]\d{9}$/.test(phone))
      return bad(res, "Enter a valid 10-digit mobile number");
    if (addr.length < 10) return bad(res, "Enter your complete address");
    if (!/^[1-9]\d{5}$/.test(pin))
      return bad(res, "Enter a valid 6-digit pincode");
    if (!STATES.includes(state)) return bad(res, "Select a valid state");
    if (!["Cash on Delivery", "Online Payment (UPI / Card)"].includes(pay))
      return bad(res, "Select a payment method");
    if (!Array.isArray(b.items) || !b.items.length)
      return bad(res, "Your order is empty");
    const lines = [];
    let sub = 0;
    for (const it of b.items) {
      const pid = parseInt(it[0]),
        q = parseInt(it[1]);
      const p = await Product.findOne({ pid });
      if (!p || !(q > 0)) return bad(res, "Invalid item in order");
      if (q > p.stock) return bad(res, `${p.name} has only ${p.stock} left`);
      lines.push({ p, q });
      sub += p.price * q;
    }
    const done = [];
    for (const { p, q } of lines) {
      // atomic stock reduction with rollback
      const r = await Product.updateOne(
        { pid: p.pid, stock: { $gte: q } },
        { $inc: { stock: -q } },
      );
      if (!r.modifiedCount) {
        for (const d of done)
          await Product.updateOne({ pid: d.p.pid }, { $inc: { stock: d.q } });
        return bad(res, `${p.name} just went out of stock`);
      }
      done.push({ p, q });
    }
    const del = sub >= 499 ? 0 : 40;
    const o = await Order.create({
      orderId: "FC" + (100000 + (await nextSeq("order"))),
      user: req.auth.id,
      name,
      phone,
      addr,
      pin,
      state,
      pay,
      sub,
      del,
      total: sub + del,
      items: lines.map(({ p, q }) => ({
        name: p.name,
        emoji: p.emoji,
        qty: q,
        price: p.price,
      })),
    });
    if (b.src === "cart")
      await User.updateOne({ _id: req.auth.id }, { $set: { cart: [] } });
    const u = await User.findById(req.auth.id);
    res.json(orderOut(o, u.email));
  }),
);

/* ---------- admin ---------- */
app.post(
  "/api/admin/order/:id/status",
  needAdmin,
  h(async (req, res) => {
    const s = parseInt(req.body.status);
    if (!(s >= 0 && s <= 4)) return bad(res, "Invalid status");
    await Order.updateOne({ orderId: req.params.id }, { $set: { status: s } });
    res.json({ ok: true });
  }),
);

app.post(
  "/api/admin/product",
  needAdmin,
  h(async (req, res) => {
    const b = req.body,
      name = String(b.n || "").trim(),
      m = Number(b.m),
      o = Number(b.o),
      s = parseInt(b.s),
      id = parseInt(b.id) || 0;
    if (!name || !(m > 0) || !(o > 0) || o > m || !(s >= 0))
      return bad(
        res,
        "Offer price must be <= original price; all fields required",
      );
    const data = {
      name,
      category: CATS.includes(b.c) ? b.c : CATS[0],
      emoji: String(b.e || "🛒").slice(0, 4),
      mrp: m,
      price: o,
      stock: s,
    };
    if (id) await Product.updateOne({ pid: id }, { $set: data });
    else await Product.create({ pid: await nextSeq("product"), ...data });
    res.json({ ok: true });
  }),
);

app.delete(
  "/api/admin/product/:id",
  needAdmin,
  h(async (req, res) => {
    const pid = parseInt(req.params.id);
    await Product.deleteOne({ pid });
    await User.updateMany({}, { $pull: { cart: { pid }, wish: pid } });
    res.json({ ok: true });
  }),
);

/* ---------- start ---------- */
(async () => {
  try {
    await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 5000 });
  } catch (e) {
    console.error("\n❌ Could not connect to MongoDB at: " + MONGO);
    console.error(
      "   Start MongoDB (local service) or put your MongoDB Atlas URI in the .env file.\n",
    );
    process.exit(1);
  }
  if (!(await Product.countDocuments())) {
    for (const [n, k, e, m, o, s] of SEED)
      await Product.create({
        pid: await nextSeq("product"),
        name: n,
        category: CATS[k],
        emoji: e,
        mrp: m,
        price: o,
        stock: s,
      });
    console.log("Sample products added");
  }
  if (!(await Admin.countDocuments())) {
    await Admin.create({
      email: "admin@grocery.com",
      password: await bcrypt.hash("admin123", 10),
    });
    console.log("Admin created: admin@grocery.com / admin123");
  }
  app.listen(PORT, () =>
    console.log(`\n✅ FreshCart running at http://localhost:${PORT}\n`),
  );
})();
