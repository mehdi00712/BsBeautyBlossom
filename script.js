// =========================
// NAVBAR TOGGLE
// =========================
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    const expanded = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", String(!expanded));
    navLinks.classList.toggle("show");
  });
}

// =========================
// CART SYSTEM (localStorage)
// =========================
const CART_KEY = "bbb_cart_v2";
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");

function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(){ return cart.reduce((n,i)=>n + (i.qty||0), 0); }
function updateCartCount(){
  const el = document.getElementById("cart-count");
  if (el) el.textContent = String(cartCount());
}

// Called from product cards ("Add to Cart" button)
function addToCart(name, btn){
  const card = btn.closest(".product");
  const select = card.querySelector(".size-select");
  const qtyEl = card.querySelector(".qty");
  const img = card.querySelector("img");

  const sizeLabel = select?.value || "Default";
  const unitPrice = Number(select?.selectedOptions[0]?.dataset?.price || 0);
  const qty = Number(qtyEl?.textContent || 1);

  if (!name || !unitPrice || qty <= 0) {
    alert("Please select a size and quantity.");
    return;
  }

  const id = `${name}__${sizeLabel}`;
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += qty;
  else cart.push({ id, name, sizeLabel, unitPrice, qty, imageURL: img?.src || "" });

  saveCart();
  updateCartCount();
  btn.textContent = "Added ✓";
  setTimeout(()=>btn.textContent="Add to Cart", 1200);
}

// Quantity +/- handler for product cards and cart table
document.addEventListener("click", (e)=>{
  const plus = e.target.closest(".plus");
  const minus = e.target.closest(".minus");
  if (plus || minus){
    const wrap = e.target.closest(".product") || e.target.closest("tr");
    const q = wrap?.querySelector(".qty");
    if (q){
      let v = Number(q.textContent||1);
      if (plus) v++;
      if (minus) v = Math.max(1, v-1);
      q.textContent = String(v);
    }
  }
});

// =========================
// CART PAGE RENDER + TOTALS
// =========================
function formatRs(n){ return `Rs${(Number(n)||0).toFixed(2)}`; }

function displayCart(){
  const tbody = document.getElementById("cart-body");
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");

  if (!tbody) return;
  tbody.innerHTML = "";
  if (!cart.length){
    tbody.innerHTML = '<tr><td colspan="6">Your cart is empty.</td></tr>';
    if (subtotalEl) subtotalEl.textContent = formatRs(0);
    if (shippingEl) shippingEl.textContent = formatRs(0);
    if (totalEl) totalEl.textContent = formatRs(0);
    return;
  }

  let subtotal = 0;
  cart.forEach((item)=>{
    subtotal += item.unitPrice * item.qty;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${item.imageURL||""}" alt="" /></td>
      <td><strong>${item.name}</strong><br/><span class="badge">${item.sizeLabel}</span></td>
      <td>${formatRs(item.unitPrice)}</td>
      <td class="qty-cell">
        <button class="minus btn muted" type="button">–</button>
        <span class="qty">${item.qty}</span>
        <button class="plus btn muted" type="button">+</button>
      </td>
      <td>${formatRs(item.unitPrice * item.qty)}</td>
      <td><button class="btn danger remove" data-id="${item.id}">Remove</button></td>
    `;
    tbody.appendChild(tr);

    tr.querySelector(".minus").addEventListener("click", ()=>{
      const i = cart.findIndex(it=>it.id===item.id);
      if (i>=0){ cart[i].qty = Math.max(1, cart[i].qty-1); saveCart(); displayCart(); updateCartCount(); }
    });
    tr.querySelector(".plus").addEventListener("click", ()=>{
      const i = cart.findIndex(it=>it.id===item.id);
      if (i>=0){ cart[i].qty += 1; saveCart(); displayCart(); updateCartCount(); }
    });
    tr.querySelector(".remove").addEventListener("click", ()=>{
      cart = cart.filter(it=>it.id!==item.id);
      saveCart(); displayCart(); updateCartCount();
    });
  });

  if (subtotalEl) subtotalEl.textContent = formatRs(subtotal);
  updateTotals();
}

function selectedDelivery(){
  const r = document.querySelector('input[name="delivery"]:checked');
  return r ? r.value : "pickup";
}
function deliveryFee(){
  const v = selectedDelivery();
  if (v === "delivery") return 150;
  if (v === "postage") return 125;
  return 0;
}
function updateTotals(){
  const subtotalEl = document.getElementById("subtotal");
  const shippingEl = document.getElementById("shipping");
  const totalEl = document.getElementById("total");
  const subtotal = Number((subtotalEl?.textContent||"0").replace(/[^0-9.]/g,''));
  const ship = deliveryFee();
  if (shippingEl) shippingEl.textContent = formatRs(ship);
  if (totalEl) totalEl.textContent = formatRs(subtotal + ship);
}
function handleDeliveryUI(){
  const addressRow = document.getElementById("address-row");
  const v = selectedDelivery();
  if (addressRow) addressRow.style.display = (v === "pickup") ? "none" : "grid";
  updateTotals();
}
document.addEventListener("change", (e)=>{
  if (e.target.name === "delivery"){ handleDeliveryUI(); }
});

// Init on every page (safe if elements don’t exist)
updateCartCount();
displayCart();
handleDeliveryUI();
