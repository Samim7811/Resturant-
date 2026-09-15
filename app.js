let cart = [];

function addToCart(name, price) {
  cart.push({ name, price });
  updateCart();
}

function updateCart() {
  const total = cart.reduce((sum, item) => sum + item.price, 0);
  document.getElementById("cartText").textContent =
    cart.length + " items • ₹" + total;
}

function showCart() {
  let old = document.querySelector(".cart-modal");
  if (old) old.remove();

  if (cart.length === 0) {
    alert("Your cart is empty. Add some delicious food first!");
    return;
  }

  let total = cart.reduce((sum, item) => sum + item.price, 0);

  let modal = document.createElement("div");
  modal.className = "cart-modal show";

  modal.innerHTML = `
    <div class="cart-box">

      <div class="cart-head">
        <h2>Your Order</h2>
        <button class="close-cart"
          onclick="this.closest('.cart-modal').remove()">×</button>
      </div>

      ${cart.map((item, index) => `
        <div class="cart-item">

          <div class="cart-item-icon">🍽️</div>

          <div class="cart-item-info">
            <strong>${item.name}</strong>
            <small>₹${item.price}</small>

            <div class="qty">
              <button onclick="removeCartItem(${index})">−</button>
              <b>1</b>
              <button onclick="addAgain(${index})">+</button>
            </div>
          </div>

          <strong>₹${item.price}</strong>

        </div>
      `).join("")}

      <div class="cart-summary">

        <div class="summary-row">
          <span>Subtotal</span>
          <b>₹${total}</b>
        </div>

        <div class="summary-row">
          <span>Delivery</span>
          <b>Calculated next</b>
        </div>

        <div class="summary-row summary-total">
          <span>Total</span>
          <span>₹${total}</span>
        </div>

      </div>

      <button class="continue-btn" onclick="continueOrder()">
        Continue Order →
      </button>

    </div>
  `;

  document.body.appendChild(modal);
}

function removeCartItem(index) {
  cart.splice(index, 1);
  updateCart();
  showCart();
}

function addAgain(index) {
  cart.push({ ...cart[index] });
  updateCart();
  showCart();
}

function continueOrder() {
  document.querySelector(".cart-modal")?.remove();

  let choice = confirm(
    "How would you like to receive your order?\n\n" +
    "OK = DINE IN\n" +
    "Cancel = HOME DELIVERY"
  );

  if (choice) {
    alert("🪑 DINE IN\n\nNext step: Select your Table Number.");
  } else {
    alert("🏠 HOME DELIVERY\n\nNext step: Enter your delivery address.");
  }
}

function bookTable(event) {
  event.preventDefault();

  alert(
    "✅ Reservation Request Received!\n\n" +
    "We will confirm your booking shortly."
  );
}
/* ===== UPDATED CART SYSTEM ===== */

