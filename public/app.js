const mem = {};
const ld = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : (mem[k] ?? d);
  } catch (e) {
    return mem[k] ?? d;
  }
};
const sv = (k, v) => {
  mem[k] = v;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};
const CATS = [
  "Fruits & Vegetables",
  "Rice, Dals & Pulses",
  "Dairy",
  "Snacks & Bakery",
  "Oils & Spices",
  "Beverages & Household",
];
let P = [],
  DB = { cart: {}, wish: [], orders: [], customers: [] };
const ADMIN = { email: "admin@grocery.com", pass: "admin123" };
let S = {
  v: "home",
  cat: "All",
  q: "",
  u: null,
  mode: "login",
  co: null,
  last: null,
  tab: "orders",
};
const U = () => DB.customers,
  O = () => DB.orders;
const cart = () => DB.cart,
  wish = () => DB.wish;
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const pid = (i) => P.find((p) => p.id == i);
const ST = ["Placed", "Confirmed", "Packed", "Out for Delivery", "Delivered"];
const $ = (s) => document.querySelector(s);
const val = (i) => ($("#" + i) || { value: "" }).value.trim();
const err = (i, m) => {
  const e = $("#e_" + i);
  if (e) e.textContent = m || "";
  return !!m;
};
function go(v) {
  S.v = v;
  render();
  scrollTo(0, 0);
}
function logout() {
  S.u = null;
  sv("gm_sess", null);
  S.mode = "login";
  go("home");
}
function render() {
  const a = $("#app");
  if (!S.u) {
    a.innerHTML = authV();
    return;
  }
  if (S.u.admin) {
    a.innerHTML = hdr() + "<main>" + adminV() + "</main>";
    return;
  }
  const n = Object.values(cart()).reduce((x, y) => x + y, 0);
  a.innerHTML =
    hdr(n) +
    "<main>" +
    (
      {
        home: homeV,
        cart: cartV,
        wish: wishV,
        checkout: coV,
        orders: ordV,
        done: doneV,
      }[S.v] || homeV
    )() +
    "</main>";
  if (S.v === "home") grid();
}
function hdr(n) {
  if (S.u.admin)
    return `<header><b>🛒 FreshCart Admin</b><button onclick="logout()">Logout</button></header>`;
  return `<header><b>🛒 FreshCart</b><button onclick="go('home')">Home</button><button onclick="go('wish')">♥ ${wish().length}</button><button onclick="go('cart')">Cart ${n}</button><button onclick="go('orders')">My Orders</button><button onclick="logout()">Logout</button></header>`;
}
/* AUTH */
function authV() {
  const m = S.mode;
  return `<div class="auth card"><h2 style="text-align:center">🛒 FreshCart</h2><div class="tabs">
 ${["login", "register", "admin"].map((t) => `<button class="b ${m === t ? "" : "g"}" onclick="S.mode='${t}';render()">${t === "admin" ? "Admin" : t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
 ${m === "register" ? `<label>Full name</label><input id="name"><small class="er" id="e_name"></small><label>Phone</label><input id="phone" inputmode="numeric"><small class="er" id="e_phone"></small>` : ""}
 <label>Email</label><input id="email" type="email" value="${m === "admin" ? ADMIN.email : ""}"><small class="er" id="e_email"></small>
 <label>Password</label><input id="pass" type="password"><small class="er" id="e_pass"></small>
 <button class="b" style="width:100%;margin-top:8px" onclick="auth()">${m === "register" ? "Create account" : "Login"}</button>
 ${m === "admin" ? '<p style="font-size:12px;color:var(--mu)">Demo admin: admin@grocery.com / admin123</p>' : ""}</div>`;
}
function auth() {
  const m = S.mode,
    email = val("email").toLowerCase(),
    pass = val("pass");
  let bad = 0;
  bad |= err(
    "email",
    /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email",
  );
  bad |= err("pass", pass.length >= 6 ? "" : "Minimum 6 characters");
  if (m === "register") {
    bad |= err("name", val("name").length >= 3 ? "" : "Enter your full name");
    bad |= err(
      "phone",
      /^[6-9]\d{9}$/.test(val("phone")) ? "" : "Enter a valid 10-digit phone",
    );
    if (bad) return;
    const us = U();
    if (us.some((u) => u.email === email))
      return err("email", "Email already registered") || 0;
    us.push({
      name: val("name"),
      phone: val("phone"),
      email,
      pass,
      date: new Date().toLocaleDateString("en-IN"),
    });
    sv("gm_users", us);
    S.u = { email, name: val("name"), phone: val("phone") };
  } else if (m === "admin") {
    if (bad) return;
    if (email !== ADMIN.email || pass !== ADMIN.pass)
      return err("pass", "Wrong admin credentials") || 0;
    S.u = { email, name: "Admin", admin: true };
  } else {
    if (bad) return;
    const u = U().find((u) => u.email === email && u.pass === pass);
    if (!u) return err("pass", "Wrong email or password") || 0;
    S.u = { email, name: u.name, phone: u.phone };
  }
  sv("gm_sess", S.u);
  S.v = "home";
  render();
}
/* HOME */
function homeV() {
  return `<div class="ban"><h2>Hello, ${esc(S.u.name.split(" ")[0])}! 👋</h2>Fresh groceries delivered fast. Free delivery above ₹499 · Up to 25% off today.</div>
 <input placeholder="🔍 Search groceries…" value="${esc(S.q)}" oninput="S.q=this.value;grid()">
 <div class="chips">${["All", ...CATS].map((c) => `<button class="${S.cat === c ? "on" : ""}" onclick="S.cat=this.textContent;render()">${c}</button>`).join("")}</div>
 <h3>${S.cat === "All" ? "Featured products" : esc(S.cat)}</h3><div class="grid" id="grid"></div>`;
}
function grid() {
  const w = wish(),
    q = S.q.toLowerCase();
  let l = P.filter(
    (p) => (S.cat === "All" || p.c === S.cat) && p.n.toLowerCase().includes(q),
  );
  if (S.cat === "All" && !q)
    l = l
      .slice()
      .sort((a, b) => (b.m - b.o) / b.m - (a.m - a.o) / a.m)
      .slice(0, 12);
  $("#grid").innerHTML = l.length
    ? l
        .map((p) => {
          const d = Math.round(((p.m - p.o) / p.m) * 100);
          return `<div class="card p"><button class="h" onclick="tw(${p.id})">${w.includes(p.id) ? "❤️" : "🤍"}</button><div class="e">${p.e}</div><b>${esc(p.n)}</b>
 <div><span class="off">${fmt(p.o)}</span> <span class="old">${fmt(p.m)}</span><span class="tag">${d}% off</span></div>
 <small style="color:${p.s > 0 ? (p.s < 10 ? "var(--ac)" : "var(--pr)") : "var(--er)"}">${p.s > 0 ? (p.s < 10 ? "Only " + p.s + " left" : "In stock") : "Out of stock"}</small>
 <div class="row"><button class="b g" ${p.s ? "" : "disabled"} onclick="add(${p.id})">Add to cart</button><button class="b o" ${p.s ? "" : "disabled"} onclick="buy(${p.id})">Buy Now</button></div></div>`;
        })
        .join("")
    : "<p>No products found.</p>";
}
function tw(i) {
  let w = wish();
  w = w.includes(i) ? w.filter((x) => x !== i) : [...w, i];
  sv(wishK(), w);
  S.v === "home" ? (grid(), hd()) : render();
}
function hd() {
  const h = document.querySelector("header");
  h.outerHTML = hdr(Object.values(cart()).reduce((x, y) => x + y, 0));
}
function add(i) {
  const c = cart(),
    p = pid(i);
  if ((c[i] || 0) >= p.s) return alert("Only " + p.s + " in stock");
  c[i] = (c[i] || 0) + 1;
  sv(cartK(), c);
  S.v === "home" ? hd() : render();
}
function qty(i, d) {
  const c = cart(),
    p = pid(i);
  const n = (c[i] || 0) + d;
  if (n > p.s) return alert("Only " + p.s + " in stock");
  if (n <= 0) delete c[i];
  else c[i] = n;
  sv(cartK(), c);
  render();
}
function rm(i) {
  const c = cart();
  delete c[i];
  sv(cartK(), c);
  render();
}
/* CART & WISHLIST */
const lines = (items) =>
  items.map(([i, q]) => ({ p: pid(i), q })).filter((x) => x.p);
const tot = (ls) => {
  const sub = ls.reduce((s, x) => s + x.p.o * x.q, 0),
    mrp = ls.reduce((s, x) => s + x.p.m * x.q, 0),
    del = sub >= 499 || !sub ? 0 : 40;
  return { sub, mrp, sv: mrp - sub, del, t: sub + del };
};
function sumV(t) {
  return `<div class="row sp"><span>Original price</span><span>${fmt(t.mrp)}</span></div><div class="row sp"><span>Offer price</span><span>${fmt(t.sub)}</span></div><div class="row sp off"><span>You save</span><span>${fmt(t.sv)}</span></div><div class="row sp"><span>Delivery</span><span>${t.del ? fmt(t.del) : "FREE"}</span></div><hr><div class="row sp"><b>Total</b><b>${fmt(t.t)}</b></div>`;
}
function cartV() {
  const ls = lines(Object.entries(cart()));
  if (!ls.length)
    return '<div class="card">Your cart is empty. <button class="b" onclick="go(\'home\')">Shop now</button></div>';
  const t = tot(ls);
  return `<h3>Your cart</h3><div class="two"><div>${ls.map((x) => `<div class="card row sp" style="margin-bottom:8px"><span style="font-size:32px">${x.p.e}</span><div style="flex:1"><b>${esc(x.p.n)}</b><br><span class="off">${fmt(x.p.o)}</span> <span class="old">${fmt(x.p.m)}</span></div><div class="q row"><button onclick="qty(${x.p.id},-1)">−</button><b>${x.q}</b><button onclick="qty(${x.p.id},1)">+</button></div><button class="b g" onclick="rm(${x.p.id})">Remove</button></div>`).join("")}</div>
 <div class="card">${sumV(t)}<button class="b" style="width:100%;margin-top:10px" onclick="S.co={items:Object.entries(cart()),src:'cart'};go('checkout')">Proceed to checkout</button></div></div>`;
}
function wishV() {
  const w = wish();
  return (
    `<h3>Wishlist</h3>` +
    (w.length
      ? `<div class="grid">${w
          .map((i) => pid(i))
          .filter(Boolean)
          .map(
            (p) =>
              `<div class="card p"><div class="e">${p.e}</div><b>${esc(p.n)}</b><span class="off">${fmt(p.o)}</span><div class="row"><button class="b g" ${p.s ? "" : "disabled"} onclick="add(${p.id})">Add to cart</button><button class="b g" onclick="tw(${p.id})">Remove</button></div></div>`,
          )
          .join("")}</div>`
      : '<div class="card">No favourites yet.</div>')
  );
}
function buy(i) {
  S.co = { items: [[i, 1]], src: "buy" };
  go("checkout");
}
/* CHECKOUT */
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
function coV() {
  const ls = lines(S.co.items);
  const t = tot(ls);
  return `<h3>Checkout</h3><div class="two"><div class="card"><label>Full name</label><input id="name" value="${esc(S.u.name)}"><small class="er" id="e_name"></small>
 <label>Phone number</label><input id="phone" inputmode="numeric" value="${esc(S.u.phone || "")}"><small class="er" id="e_phone"></small>
 <label>Complete delivery address</label><textarea id="addr" rows="3"></textarea><small class="er" id="e_addr"></small>
 <div class="two" style="gap:8px"><div><label>Pincode</label><input id="pin" inputmode="numeric" maxlength="6"><small class="er" id="e_pin"></small></div>
 <div><label>State</label><select id="state"><option value="">Select</option>${STATES.map((s) => `<option>${s}</option>`).join("")}</select><small class="er" id="e_state"></small></div></div>
 <label>Payment method</label><select id="pay"><option>Cash on Delivery</option><option>Online Payment (UPI / Card)</option></select></div>
 <div class="card"><b>Order summary</b>${ls.map((x) => `<div class="row sp"><span>${x.p.e} ${esc(x.p.n)} × ${x.q}</span><span>${fmt(x.p.o * x.q)}</span></div>`).join("")}<hr>${sumV(t)}
 <button class="b" style="width:100%;margin-top:10px" onclick="place()">Place Order</button></div></div>`;
}
function place() {
  let bad = 0;
  bad |= err(
    "name",
    /^[A-Za-z .]{3,}$/.test(val("name"))
      ? ""
      : "Enter a valid name (letters only)",
  );
  bad |= err(
    "phone",
    /^[6-9]\d{9}$/.test(val("phone"))
      ? ""
      : "Enter a valid 10-digit mobile number",
  );
  bad |= err(
    "addr",
    val("addr").length >= 10
      ? ""
      : "Enter your complete address (min 10 characters)",
  );
  bad |= err(
    "pin",
    /^[1-9]\d{5}$/.test(val("pin")) ? "" : "Enter a valid 6-digit pincode",
  );
  bad |= err("state", val("state") ? "" : "Select a state");
  if (bad) return;
  const ls = lines(S.co.items);
  for (const x of ls)
    if (x.q > x.p.s) return alert(x.p.n + " has only " + x.p.s + " left");
  const t = tot(ls),
    os = O();
  const o = {
    id: "FC" + (100001 + os.length),
    email: S.u.email,
    items: ls.map((x) => ({ n: x.p.n, e: x.p.e, q: x.q, o: x.p.o })),
    name: val("name"),
    phone: val("phone"),
    addr: val("addr"),
    pin: val("pin"),
    state: val("state"),
    pay: val("pay"),
    sub: t.sub,
    del: t.del,
    total: t.t,
    status: 0,
    date: new Date().toLocaleString("en-IN"),
  };
  os.push(o);
  sv("gm_orders", os);
  ls.forEach((x) => (x.p.s -= x.q));
  sv("gm_p", P);
  if (S.co.src === "cart") sv(cartK(), {});
  S.last = o;
  go("done");
}
const tlV = (s) =>
  `<div class="tl">${ST.map((x, i) => `<div class="${i <= s ? "d" : ""}">${x}</div>`).join("")}</div>`;
const ordCard = (
  o,
) => `<div class="card" style="margin-bottom:10px"><div class="row sp"><b>Order ${o.id}</b><span>${o.date}</span></div>${tlV(o.status)}
 <div>${o.items.map((i) => `${i.e} ${esc(i.n)} × ${i.q}`).join(", ")}</div><div>Amount: <b>${fmt(o.total)}</b> · ${esc(o.pay)}</div>
 <div style="color:var(--mu)">Deliver to: ${esc(o.name)}, ${esc(o.addr)}, ${esc(o.state)} - ${o.pin} · ${o.phone}</div><div>Status: <b class="off">${ST[o.status]}</b></div></div>`;
function doneV() {
  return `<div class="card" style="text-align:center"><h2>✅ Order placed!</h2><p>Your order number is <b>${S.last.id}</b></p></div><div style="height:10px"></div>${ordCard(S.last)}<button class="b" onclick="go('home')">Continue shopping</button>`;
}
function ordV() {
  const l = O()
    .filter((o) => o.email === S.u.email)
    .reverse();
  return (
    `<h3>My orders</h3>` +
    (l.length
      ? l.map(ordCard).join("")
      : '<div class="card">No orders yet.</div>')
  );
}
/* ADMIN */
function adminV() {
  const tb = ["orders", "customers", "products", "summary"];
  return (
    `<div class="chips">${tb.map((t) => `<button class="${S.tab === t ? "on" : ""}" onclick="S.tab='${t}';render()">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>` +
    { orders: aOrd, customers: aCus, products: aPro, summary: aSum }[S.tab]()
  );
}
function aOrd() {
  const os = O().slice().reverse();
  return `<div class="card wrap"><table><tr><th>Order</th><th>Customer &amp; delivery</th><th>Items</th><th>Total</th><th>Status</th></tr>${os.map((o) => `<tr><td>${o.id}<br><small>${o.date}</small></td><td>${esc(o.name)} · ${o.phone}<br><small>${esc(o.addr)}, ${esc(o.state)} - ${o.pin}</small></td><td>${o.items.map((i) => esc(i.n) + " × " + i.q).join("<br>")}</td><td>${fmt(o.total)}<br><small>${esc(o.pay)}</small></td><td><select onchange="setSt('${o.id}',this.value)">${ST.map((s, i) => `<option value="${i}" ${i === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`).join("") || "<tr><td>No orders yet</td></tr>"}</table></div>`;
}
function setSt(id, v) {
  const os = O();
  os.find((o) => o.id === id).status = +v;
  sv("gm_orders", os);
}
function aCus() {
  const us = U();
  return `<div class="card wrap"><table><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Orders</th></tr>${us.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.phone}</td><td>${u.date}</td><td>${O().filter((o) => o.email === u.email).length}</td></tr>`).join("") || "<tr><td>No customers yet</td></tr>"}</table></div>`;
}
function aPro() {
  return `<div class="card"><b id="ft">Add product</b><input type="hidden" id="pid"><div class="two" style="gap:8px"><div><label>Name</label><input id="pn"></div><div><label>Category</label><select id="pc">${CATS.map((c) => `<option>${c}</option>`).join("")}</select></div>
 <div><label>Emoji icon</label><input id="pe" value="🛒"></div><div><label>Original price (₹)</label><input id="pm" type="number"></div><div><label>Offer price (₹)</label><input id="po" type="number"></div><div><label>Stock</label><input id="ps" type="number"></div></div>
 <small class="er" id="e_pf"></small><button class="b" onclick="saveP()">Save product</button></div><div style="height:10px"></div>
 <div class="card wrap"><table><tr><th></th><th>Product</th><th>MRP</th><th>Offer</th><th>Stock</th><th></th></tr>${P.map((p) => `<tr><td>${p.e}</td><td>${esc(p.n)}<br><small>${p.c}</small></td><td>${fmt(p.m)}</td><td>${fmt(p.o)}</td><td>${p.s}</td><td class="row"><button class="b g" onclick="editP(${p.id})">Edit</button><button class="b g" onclick="delP(${p.id})">Delete</button></td></tr>`).join("")}</table></div>`;
}
function editP(i) {
  const p = pid(i);
  $("#ft").textContent = "Edit product";
  $("#pid").value = i;
  $("#pn").value = p.n;
  $("#pc").value = p.c;
  $("#pe").value = p.e;
  $("#pm").value = p.m;
  $("#po").value = p.o;
  $("#ps").value = p.s;
  scrollTo(0, 0);
}
function saveP() {
  const n = val("pn"),
    m = +val("pm"),
    o = +val("po"),
    s = +val("ps");
  if (!n || !(m > 0) || !(o > 0) || o > m || !(s >= 0) || val("ps") === "")
    return (
      err("pf", "Fill all fields; offer price must be ≤ original price.") || 0
    );
  const id = +val("pid"),
    d = { n, c: val("pc"), e: val("pe") || "🛒", m, o, s };
  if (id) Object.assign(pid(id), d);
  else P.push({ id: Math.max(0, ...P.map((p) => p.id)) + 1, ...d });
  sv("gm_p", P);
  render();
}
function delP(i) {
  if (confirm("Delete this product?")) {
    P = P.filter((p) => p.id !== i);
    sv("gm_p", P);
    render();
  }
}
function aSum() {
  const os = O(),
    rev = os.reduce((s, o) => s + o.total, 0),
    low = P.filter((p) => p.s < 10);
  const box = (l, v) =>
    `<div class="card"><div style="color:var(--mu)">${l}</div><div class="stat">${v}</div></div>`;
  return `<div class="grid">${box("Total orders", os.length)}${box("Total sales", fmt(rev))}${box("Customers", U().length)}${box("Delivered", os.filter((o) => o.status === 4).length)}${box("Pending", os.filter((o) => o.status < 4).length)}${box("Avg. order", fmt(os.length ? Math.round(rev / os.length) : 0))}</div>
 <div class="card" style="margin-top:10px"><b>Low stock (under 10)</b><br>${low.map((p) => `${p.e} ${esc(p.n)}: ${p.s}`).join("<br>") || "None"}</div>`;
}

/* ===== Full-stack API layer: overrides the earlier functions ===== */
async function api(path, method = "GET", body) {
  const r = await fetch("/api/" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  let d = {};
  try {
    d = await r.json();
  } catch (e) {}
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}
async function sync() {
  const d = await api("state");
  S.u = d.user;
  P = d.products;
  DB = {
    cart: d.cart || {},
    wish: d.wish || [],
    orders: d.orders || [],
    customers: d.customers || [],
  };
}
async function boot() {
  try {
    await sync();
  } catch (e) {
    S.u = null;
  }
  render();
}
function logout() {
  api("logout", "POST").finally(() => {
    S.u = null;
    S.mode = "login";
    S.v = "home";
    render();
  });
}
async function auth() {
  const m = S.mode,
    email = val("email").toLowerCase(),
    pass = val("pass");
  let bad = 0;
  bad |= err(
    "email",
    /^\S+@\S+\.\S+$/.test(email) ? "" : "Enter a valid email",
  );
  bad |= err("pass", pass.length >= 6 ? "" : "Minimum 6 characters");
  if (m === "register") {
    bad |= err("name", val("name").length >= 3 ? "" : "Enter your full name");
    bad |= err(
      "phone",
      /^[6-9]\d{9}$/.test(val("phone")) ? "" : "Enter a valid 10-digit phone",
    );
  }
  if (bad) return;
  try {
    if (m === "register")
      await api("register", "POST", {
        name: val("name"),
        phone: val("phone"),
        email,
        password: pass,
      });
    else
      await api("login", "POST", {
        email,
        password: pass,
        admin: m === "admin",
      });
    await sync();
    S.v = "home";
    render();
  } catch (e) {
    err(m === "register" ? "email" : "pass", e.message);
  }
}
async function tw(i) {
  try {
    await api("wish/" + i, "POST");
    await sync();
    S.v === "home" ? (grid(), hd()) : render();
  } catch (e) {
    alert(e.message);
  }
}
async function add(i) {
  try {
    await api("cart", "POST", { id: i, delta: 1 });
    await sync();
    S.v === "home" ? hd() : render();
  } catch (e) {
    alert(e.message);
  }
}
async function qty(i, d) {
  try {
    await api("cart", "POST", { id: i, delta: d });
    await sync();
    render();
  } catch (e) {
    alert(e.message);
  }
}
async function rm(i) {
  try {
    await api("cart/remove", "POST", { id: i });
    await sync();
    render();
  } catch (e) {
    alert(e.message);
  }
}
async function place() {
  let bad = 0;
  bad |= err(
    "name",
    /^[A-Za-z .]{3,}$/.test(val("name"))
      ? ""
      : "Enter a valid name (letters only)",
  );
  bad |= err(
    "phone",
    /^[6-9]\d{9}$/.test(val("phone"))
      ? ""
      : "Enter a valid 10-digit mobile number",
  );
  bad |= err(
    "addr",
    val("addr").length >= 10
      ? ""
      : "Enter your complete address (min 10 characters)",
  );
  bad |= err(
    "pin",
    /^[1-9]\d{5}$/.test(val("pin")) ? "" : "Enter a valid 6-digit pincode",
  );
  bad |= err("state", val("state") ? "" : "Select a state");
  if (bad) return;
  try {
    const o = await api("order", "POST", {
      items: S.co.items,
      src: S.co.src,
      name: val("name"),
      phone: val("phone"),
      addr: val("addr"),
      pin: val("pin"),
      state: val("state"),
      pay: val("pay"),
    });
    await sync();
    S.last = o;
    go("done");
  } catch (e) {
    alert(e.message);
  }
}
async function setSt(id, v) {
  try {
    await api("admin/order/" + id + "/status", "POST", { status: +v });
    await sync();
  } catch (e) {
    alert(e.message);
    render();
  }
}
async function saveP() {
  const n = val("pn"),
    m = +val("pm"),
    o = +val("po"),
    s = +val("ps");
  if (!n || !(m > 0) || !(o > 0) || o > m || !(s >= 0) || val("ps") === "")
    return (
      err("pf", "Fill all fields; offer price must be ≤ original price.") || 0
    );
  try {
    await api("admin/product", "POST", {
      id: +val("pid") || 0,
      n,
      c: val("pc"),
      e: val("pe") || "🛒",
      m,
      o,
      s,
    });
    await sync();
    render();
  } catch (e) {
    err("pf", e.message);
  }
}
async function delP(i) {
  if (confirm("Delete this product?")) {
    try {
      await api("admin/product/" + i, "DELETE");
      await sync();
      render();
    } catch (e) {
      alert(e.message);
    }
  }
}
boot();
