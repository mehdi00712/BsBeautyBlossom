// =========================
// NAVBAR TOGGLE
// =========================
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");
if (hamburger) {
  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("show");
  });
}

// =========================
// CART SYSTEM
// =========================
let cart = JSON.parse(localStorage.getItem("cart")) || [];

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const countEl = document.getElementById("cart-count");
  if (countEl) countEl.innerText = count;
}

// Render Cart
function displayCart() {
  const cartItemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("total");
  if (!cartItemsEl) return;

  cartItemsEl.innerHTML = "";
  let total = 0;

  cart.forEach((item, index) => {
    total += item.price * item.quantity;

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <span><strong>${item.name}</strong> (${item.size})</span>
      <div class="cart-controls">
        <button onclick="changeQty(${index}, -1)">-</button>
        <span>${item.quantity}</span>
        <button onclick="changeQty(${index}, 1)">+</button>
      </div>
      <span>Rs ${(item.price * item.quantity).toFixed(2)}</span>
      <button onclick="removeItem(${index})">❌</button>
    `;
    cartItemsEl.appendChild(div);
  });

  // Add postage if selected
  const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
  if (deliveryMethod === "Postage") total += 50;

  if (totalEl) totalEl.innerText = "Total: Rs " + total.toFixed(2);
}

// Change Qty in Cart
function changeQty(index, delta) {
  cart[index].quantity += delta;
  if (cart[index].quantity <= 0) cart.splice(index, 1);

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  displayCart();
}

// Remove Item
function removeItem(index) {
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  displayCart();
}

// Add to Cart
function addToCart(productName, button) {
  const qtyEl = button.parentElement.querySelector(".qty");
  const sizeEl = button.parentElement.querySelector(".size-select");

  const quantity = parseInt(qtyEl ? qtyEl.textContent : 1);
  const size = sizeEl ? sizeEl.value : "Default";
  const price = parseFloat(sizeEl ? sizeEl.selectedOptions[0].dataset.price : button.dataset.price);

  if (!price) {
    alert("Please select a size.");
    return;
  }

  const existingItem = cart.find(item => item.name === productName && item.size === size);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ name: productName, size, price, quantity });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  alert(`${quantity} x ${productName} (${size}) added to cart!`);
}

// =========================
// QUANTITY CONTROLS (+/-)
// =========================
document.addEventListener("click", e => {
  if (e.target.classList.contains("minus")) {
    const qtyEl = e.target.parentElement.querySelector(".qty");
    let qty = parseInt(qtyEl.textContent);
    if (qty > 1) qtyEl.textContent = qty - 1;
  }
  if (e.target.classList.contains("plus")) {
    const qtyEl = e.target.parentElement.querySelector(".qty");
    let qty = parseInt(qtyEl.textContent);
    qtyEl.textContent = qty + 1;
  }
});

// =========================
// DELIVERY & PAYMENT
// =========================
const deliveryRadios = document.querySelectorAll('input[name="delivery"]');
const customerInfo = document.getElementById("customer-info");
const addressSection = document.getElementById("address-section");
const paymentRadios = document.querySelectorAll('input[name="payment"]');
const juiceSection = document.getElementById("juice-section");

deliveryRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (customerInfo) customerInfo.style.display = "block";

    if (radio.value === "Postage") {
      if (addressSection) addressSection.style.display = "block";
      paymentRadios.forEach(p => {
        if (p.value === "Pick Up Payment") {
          p.checked = false;
          p.disabled = true;
        }
      });
    } else {
      if (addressSection) addressSection.style.display = "none";
      paymentRadios.forEach(p => {
        if (p.value === "Pick Up Payment") p.disabled = false;
      });
    }

    displayCart();
  });
});

paymentRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (juiceSection) juiceSection.style.display = (radio.value === "Juice" && radio.checked) ? "block" : "none";
  });
});

// =========================
// CHECKOUT FORM
// =========================
const checkoutForm = document.getElementById("delivery-form");
if (checkoutForm) {
  checkoutForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    const deliveryMethod = document.querySelector('input[name="delivery"]:checked')?.value;
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!deliveryMethod || !paymentMethod) {
      alert("Please select delivery and payment methods.");
      return;
    }
    if (deliveryMethod === "Postage" && address === "") {
      alert("Please enter your delivery address.");
      return;
    }

    let total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (deliveryMethod === "Postage") total += 50;

    const orderData = {
      name,
      email,
      phone,
      deliveryMethod,
      paymentMethod,
      address: deliveryMethod === "Postage" ? address : "",
      total: total.toFixed(2),
      cart,
      timestamp: new Date().toISOString()
    };

    try {
      await database.ref("orders").push(orderData);
      alert("Order successfully placed!");
      cart = [];
      localStorage.removeItem("cart");
      displayCart();
      updateCartCount();
      checkoutForm.reset();
      if (juiceSection) juiceSection.style.display = "none";
      if (addressSection) addressSection.style.display = "none";
      if (customerInfo) customerInfo.style.display = "none";
      paymentRadios.forEach(p => p.disabled = false);
    } catch (error) {
      alert("Error placing order: " + error.message);
    }
  });
}

// =========================
// INIT
// =========================
updateCartCount();
displayCart();