function showCart(){

  document.querySelector(".cart-modal")?.remove();

  if(cart.length === 0){
    alert("Your cart is empty. Add some delicious food first!");
    return;
  }

  const total = cart.reduce(
    (sum,item) => sum + item.price,0
  );

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `
    <div class="cart-box">

      <div class="cart-head">
        <h2>Your Order</h2>

        <button
          class="close-cart"
          onclick="this.closest('.cart-modal').remove()">
          ×
        </button>
      </div>

      ${cart.map((item,index) => `

        <div class="cart-item">

          <div class="cart-item-icon">
            🍽️
          </div>

          <div class="cart-item-info">

            <strong>${item.name}</strong>

            <small>₹${item.price}</small>

            <div class="qty">

              <button
                onclick="removeCartItem(${index})">
                −
              </button>

              <b>1</b>

              <button
                onclick="addAgain(${index})">
                +
              </button>

            </div>

          </div>

          <strong>₹${item.price}</strong>

        </div>

      `).join("")}

      <div class="cart-summary">

        <div class="summary-row">
          <span>Subtotal</span>
          <b>₹${total}</b>
        </div>

        <div class="summary-row">
          <span>Delivery</span>
          <span>Calculated next</span>
        </div>

        <div class="summary-row summary-total">
          <span>Total</span>
          <span>₹${total}</span>
        </div>

      </div>

      <button
        class="continue-btn"
        onclick="showOrderType()">

        Continue Order →

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


function removeCartItem(index){

  cart.splice(index,1);

  updateCart();

  if(cart.length === 0){
    document.querySelector(".cart-modal")?.remove();
  }else{
    showCart();
  }
}


function addAgain(index){

  cart.push({...cart[index]});

  updateCart();

  showCart();
}


function showOrderType(){

  document.querySelector(".cart-modal")?.remove();

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `

    <div class="order-type-box">

      <div class="order-type-head">

        <div class="small-title">
          ORDER TYPE
        </div>

        <h2>How would you like to order?</h2>

        <p>
          Choose how you want to receive your food
        </p>

      </div>

      <button
        class="order-choice"
        onclick="selectDineIn()">

        <div class="order-choice-icon">
          🪑
        </div>

        <div class="order-choice-text">

          <strong>Dine In</strong>

          <span>
            I'm eating at the restaurant
          </span>

        </div>

        <div class="order-choice-arrow">
          →
        </div>

      </button>

      <button
        class="order-choice delivery"
        onclick="selectDelivery()">

        <div class="order-choice-icon">
          🏠
        </div>

        <div class="order-choice-text">

          <strong>Home Delivery</strong>

          <span>
            Deliver the food to my address
          </span>

        </div>

        <div class="order-choice-arrow">
          →
        </div>

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


function selectDineIn(){

  document.querySelector(".cart-modal")?.remove();

  alert(
    "🪑 DINE IN SELECTED\n\n" +
    "Next step: Select your Table Number."
  );
}


function selectDelivery(){

  document.querySelector(".cart-modal")?.remove();

  alert(
    "🏠 HOME DELIVERY SELECTED\n\n" +
    "Next step: Enter your delivery address."
  );
}


/* ===== REAL DINE-IN & DELIVERY SCREENS ===== */

function selectDineIn(){

  document.querySelector(".cart-modal")?.remove();

  const modal = document.createElement("div");
  modal.className = "cart-modal show";

  modal.innerHTML = `
    <div class="order-form-box">

      <div class="form-title">
        <div class="eyebrow-small">DINE IN</div>
        <h2>Select Your Table</h2>
        <p>Choose the table where you are sitting</p>
      </div>

      <div class="table-grid">

        ${Array.from({length:12},(_,i)=>`
          <button
            class="table-btn"
            onclick="selectTable(${i+1},this)">
            Table ${String(i+1).padStart(2,'0')}
          </button>
        `).join("")}

      </div>

      <div id="selectedTableText"
           style="text-align:center;color:#777;margin-bottom:15px">
        Please select a table
      </div>

      <input
        class="form-input"
        id="dineName"
        placeholder="Your Name (Optional)"
      >

      <input
        class="form-input"
        id="dinePhone"
        placeholder="Mobile Number (Optional)"
        type="tel"
      >

      <button
        class="form-submit"
        onclick="confirmDineIn()">
        Continue to Order →
      </button>

      <button
        class="back-btn"
        onclick="showOrderType()">
        ← Back
      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


let selectedTable = null;


function selectTable(number, button){

  selectedTable = number;

  document.querySelectorAll(".table-btn")
    .forEach(btn => btn.classList.remove("selected"));

  button.classList.add("selected");

  document.getElementById("selectedTableText").innerHTML =
    "✓ <b>Table " +
    String(number).padStart(2,'0') +
    " selected</b>";
}


function confirmDineIn(){

  if(!selectedTable){
    alert("Please select your table first.");
    return;
  }

  document.querySelector(".cart-modal")?.remove();

  alert(
    "✓ Table " +
    String(selectedTable).padStart(2,'0') +
    " selected.\n\n" +
    "Your order is ready to be placed."
  );
}


function selectDelivery(){

  document.querySelector(".cart-modal")?.remove();

  const modal = document.createElement("div");
  modal.className = "cart-modal show";

  modal.innerHTML = `
    <div class="order-form-box">

      <div class="form-title">
        <div class="eyebrow-small">HOME DELIVERY</div>
        <h2>Delivery Details</h2>
        <p>Enter your details to receive your order</p>
      </div>

      <input
        class="form-input"
        id="deliveryName"
        placeholder="Full Name"
        required
      >

      <input
        class="form-input"
        id="deliveryPhone"
        placeholder="Mobile Number"
        type="tel"
        required
      >

      <input
        class="form-input"
        id="deliveryAddress"
        placeholder="House / Flat / Street Address"
        required
      >

      <input
        class="form-input"
        id="deliveryLandmark"
        placeholder="Landmark (Optional)"
      >

      <input
        class="form-input"
        id="deliveryPincode"
        placeholder="Pincode"
        type="number"
        required
      >

      <button
        class="form-submit"
        onclick="confirmDelivery()">
        Continue to Order →
      </button>

      <button
        class="back-btn"
        onclick="showOrderType()">
        ← Back
      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


function confirmDelivery(){

  const name = document.getElementById("deliveryName").value.trim();
  const phone = document.getElementById("deliveryPhone").value.trim();
  const address = document.getElementById("deliveryAddress").value.trim();
  const pincode = document.getElementById("deliveryPincode").value.trim();

  if(!name || !phone || !address || !pincode){
    alert("Please fill all required details.");
    return;
  }

  document.querySelector(".cart-modal")?.remove();

  alert(
    "✓ Delivery details saved.\n\n" +
    "Your order is ready to be placed."
  );
}


/* ===== FINAL CART QUANTITY FIX ===== */

function addToCart(name, price) {

  const existing = cart.find(item => item.name === name);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      name: name,
      price: price,
      quantity: 1
    });
  }

  updateCart();
}


function updateCart() {

  const total = cart.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  const count = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  document.getElementById("cartText").textContent =
    count + " items • ₹" + total;
}


function showCart() {

  document.querySelector(".cart-modal")?.remove();

  if (cart.length === 0) {
    alert("Your cart is empty. Add some delicious food first!");
    return;
  }

  const total = cart.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  );

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `
    <div class="cart-box">

      <div class="cart-head">

        <h2>Your Order</h2>

        <button
          class="close-cart"
          onclick="this.closest('.cart-modal').remove()">
          ×
        </button>

      </div>

      <div class="cart-items-list">

        ${cart.map((item, index) => `

          <div class="cart-item">

            <div class="cart-item-icon">
              🍽️
            </div>

            <div class="cart-item-info">

              <strong>${item.name}</strong>

              <small>₹${item.price} each</small>

              <div class="qty">

                <button
                  onclick="decreaseQuantity(${index})">
                  −
                </button>

                <b>${item.quantity}</b>

                <button
                  onclick="increaseQuantity(${index})">
                  +
                </button>

              </div>

            </div>

            <strong>
              ₹${item.price * item.quantity}
            </strong>

          </div>

        `).join("")}

      </div>

      <div class="cart-summary">

        <div class="summary-row">
          <span>Subtotal</span>
          <b>₹${total}</b>
        </div>

        <div class="summary-row">
          <span>Delivery</span>
          <span>Calculated next</span>
        </div>

        <div class="summary-row summary-total">
          <span>Total</span>
          <span>₹${total}</span>
        </div>

      </div>

      <button
        class="continue-btn"
        onclick="showOrderType()">

        Continue Order →

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


function increaseQuantity(index) {

  cart[index].quantity += 1;

  updateCart();

  showCart();
}


function decreaseQuantity(index) {

  if (cart[index].quantity > 1) {

    cart[index].quantity -= 1;

  } else {

    cart.splice(index, 1);

  }

  updateCart();

  if (cart.length > 0) {

    showCart();

  } else {

    document.querySelector(".cart-modal")?.remove();

  }
}


/* ===== REMOVE OLD ADD-AGAIN BEHAVIOUR ===== */

function addAgain(index) {

  increaseQuantity(index);

}


/* ===== DINE IN SCREEN WITHOUT BROWSER POPUP ===== */

function selectDineIn() {

  document.querySelector(".cart-modal")?.remove();

  selectedTable = null;

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `

    <div class="order-form-box">

      <div class="form-title">

        <div class="eyebrow-small">
          DINE IN
        </div>

        <h2>Select Your Table</h2>

        <p>
          Choose the table where you are sitting
        </p>

      </div>

      <div class="table-grid">

        ${Array.from({length:12}, (_,i) => `

          <button
            class="table-btn"
            onclick="selectTable(${i+1}, this)">

            Table ${String(i+1).padStart(2,'0')}

          </button>

        `).join("")}

      </div>

      <div
        id="selectedTableText"
        style="text-align:center;color:#777;margin:15px 0">

        Please select your table

      </div>

      <input
        class="form-input"
        id="dineName"
        placeholder="Your Name (Optional)">

      <input
        class="form-input"
        id="dinePhone"
        placeholder="Mobile Number (Optional)"
        type="tel">

      <button
        class="form-submit"
        onclick="confirmDineIn()">

        Continue to Order →

      </button>

      <button
        class="back-btn"
        onclick="showOrderType()">

        ← Back

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


/* ===== DELIVERY SCREEN WITHOUT BROWSER POPUP ===== */

function selectDelivery() {

  document.querySelector(".cart-modal")?.remove();

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `

    <div class="order-form-box">

      <div class="form-title">

        <div class="eyebrow-small">
          HOME DELIVERY
        </div>

        <h2>Delivery Details</h2>

        <p>
          Enter your details to receive your order
        </p>

      </div>

      <input
        class="form-input"
        id="deliveryName"
        placeholder="Full Name">

      <input
        class="form-input"
        id="deliveryPhone"
        placeholder="Mobile Number"
        type="tel">

      <input
        class="form-input"
        id="deliveryAddress"
        placeholder="House / Flat / Street Address">

      <input
        class="form-input"
        id="deliveryLandmark"
        placeholder="Landmark (Optional)">

      <input
        class="form-input"
        id="deliveryPincode"
        placeholder="Pincode"
        type="number">

      <button
        class="form-submit"
        onclick="confirmDelivery()">

        Continue to Order →

      </button>

      <button
        class="back-btn"
        onclick="showOrderType()">

        ← Back

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


/* ===== FINAL CONFIRMATION ===== */

function confirmDineIn() {

  if (!selectedTable) {

    document.getElementById("selectedTableText").innerHTML =
      "⚠️ Please select your table first.";

    return;
  }

  document.querySelector(".cart-modal")?.remove();

  showFinalOrderScreen(
    "Dine In",
    "Table " + String(selectedTable).padStart(2,'0')
  );
}


function confirmDelivery() {

  const name =
    document.getElementById("deliveryName").value.trim();

  const phone =
    document.getElementById("deliveryPhone").value.trim();

  const address =
    document.getElementById("deliveryAddress").value.trim();

  const pincode =
    document.getElementById("deliveryPincode").value.trim();

  if (!name || !phone || !address || !pincode) {

    return;

  }

  document.querySelector(".cart-modal")?.remove();

  showFinalOrderScreen(
    "Home Delivery",
    address
  );
}


/* ===== ORDER SUMMARY SCREEN ===== */

function showFinalOrderScreen(type, detail) {

  const total = cart.reduce(
    (sum,item) => sum + (item.price * item.quantity), 0
  );

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `

    <div class="order-form-box">

      <div class="form-title">

        <div class="eyebrow-small">
          ORDER SUMMARY
        </div>

        <h2>Ready to Place Order</h2>

        <p>
          ${type} • ${detail}
        </p>

      </div>

      <div class="cart-summary">

        ${cart.map(item => `

          <div class="summary-row">

            <span>
              ${item.name} × ${item.quantity}
            </span>

            <b>
              ₹${item.price * item.quantity}
            </b>

          </div>

        `).join("")}

        <div class="summary-row summary-total">

          <span>Total</span>

          <span>₹${total}</span>

        </div>

      </div>

      <button
        class="form-submit"
        onclick="placeDemoOrder()">

        ✓ Place Order

      </button>

      <button
        class="back-btn"
        onclick="this.closest('.cart-modal').remove()">

        ← Cancel

      </button>

    </div>
  `;

  document.body.appendChild(modal);
}


function placeDemoOrder() {

  document.querySelector(".cart-modal")?.remove();

  cart = [];

  updateCart();

  const modal = document.createElement("div");

  modal.className = "cart-modal show";

  modal.innerHTML = `

    <div class="order-form-box">

      <div class="form-title">

        <div style="font-size:55px">
          🎉
        </div>

        <h2>Order Placed!</h2>

        <p>
          Your order has been received successfully.
        </p>

      </div>

      <button
        class="form-submit"
        onclick="this.closest('.cart-modal').remove()">

        Done

      </button>

    </div>

  `;

  document.body.appendChild(modal);
}


/* ===== WORKING FULL MENU ===== */

document.addEventListener("DOMContentLoaded", function(){

  const menuButton = document.querySelector(".view-menu");

  if(menuButton){

    menuButton.addEventListener("click", function(event){

      event.preventDefault();

      openFullMenu();

    });

  }

});


function openFullMenu(){

  document.querySelector(".full-menu-modal")?.remove();

  const modal = document.createElement("div");

  modal.className = "full-menu-modal show";

  modal.innerHTML = `

    <div class="full-menu-box">

      <div class="full-menu-head">

        <h2>Full Menu</h2>

        <button
          class="full-menu-close"
          onclick="this.closest('.full-menu-modal').remove()">
          ×
        </button>

      </div>


      <div class="menu-category">

        <h3>🍗 Biryani & Rice</h3>

        ${menuItem("Chicken Biryani","Fragrant basmati rice & tender chicken","₹220","🍗",220)}
        ${menuItem("Mutton Biryani","Slow cooked mutton with aromatic rice","₹320","🍖",320)}
        ${menuItem("Veg Biryani","Fresh vegetables & fragrant basmati rice","₹180","🥘",180)}

      </div>


      <div class="menu-category">

        <h3>🔥 Starters</h3>

        ${menuItem("Paneer Tikka","Chargrilled paneer with peppers","₹240","🍢",240)}
        ${menuItem("Chicken Tikka","Juicy grilled chicken pieces","₹260","🍗",260)}
        ${menuItem("Chicken 65","Crispy spicy chicken starter","₹230","🌶️",230)}

      </div>


      <div class="menu-category">

        <h3>🍛 Main Course</h3>

        ${menuItem("Butter Chicken","Creamy tomato gravy with chicken","₹280","🍛",280)}
        ${menuItem("Paneer Butter Masala","Rich creamy paneer curry","₹240","🥘",240)}
        ${menuItem("Dal Tadka","Yellow dal with Indian spices","₹160","🍲",160)}

      </div>


      <div class="menu-category">

        <h3>🫓 Indian Breads</h3>

        ${menuItem("Garlic Naan","Soft tandoori naan with garlic","₹60","🫓",60)}
        ${menuItem("Butter Naan","Soft naan with butter","₹50","🫓",50)}
        ${menuItem("Tandoori Roti","Traditional clay oven roti","₹35","🫓",35)}

      </div>


      <div class="menu-category">

        <h3>🥤 Drinks</h3>

        ${menuItem("Fresh Lime Soda","Refreshing chilled lime soda","₹70","🍋",70)}
        ${menuItem("Mango Lassi","Creamy mango yogurt drink","₹100","🥭",100)}
        ${menuItem("Cold Drink","Chilled soft drink","₹60","🥤",60)}

      </div>

    </div>

  `;

  document.body.appendChild(modal);
}


function menuItem(name, description, price, icon, amount){

  return `

    <div class="menu-row">

      <div class="menu-row-icon">
        ${icon}
      </div>

      <div class="menu-row-info">

        <strong>${name}</strong>

        <span>${description}</span>

      </div>

      <div class="menu-price">
        ${price}
      </div>

      <button
        class="menu-add"
        onclick="addToCart('${name}',${amount})">

        + Add

      </button>

    </div>

  `;

}


/* ===== PREMIUM FULL MENU + VISIBLE ADD FEEDBACK ===== */

function addToCart(name, price, button = null) {

  const existing = cart.find(item => item.name === name);

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({
      name: name,
      price: price,
      quantity: 1
    });
  }

  updateCart();

  if (button) {

    const oldText = button.innerHTML;

    button.innerHTML = "✓ Added";
    button.classList.add("added");

    setTimeout(() => {
      button.innerHTML = oldText;
      button.classList.remove("added");
    }, 1200);

  }

  showMenuToast(name + " added to your order");
}


function showMenuToast(message) {

  document.querySelector(".menu-toast")?.remove();

  const toast = document.createElement("div");

  toast.className = "menu-toast";

  toast.innerHTML = "✓ " + message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 20);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => toast.remove(), 250);

  }, 1800);
}


/* Replace old Full Menu */

function openFullMenu(){

  document.querySelector(".full-menu-modal")?.remove();

  const modal = document.createElement("div");

  modal.className = "full-menu-modal show";

  modal.innerHTML = `

    <div class="full-menu-box">

      <div class="full-menu-top">

        <div class="full-menu-brand">

          <small>RESTAURANT MENU</small>

          <h2>Our Menu</h2>

        </div>

        <button
          class="full-menu-close"
          onclick="this.closest('.full-menu-modal').remove()">
          ×
        </button>

      </div>


      <input
        class="menu-search"
        id="menuSearch"
        placeholder="🔍  Search dishes..."
        oninput="filterMenu(this.value)"
      >


      <div class="menu-tabs">

        <button class="menu-tab active"
          onclick="filterCategory('all',this)">
          All
        </button>

        <button class="menu-tab"
          onclick="filterCategory('biryani',this)">
          🍗 Biryani
        </button>

        <button class="menu-tab"
          onclick="filterCategory('starter',this)">
          🔥 Starters
        </button>

        <button class="menu-tab"
          onclick="filterCategory('main',this)">
          🍛 Main Course
        </button>

        <button class="menu-tab"
          onclick="filterCategory('bread',this)">
          🫓 Breads
        </button>

        <button class="menu-tab"
          onclick="filterCategory('drink',this)">
          🥤 Drinks
        </button>

      </div>


      <div id="fullMenuContent">


        <div class="menu-category" data-category="biryani">

          <div class="menu-category-title">
            <h3>🍗 Biryani & Rice</h3>
            <span>3 items</span>
          </div>

          ${menuItem("Chicken Biryani","Fragrant basmati rice & tender chicken","₹220","🍗",220)}
          ${menuItem("Mutton Biryani","Slow cooked mutton with aromatic rice","₹320","🍖",320)}
          ${menuItem("Veg Biryani","Fresh vegetables & fragrant basmati rice","₹180","🥘",180)}

        </div>


        <div class="menu-category" data-category="starter">

          <div class="menu-category-title">
            <h3>🔥 Starters</h3>
            <span>3 items</span>
          </div>

          ${menuItem("Paneer Tikka","Chargrilled paneer with peppers","₹240","🍢",240)}
          ${menuItem("Chicken Tikka","Juicy grilled chicken pieces","₹260","🍗",260)}
          ${menuItem("Chicken 65","Crispy spicy chicken starter","₹230","🌶️",230)}

        </div>


        <div class="menu-category" data-category="main">

          <div class="menu-category-title">
            <h3>🍛 Main Course</h3>
            <span>3 items</span>
          </div>

          ${menuItem("Butter Chicken","Creamy tomato gravy with chicken","₹280","🍛",280)}
          ${menuItem("Paneer Butter Masala","Rich creamy paneer curry","₹240","🥘",240)}
          ${menuItem("Dal Tadka","Yellow dal with Indian spices","₹160","🍲",160)}

        </div>


        <div class="menu-category" data-category="bread">

          <div class="menu-category-title">
            <h3>🫓 Indian Breads</h3>
            <span>3 items</span>
          </div>

          ${menuItem("Garlic Naan","Soft tandoori naan with garlic","₹60","🫓",60)}
          ${menuItem("Butter Naan","Soft naan with butter","₹50","🫓",50)}
          ${menuItem("Tandoori Roti","Traditional clay oven roti","₹35","🫓",35)}

        </div>


        <div class="menu-category" data-category="drink">

          <div class="menu-category-title">
            <h3>🥤 Drinks</h3>
            <span>3 items</span>
          </div>

          ${menuItem("Fresh Lime Soda","Refreshing chilled lime soda","₹70","🍋",70)}
          ${menuItem("Mango Lassi","Creamy mango yogurt drink","₹100","🥭",100)}
          ${menuItem("Cold Drink","Chilled soft drink","₹60","🥤",60)}

        </div>

      </div>

    </div>
  `;

  document.body.appendChild(modal);
}


function menuItem(name, description, price, icon, amount){

  return `

    <div class="menu-row"
      data-name="${name.toLowerCase()}">

      <div class="menu-row-icon">
        ${icon}
      </div>

      <div class="menu-row-info">

        <strong>${name}</strong>

        <span>${description}</span>

      </div>

      <div class="menu-price">
        ${price}
      </div>

      <button
        class="menu-add"
        onclick="addToCart('${name}',${amount},this)">

        + Add

      </button>

    </div>

  `;
}


function filterCategory(category, button){

  document.querySelectorAll(".menu-tab")
    .forEach(tab => tab.classList.remove("active"));

  button.classList.add("active");

  document.querySelectorAll(".menu-category")
    .forEach(section => {

      if(category === "all" ||
         section.dataset.category === category){

        section.style.display = "";

      }else{

        section.style.display = "none";

      }

    });

}


function filterMenu(value){

  const query = value.toLowerCase().trim();

  document.querySelectorAll(".menu-category")
    .forEach(section => {

      let visible = 0;

      section.querySelectorAll(".menu-row")
        .forEach(row => {

          const name = row.dataset.name;

          if(name.includes(query)){

            row.style.display = "";
            visible++;

          }else{

            row.style.display = "none";

          }

        });

      section.style.display =
        visible > 0 ? "" : "none";

    });

}


/* Make Home page View Full Menu definitely work */

document.addEventListener("click", function(event){

  const target = event.target.closest(".view-menu");

  if(target){

    event.preventDefault();

    openFullMenu();

  }

});


/* ===== MOBILE FEATURES + HOME DELIVERY ===== */

document.addEventListener("DOMContentLoaded", function(){

  /* Find the section containing the 5 feature names */
  const featureNames = [
    "Fresh Ingredients",
    "Expert Chefs",
    "Hygienic Kitchen",
    "Great Ambience",
    "Rated 4.8+"
  ];

  const found = featureNames.map(name => {

    const all = Array.from(
      document.querySelectorAll("*")
    );

    return all.find(el => {

      if(el.children.length > 3) return false;

      return el.textContent.trim() === name;

    });

  }).filter(Boolean);


  if(found.length === 5){

    let parent = found[0].parentElement;

    let bestParent = parent;

    for(let i=0;i<4;i++){

      if(!parent) break;

      const count = found.filter(el =>
        parent.contains(el)
      ).length;

      if(count === 5){
        bestParent = parent;
      }

      parent = parent.parentElement;

    }

    bestParent.classList.add("mobile-features-row");

  }


  /* Add Home Delivery option to quick actions */

  const quickActions =
    document.querySelector(".quick-actions");

  if(quickActions &&
     !quickActions.querySelector(".home-delivery-card")){

    const card =
      document.createElement("div");

    card.className =
      "action-card home-delivery-card";

    card.innerHTML = `

      <div class="action-icon">
        🏠
      </div>

      <div>
        <h3>Home Delivery</h3>

        <p>
          Get Food at Home
        </p>
      </div>

      <b>→</b>

    `;

    card.onclick = function(){

      if(typeof showOrderType === "function"){

        if(typeof cart !== "undefined" &&
           cart.length > 0){

          showOrderType();

        }else{

          document.querySelector("#menu")?.scrollIntoView({
            behavior:"smooth"
          });

        }

      }

    };

    quickActions.appendChild(card);

  }

});


/* Also run after page has loaded */
setTimeout(function(){

  const featureNames = [
    "Fresh Ingredients",
    "Expert Chefs",
    "Hygienic Kitchen",
    "Great Ambience",
    "Rated 4.8+"
  ];

  const found = featureNames.map(name => {

    return Array.from(
      document.querySelectorAll("*")
    ).find(el =>
      el.children.length <= 3 &&
      el.textContent.trim() === name
    );

  }).filter(Boolean);


  if(found.length === 5){

    let parent = found[0].parentElement;

    for(let i=0;i<5 && parent;i++){

      const count = found.filter(el =>
        parent.contains(el)
      ).length;

      if(count === 5){

        parent.classList.add(
          "mobile-features-row"
        );

        break;

      }

      parent = parent.parentElement;

    }

  }

},1000);


/* =================================================
   STOP THE OLD FEATURE-PARENT SCRIPT
   ================================================= */

setTimeout(function(){

  document.querySelectorAll(".mobile-features-row")
    .forEach(function(el){

      /*
       * Remove the accidental class from large ancestors.
       * The class was previously being applied to the
       * wrong parent and breaking the mobile layout.
       */

      el.classList.remove("mobile-features-row");

    });

},1500);


/* ===== SAFELY TARGET ONLY THE 5 FEATURE ITEMS ===== */

(function(){

  function setupFiveFeatures(){

    const names = [
      "Fresh Ingredients",
      "Expert Chefs",
      "Hygienic Kitchen",
      "Great Ambience",
      "Rated 4.8+"
    ];

    const items = [];

    names.forEach(function(name){

      const elements =
        Array.from(document.querySelectorAll("*"));

      const textElement = elements.find(function(el){

        return el.children.length === 0 &&
               el.textContent.trim() === name;

      });

      if(textElement){

        items.push(textElement.parentElement);

      }

    });

    if(items.length !== 5) return;

    /* Find ONLY a parent whose DIRECT children contain
       all five feature items */

    let commonParent = null;

    let current = items[0].parentElement;

    while(current){

      const directChildren =
        Array.from(current.children);

      const allFiveAreDirectChildren =
        items.every(function(item){
          return directChildren.includes(item);
        });

      if(allFiveAreDirectChildren){

        commonParent = current;
        break;

      }

      current = current.parentElement;

    }

    if(!commonParent) return;

    /* Give only these five items their own mobile layout */

    commonParent.classList.add("five-feature-row");

    items.forEach(function(item){

      item.classList.add("single-mobile-feature");

    });

  }

  if(document.readyState === "loading"){

    document.addEventListener(
      "DOMContentLoaded",
      setupFiveFeatures
    );

  }else{

    setupFiveFeatures();

  }

  setTimeout(setupFiveFeatures,1000);

})();


/* ===== REMOVE GREAT AMBIENCE ONLY ===== */

(function removeGreatAmbience(){

  function removeItem(){

    const elements = Array.from(
      document.querySelectorAll("*")
    );

    const text = elements.find(function(el){

      return el.children.length === 0 &&
             el.textContent.trim() === "Great Ambience";

    });

    if(!text) return;

    /* Remove only the feature containing Great Ambience */
    let item = text.parentElement;

    if(item){
      item.remove();
    }

  }

  if(document.readyState === "loading"){

    document.addEventListener(
      "DOMContentLoaded",
      removeItem
    );

  }else{

    removeItem();

  }

  setTimeout(removeItem,500);
  setTimeout(removeItem,1500);

})();

