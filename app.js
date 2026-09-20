let cart = [];











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

async function bookTable(event) {
  event.preventDefault();

  const form = event.target;

  const name =
    form.querySelector('input[type="text"]')?.value.trim() || "";

  const phone =
    form.querySelector('input[type="tel"]')?.value.trim() || "";

  const date =
    form.querySelector('input[type="date"]')?.value || "";

  const timeInput =
    form.querySelector('input[type="time"]');

  const time = timeInput?.value || "";

  const guests = Number(
    form.querySelector('select[name="guests"]')?.value ||
    form.querySelectorAll("select")[1]?.value ||
    0
  );

  const duration = Number(
    form.querySelector('select[name="duration"]')?.value ||
    form.querySelectorAll("select")[0]?.value ||
    60
  );

  if (!name || !phone || !date || !guests) {
    alert("Please fill all reservation details.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');

  if (button) {
    button.disabled = true;
    button.textContent = "Checking availability...";
  }

  try {
    const restaurantResult = await supabaseClient
      .from("restaurants")
      .select("id")
      .eq("slug", "golden-thali")
      .single();

    if (restaurantResult.error || !restaurantResult.data) {
      throw restaurantResult.error ||
        new Error("Restaurant information not found.");
    }

    const restaurantId = restaurantResult.data.id;

    const tablesResult = await supabaseClient
      .from("restaurant_tables")
      .select("id,table_number,capacity,table_type,status")
      .eq("restaurant_id", restaurantId)
      .eq("status", "available")
      .gte("capacity", guests)
      .order("capacity", { ascending: true });

    if (tablesResult.error) {
      throw tablesResult.error;
    }

    const tables = tablesResult.data || [];

    if (!tables.length) {
      throw new Error(
        "No suitable table is available for " +
        guests +
        " guests."
      );
    }

    const reservationResult = await supabaseClient
      .from("reservations")
      .select(
        "id,table_id,reservation_time,end_time,duration_minutes,status"
      )
      .eq("restaurant_id", restaurantId)
      .eq("reservation_date", date)
      .neq("status", "cancelled");

    if (reservationResult.error) {
      throw reservationResult.error;
    }

    const existing = reservationResult.data || [];

    function toMinutes(value) {
      if (!value) return 0;

      const parts = String(value)
        .slice(0, 5)
        .split(":");

      return (
        Number(parts[0]) * 60 +
        Number(parts[1])
      );
    }

    function hasOverlap(tableId, startMinutes, endMinutes) {
      return existing.some(r => {
        if (String(r.table_id) !== String(tableId)) {
          return false;
        }

        const oldStart = toMinutes(r.reservation_time);

        const oldEnd = r.end_time
          ? toMinutes(r.end_time)
          : oldStart + Number(r.duration_minutes || 60);

        return (
          startMinutes < oldEnd &&
          endMinutes > oldStart
        );
      });
    }

    /*
     * If a table was already automatically selected
     * after the customer chose a time, verify it again.
     */
    const forcedTableId =
      window.forcedReservationTableId || null;

    if (forcedTableId && time) {
      const selectedTable = tables.find(
        table =>
          String(table.id) === String(forcedTableId)
      );

      if (!selectedTable) {
        throw new Error(
          "The selected table is no longer available."
        );
      }

      const startMinutes =
        toMinutes(time);

      const endMinutes =
        startMinutes + duration;

      if (hasOverlap(
        selectedTable.id,
        startMinutes,
        endMinutes
      )) {
        window.forcedReservationTableId = null;

        throw new Error(
          "That time was just booked by another customer. Please choose another available time."
        );
      }

      const endHour =
        Math.floor(endMinutes / 60);

      const endMinute =
        endMinutes % 60;

      const endTime =
        String(endHour).padStart(2, "0") +
        ":" +
        String(endMinute).padStart(2, "0") +
        ":00";

      const reservationPayload = {
        restaurant_id: restaurantId,
        table_id: selectedTable.id,
        customer_name: name,
        customer_phone: phone,
        reservation_date: date,
        reservation_time: time + ":00",
        duration_minutes: duration,
        end_time: endTime,
        guests: guests,
        status: "pending",
        notes:
          "Duration: " +
          Math.floor(duration / 60) +
          " hour" +
          (duration > 60 ? "s" : "")
      };

      const insertResult = await supabaseClient
        .from("reservations")
        .insert(reservationPayload)
        .select(
          "id,reservation_date,reservation_time,end_time,guests,status"
        )
        .single();

      if (insertResult.error) {
        throw insertResult.error;
      }

      window.forcedReservationTableId = null;

      const reservedDate =
        new Date(date + "T00:00:00");

      const displayDate =
        reservedDate.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        );

      const displayTime =
        new Date(
          "2000-01-01T" + time + ":00"
        ).toLocaleTimeString(
          "en-IN",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          }
        );

      const displayEndTime =
        new Date(
          "2000-01-01T" +
          endTime
        ).toLocaleTimeString(
          "en-IN",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true
          }
        );

      alert(
        "✅ Reservation Confirmed!\n\n" +
        "Booking ID: " +
        insertResult.data.id +
        "\n" +
        "Date: " +
        displayDate +
        "\n" +
        "Time: " +
        displayTime +
        " - " +
        displayEndTime +
        "\n" +
        "Guests: " +
        guests +
        "\n\n" +
        "Your reservation request has been received."
      );

      form.reset();

      if (
        typeof updateReservationTimeOptions ===
        "function"
      ) {
        updateReservationTimeOptions();
      }

      return;
    }

    /*
     * First submission:
     * calculate every possible reservation time.
     * Customer will see only time + capacity + type.
     */
    const startOfDay = 8 * 60;
    const endOfDay = 22 * 60;

    const latestStart =
      endOfDay - duration;

    const slots = [];

    for (
      let startMinutes = startOfDay;
      startMinutes <= latestStart;
      startMinutes += 30
    ) {
      const slotEnd =
        startMinutes + duration;

      const availableTables =
        tables.filter(table =>
          !hasOverlap(
            table.id,
            startMinutes,
            slotEnd
          )
        );

      const uniqueTypes = [];

      availableTables.forEach(table => {
        const capacity =
          Number(table.capacity || 0);

        const type =
          String(
            table.table_type ||
            "Standard Table"
          );

        const key =
          capacity + "|" + type;

        if (
          !uniqueTypes.some(
            item => item.key === key
          )
        ) {
          uniqueTypes.push({
            key,
            capacity,
            type
          });
        }
      });

      slots.push({
        startMinutes,
        endMinutes: slotEnd,
        availableTables,
        uniqueTypes
      });
    }

    window.reservationContext = {
      form,
      name,
      phone,
      date,
      guests,
      duration,
      restaurantId,
      availableTables: tables,
      reservationFee:
        Number(
          window.reservationContext?.reservationFee ||
          0
        ),
      reservationRefundable:
        window.reservationContext?.reservationRefundable !== false,
      paymentLink:
        window.reservationContext?.paymentLink || "",
      selectedTable: null,
      slots
    };

    window.forcedReservationTableId = null;

    showReservationTimePicker();

  } catch (error) {
    console.error(
      "RESERVATION AVAILABILITY ERROR:",
      error
    );

    alert(
      "❌ Reservation could not be checked.\n\n" +
      (error.message || "Unknown error")
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Check Availability";
    }
  }
}

function showReservationTimePicker() {
  const ctx = window.reservationContext;

  if (!ctx || !ctx.slots) return;

  const old =
    document.getElementById(
      "reservationTimePicker"
    );

  if (old) old.remove();

  const popup =
    document.createElement("div");

  popup.id =
    "reservationTimePicker";

  function formatTime(totalMinutes) {
    const h =
      Math.floor(totalMinutes / 60);

    const m =
      totalMinutes % 60;

    const d =
      new Date(
        "2000-01-01T" +
        String(h).padStart(2, "0") +
        ":" +
        String(m).padStart(2, "0") +
        ":00"
      );

    return d.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }
    );
  }

  const escapeText = value =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  popup.innerHTML = `
    <div class="reservation-picker-box">

      <button
        type="button"
        class="reservation-picker-close"
        onclick="this.closest('#reservationTimePicker').remove()">
        ×
      </button>

      <div style="font-size:42px;">📅</div>

      <h2>Choose Reservation Time</h2>

      <p style="color:#666;margin-bottom:18px;">
        ${escapeText(ctx.guests)}
        Guest${ctx.guests > 1 ? "s" : ""}
        •
        ${ctx.duration} Minutes
      </p>

      <div
        class="reservation-time-list"
        style="
          display:flex;
          flex-direction:column;
          gap:10px;
          max-height:55vh;
          overflow-y:auto;
        "
      >

        ${ctx.slots.map(slot => {

          const available =
            slot.availableTables.length > 0;

          const time =
            formatTime(
              slot.startMinutes
            );

          const endTime =
            formatTime(
              slot.endMinutes
            );

          if (!available) {
            return `
              <div
                style="
                  padding:15px;
                  border-radius:14px;
                  background:#fff1f1;
                  border:1px solid #f0caca;
                  opacity:.85;
                "
              >
                <div
                  style="
                    font-size:17px;
                    font-weight:700;
                    color:#b00020;
                  "
                >
                  🔴 ${time}
                </div>

                <div
                  style="
                    margin-top:4px;
                    font-size:13px;
                    color:#b00020;
                  "
                >
                  Fully Booked
                  • Until ${endTime}
                </div>
              </div>
            `;
          }

          return `
            <button
              type="button"
              onclick="selectReservationTime(${slot.startMinutes})"
              style="
                width:100%;
                text-align:left;
                padding:15px;
                border-radius:14px;
                border:1px solid #cfe8d2;
                background:#f3fff4;
                cursor:pointer;
              "
            >

              <div
                style="
                  font-size:17px;
                  font-weight:700;
                  color:#087f23;
                "
              >
                🟢 ${time}
              </div>

              <div
                style="
                  margin-top:4px;
                  font-size:13px;
                  color:#666;
                "
              >
                ${time} - ${endTime}
              </div>

              <div
                style="
                  margin-top:8px;
                  display:flex;
                  flex-wrap:wrap;
                  gap:6px;
                "
              >
                ${slot.uniqueTypes.map(item => `
                  <span
                    style="
                      padding:5px 9px;
                      border-radius:999px;
                      background:#fff;
                      border:1px solid #ddd;
                      font-size:12px;
                      color:#444;
                    "
                  >
                    👥 Up to ${escapeText(item.capacity)}
                    •
                    🍽️ ${escapeText(item.type)}
                  </span>
                `).join("")}
              </div>

              <div
                style="
                  margin-top:8px;
                  font-size:12px;
                  color:#087f23;
                "
              >
                ${slot.availableTables.length}
                suitable table${slot.availableTables.length > 1 ? "s" : ""}
                available
              </div>

            </button>
          `;
        }).join("")}

      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function selectReservationTime(startMinutes) {
  const ctx = window.reservationContext;

  if (!ctx || !ctx.slots) return;

  const slot =
    ctx.slots.find(
      item =>
        item.startMinutes ===
        Number(startMinutes)
    );

  if (
    !slot ||
    !slot.availableTables.length
  ) {
    alert(
      "This time is no longer available. Please choose another time."
    );
    return;
  }

  /*
   * Automatically choose the smallest suitable
   * available table. Customer never sees table number.
   */
  const selectedTable =
    [...slot.availableTables]
      .sort(
        (a, b) =>
          Number(a.capacity) -
          Number(b.capacity)
      )[0];

  ctx.selectedTable =
    selectedTable;

  window.forcedReservationTableId =
    selectedTable.id;

  const time =
    String(
      Math.floor(startMinutes / 60)
    ).padStart(2, "0") +
    ":" +
    String(
      startMinutes % 60
    ).padStart(2, "0");

  const timeInput =
    ctx.form?.querySelector(
      'input[type="time"]'
    );

  if (timeInput) {
    timeInput.value = time;
  }

  const picker =
    document.getElementById(
      "reservationTimePicker"
    );

  if (picker) picker.remove();

  const fee =
    Number(ctx.reservationFee || 0);

  if (fee > 0) {
    if (
      typeof openReservationPaymentPopup ===
      "function"
    ) {
      openReservationPaymentPopup();
    } else {
      alert(
        "Reservation fee is configured, but payment screen is not available."
      );
    }

    return;
  }

  /*
   * No fee:
   * submit again and bookTable() will verify
   * the automatically selected table one more time.
   */
  if (ctx.form) {
    ctx.form.requestSubmit();
  }
}

function openReservationPaymentPopup() {
  const ctx = window.reservationContext;

  if (!ctx || !ctx.selectedTable) return;

  const old =
    document.getElementById(
      "reservationPaymentPopup"
    );

  if (old) old.remove();

  const popup =
    document.createElement("div");

  popup.id =
    "reservationPaymentPopup";

  popup.innerHTML = `
    <div class="reservation-picker-box">

      <button
        type="button"
        class="reservation-picker-close"
        onclick="this.closest('#reservationPaymentPopup').remove()">
        ×
      </button>

      <div style="font-size:48px;">🍽️</div>

      <h2>Reservation Fee</h2>

      <p style="margin:10px 0;color:#666;">
        Your selected reservation time is ready.
      </p>

      <div
        style="
          margin:18px 0;
          padding:16px;
          border-radius:14px;
          background:#fff7e8;
          border:1px solid #f0d28a;
        "
      >
        <div
          style="
            font-size:14px;
            color:#777;
          "
        >
          Reservation Fee
        </div>

        <div
          style="
            font-size:30px;
            font-weight:700;
          "
        >
          ₹${ctx.reservationFee.toFixed(2)}
        </div>

        <div
          style="
            font-size:13px;
            color:#087f23;
            margin-top:5px;
          "
        >
          ${
            ctx.reservationRefundable !== false
              ? "100% refundable"
              : "Non-refundable"
          }
        </div>
      </div>

      ${
        ctx.paymentLink
          ? `
            <button
              type="button"
              class="primary-btn"
              onclick="openReservationPayment()"
            >
              💳 Pay ₹${ctx.reservationFee.toFixed(2)}
            </button>

            <button
              type="button"
              class="primary-btn"
              style="
                margin-top:10px;
                background:#087f23;
              "
              onclick="completeReservationAfterPayment()"
            >
              ✅ I Have Paid
            </button>
          `
          : `
            <div
              style="
                padding:12px;
                border-radius:10px;
                background:#fff0f0;
                color:#b00020;
                font-size:14px;
              "
            >
              Payment link is not configured by the restaurant.
            </div>
          `
      }

    </div>
  `;

  document.body.appendChild(popup);
}

function updateReservationTimeOptions() {
  const form = document.querySelector(
    '#booking form, form[onsubmit*="bookTable"]'
  );

  if (!form) return;

  const timeInput = form.querySelector('input[type="time"]');

  if (!timeInput) return;

  timeInput.min = "08:00";
  timeInput.max = "20:00";
  timeInput.step = "3600";
}

function setupReservationForm() {
  const form = document.querySelector(
    '#booking form, form[onsubmit*="bookTable"]'
  );

  if (!form) return;

  const dateInput = form.querySelector('input[type="date"]');

  if (dateInput) {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    dateInput.min = today;

    if (!dateInput.value) {
      dateInput.value = today;
    }
  }

  updateReservationTimeOptions();
}
/* ===== UPDATED CART SYSTEM ===== */




function removeCartItem(index){

  cart.splice(index,1);

  updateCart();

  if(cart.length === 0){
    document.querySelector(".cart-modal")?.remove();
  }else{
    showCart();
  }
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








/* ===== REAL DINE-IN & DELIVERY SCREENS ===== */




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



/* ===== FINAL CART QUANTITY FIX ===== */




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
  if (!cart[index]) return;

  cart[index].quantity = (Number(cart[index].quantity) || 1) + 1;

  try {
    localStorage.setItem("restaurant_cart", JSON.stringify(cart));
  } catch (e) {}

  updateCart();
  refreshCartModalInPlace();
}


function refreshCartModalInPlace() {
  const modal = document.querySelector(".cart-modal");
  if (!modal) return;

  const list = modal.querySelector(".cart-items-list");
  if (list) {
    list.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div class="cart-item-icon"></div>
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <small>₹${item.price} each</small>
          <div class="qty">
            <button onclick="decreaseQuantity(${index})">−</button>
            <b>${item.quantity || 1}</b>
            <button onclick="increaseQuantity(${index})">+</button>
          </div>
        </div>
        <strong>₹${(Number(item.price) || 0) * (Number(item.quantity) || 1)}</strong>
      </div>
    `).join("");
  }

  const total = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  const totalValue = modal.querySelector(".summary-total span:last-child");
  if (totalValue) {
    totalValue.textContent = "₹" + total;
  }
}

function decreaseQuantity(index) {
  if (!cart[index]) return;

  if ((Number(cart[index].quantity) || 1) > 1) {
    cart[index].quantity -= 1;
  } else {
    cart.splice(index, 1);
  }

  try {
    localStorage.setItem("restaurant_cart", JSON.stringify(cart));
  } catch (e) {}

  updateCart();

  if (cart.length > 0) {
    refreshCartModalInPlace();
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

  window.pendingOrderMeta = {
    type: "dine_in",
    name: document.getElementById("dineName")?.value.trim() || "",
    phone: document.getElementById("dinePhone")?.value.trim() || "",
    address: "",
    city: "",
    pincode: "",
    notes: "Table " + String(selectedTable).padStart(2, "0")
  };

  document.querySelector(".cart-modal")?.remove();

  showFinalOrderScreen(
    "Dine In",
    "Table " + String(selectedTable).padStart(2, "0")
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

  const landmark =
    document.getElementById("deliveryLandmark")?.value.trim() || "";

  if (!name || !phone || !address || !pincode) {
    alert("Please fill all required delivery details.");
    return;
  }

  window.pendingOrderMeta = {
    type: "home_delivery",
    name,
    phone,
    address,
    city: "",
    pincode,
    notes: landmark ? "Landmark: " + landmark : ""
  };

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

      
      <div id="homeDeliveryPaymentBox"
        style="margin:18px 0;padding:16px;border:1px solid #eee;border-radius:14px;background:#fafafa;">

        <div style="font-weight:700;font-size:17px;margin-bottom:12px;">
          💳 Payment Method
        </div>

        <label style="display:flex;align-items:center;gap:10px;padding:12px;background:#fff;border:1px solid #ddd;border-radius:10px;margin-bottom:8px;cursor:pointer;">
          <input
            type="radio"
            name="homeDeliveryPaymentMethod"
            value="cash"
            checked
            onchange="window.selectedHomeDeliveryPaymentMethod='cash'">
          <span>💵 Cash Payment / Cash on Delivery</span>
        </label>

        <label
          id="onlinePaymentOption"
          style="display:none;align-items:center;gap:10px;padding:12px;background:#fff;border:1px solid #ddd;border-radius:10px;cursor:pointer;">
          <input
            type="radio"
            name="homeDeliveryPaymentMethod"
            value="online"
            onchange="window.selectedHomeDeliveryPaymentMethod='online'">
          <span>💳 Online Payment</span>
        </label>

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
  
  window.selectedHomeDeliveryPaymentMethod = "cash";

  const paymentBox =
    document.getElementById("homeDeliveryPaymentBox");

  if (paymentBox) {
    if (type === "Home Delivery") {

      fetch("/api/payment-methods")
        .then(response => response.json())
        .then(paymentInfo => {

          const onlineOption =
            document.getElementById("onlinePaymentOption");

          if (
            onlineOption &&
            paymentInfo?.online_payment === true
          ) {
            onlineOption.style.display = "flex";
          }

        })
        .catch(error => {
          console.warn("Payment methods unavailable:", error);
        });

    } else {
      paymentBox.style.display = "none";
    }
  }

}


async function placeDemoOrder() {

  if (!cart || cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  const meta = window.pendingOrderMeta || {};

  const selectedPaymentMethod =
    meta.type === "home_delivery"
      ? (window.selectedHomeDeliveryPaymentMethod || "cash")
      : "cash";

  if (
    meta.type === "home_delivery" &&
    selectedPaymentMethod === "online"
  ) {
    alert(
      "Online payment is selected, but payment has not been verified yet.\n\n" +
      "Please complete online payment first."
    );
    return;
  }


  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)),
    0
  );

  const button = document.querySelector(".cart-modal .form-submit");

  if (button) {
    button.disabled = true;
    button.textContent = "⏳ Placing Order...";
  }

  try {

    /* Get this restaurant's ID */
    const restaurantResult = await supabaseClient
      .from("restaurants")
      .select("id")
      .eq("slug", "golden-thali")
      .single();

    if (restaurantResult.error || !restaurantResult.data) {
      throw restaurantResult.error || new Error("Restaurant not found.");
    }

    const restaurantId = restaurantResult.data.id;

    /* Create order */
    const orderPayload = {
      restaurant_id: restaurantId,
      order_type: meta.type === "dine_in" ? "dine_in" : "home_delivery",
      customer_name: meta.name || "",
      customer_phone: meta.phone || "",
      delivery_address: meta.address || "",
      delivery_city: meta.city || "",
      delivery_pincode: meta.pincode || "",
      subtotal: subtotal,
      delivery_charge: 0,
      discount: 0,
      total: subtotal,
      payment_method:
        meta.type === "home_delivery"
          ? (window.selectedHomeDeliveryPaymentMethod || "cash")
          : "cash",
      payment_status: "pending",
      status: "pending",
      notes: meta.notes || ""
    };

    const orderResult = await supabaseClient
      .from("orders")
      .insert(orderPayload)
      .select("id, order_number")
      .single();

    if (orderResult.error || !orderResult.data) {
      throw orderResult.error || new Error("Order could not be created.");
    }

    const orderId = orderResult.data.id;

    /* Save every cart item */
    const itemPayload = cart.map(item => ({
      order_id: orderId,
      product_id: item.productId || item.id || null,
      product_name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity || 1),
      subtotal:
        Number(item.price) * Number(item.quantity || 1)
    }));

    const itemsResult = await supabaseClient
      .from("order_items")
      .insert(itemPayload);

    if (itemsResult.error) {
      throw itemsResult.error;
    }

    /* Clear cart only after successful database save */
    cart = [];
    localStorage.setItem("restaurant_cart", JSON.stringify(cart));
    updateCart();

    document.querySelector(".cart-modal")?.remove();

    const successModal = document.createElement("div");
    successModal.className = "cart-modal show";

    successModal.innerHTML = `
      <div class="order-form-box">
        <div class="form-title">
          <div style="font-size:55px;">✅</div>
          <h2>Order Placed!</h2>
          <p>Your order has been received successfully.</p>
          <p><b>Order #${orderResult.data.order_number || ""}</b></p>
        </div>

        <button
          class="form-submit"
          onclick="this.closest('.cart-modal').remove()">
          Done
        </button>
      </div>
    `;

    document.body.appendChild(successModal);

    window.pendingOrderMeta = null;

  } catch (error) {

    console.error("REAL ORDER ERROR:", error);

    if (button) {
      button.disabled = false;
      button.textContent = "✓ Place Order";
    }

    alert(
      "❌ Order could not be placed.\n\n" +
      (error.message || "Unknown error")
    );
  }
}


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


/* =========================================================
   SUPABASE CUSTOMER MENU
   Load products added from Admin Panel
   ========================================================= */

let customerProducts = [];

async function loadCustomerProducts() {
  try {
    if (typeof supabaseClient === "undefined") {
      console.error("Supabase client not found.");
      return;
    }

    const { data, error } = await supabaseClient
      .from("products")
      .select(`
        id,
        name,
        price,
        description,
        photo_url,
        available,
        bestseller,
        category_id,
        subcategory_id
      `)
      .eq("available", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Products loading error:", error);
      return;
    }

    customerProducts = data || [];

    console.log("Supabase products loaded:", customerProducts);

    renderCustomerPopularProducts();
  } catch (err) {
    console.error("Customer menu error:", err);
  }
}


/* ---------- Product Photo ---------- */

function getProductPhoto(product) {

  if (!product.photo_url) {
    return null;
  }

  /* If photo_url is already a complete URL */
  if (
    product.photo_url.startsWith("http://") ||
    product.photo_url.startsWith("https://")
  ) {
    return product.photo_url;
  }

  /* If only storage path is saved */
  try {
    const { data } = supabaseClient
      .storage
      .from("product-images")
      .getPublicUrl(product.photo_url);

    return data?.publicUrl || null;

  } catch (err) {
    return null;
  }
}


/* ---------- Popular Products ---------- */

function renderCustomerPopularProducts() {

  const grid = document.querySelector(".food-grid");

  if (!grid || !customerProducts.length) {
    return;
  }

  const popular = customerProducts
    .filter(product => product.bestseller === true)
    .slice(0, 4);

  const productsToShow =
    popular.length > 0
      ? popular
      : customerProducts.slice(0, 4);

  grid.innerHTML = productsToShow
    .map(product => customerProductCard(product))
    .join("");
}


/* ---------- Customer Product Card ---------- */

function customerProductCard(product) {

  const photo = getProductPhoto(product);

  const imageHTML = photo
    ? `
      <img
        src="${photo}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
        style="
          width:100%;
          height:100%;
          object-fit:cover;
          border-radius:inherit;
          display:block;
        "
      >
    `
    : `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:55px;
      ">
        🍽️
      </div>
    `;

  return `
    <article class="food-card">

      <div class="food-photo" style="overflow:hidden;">
        ${imageHTML}
      </div>

      <div class="food-info">

        ${
          product.bestseller
            ? `<span class="badge">Bestseller</span>`
            : ""
        }

        <div class="food-row">
          <h3>${escapeHTML(product.name)}</h3>
          <b>₹${Number(product.price || 0)}</b>
        </div>

        <p>
          ${escapeHTML(product.description || "Delicious food prepared fresh for you.")}
        </p>

        <button
          onclick="addToCart(
            '${escapeJS(product.name)}',
            ${Number(product.price || 0)},
            this
          )"
        >
          + Add
        </button>

      </div>

    </article>
  `;
}


/* ---------- Safe Text ---------- */

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeJS(value) {

  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}


/* =========================================================
   DYNAMIC FULL MENU
   ========================================================= */

;


/* =========================================================
   CATEGORY / SUB-CATEGORY
   ========================================================= */

async function loadSupabaseCategories() {

  const tabs = document.getElementById("supabaseMenuTabs");

  if (!tabs) return;

  try {

    const categoryIds = [
      ...new Set(
        customerProducts
          .map(p => p.category_id)
          .filter(Boolean)
      )
    ];

    if (!categoryIds.length) return;

    const { data, error } = await supabaseClient
      .from("categories")
      .select("id,name")
      .in("id", categoryIds);

    if (error) {
      console.error("Category loading error:", error);
      return;
    }

    const categories = data || [];

    categories.forEach(category => {

      const button = document.createElement("button");

      button.className = "menu-tab";

      button.textContent = category.name;

      button.dataset.categoryId = category.id;

      button.onclick = function() {

        filterSupabaseCategory(category.id, this);

      };

      tabs.appendChild(button);

    });

  } catch (err) {

    console.error("Category error:", err);

  }

}


/* =========================================================
   FULL MENU CONTENT
   ========================================================= */

function renderSupabaseMenuContent(products = customerProducts) {

  if (!products.length) {

    return `
      <div style="
        text-align:center;
        padding:50px 20px;
        color:#777;
      ">
        <div style="font-size:50px;">🍽️</div>
        <h3>No dishes available</h3>
        <p>Please check back soon.</p>
      </div>
    `;

  }

  const grouped = {};

  products.forEach(product => {

    const category =
      product.category_id || "other";

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(product);

  });


  return Object.keys(grouped)
    .map(categoryId => {

      const items = grouped[categoryId];

      return `

        <div
          class="menu-category supabase-menu-category"
          data-category-id="${categoryId}"
        >

          <div class="menu-category-title">

            <h3>
              🍽️ ${getCategoryName(categoryId)}
            </h3>

            <span>
              ${items.length} items
            </span>

          </div>

          ${items
 .map(product => `
              <div
                class="menu-row supabase-menu-row"
                data-name="${escapeHTML(
                  product.name.toLowerCase()
                )}"
              >

                <div
                  class="menu-row-icon"
                  style="overflow:hidden;"
                >

                  ${
                    getProductPhoto(product)
                      ? `
                        <img
                          src="${getProductPhoto(product)}"
                          alt="${escapeHTML(product.name)}"
                          style="
                            width:100%;
                            height:100%;
                            object-fit:cover;
                            border-radius:12px;
                          "
                        >
                      `
                      : "🍽️"
                  }

                </div>

                <div class="menu-row-info">

                  <strong>
                    ${escapeHTML(product.name)}
                  </strong>

                  <span>
                    ${escapeHTML(
                      product.description || ""
                    )}
                  </span>

                </div>

                <div class="menu-price">
                  ₹${Number(product.price || 0)}
                </div>

                <button
                  class="menu-add"
                  onclick="addToCart(
                    '${escapeJS(product.name)}',
                    ${Number(product.price || 0)},
                    this
                  )"
                >
                  + Add
                </button>

              </div>
            `)
            .join("")}

        </div>

      `;

    })
    .join("");

}


/* ---------- Category Names ---------- */

function getCategoryName(id) {

  const product = customerProducts.find(
    p => p.category_id === id
  );

  return product?.category_name || "Menu";

}


/* ---------- Category Filter ---------- */

window.filterSupabaseCategory = function(categoryId, button) {

  document
    .querySelectorAll("#supabaseMenuTabs .menu-tab")
    .forEach(tab => tab.classList.remove("active"));

  button?.classList.add("active");

  document
    .querySelectorAll(".supabase-menu-category")
    .forEach(section => {

      if (
        categoryId === "all" ||
        section.dataset.categoryId === categoryId
      ) {

        section.style.display = "";

      } else {

        section.style.display = "none";

      }

    });

};


/* ---------- Search ---------- */

window.filterSupabaseMenu = function(value) {

  const query =
    String(value || "")
      .toLowerCase()
      .trim();

  document
    .querySelectorAll(".supabase-menu-category")
    .forEach(section => {

      let visible = 0;

      section
        .querySelectorAll(".supabase-menu-row")
        .forEach(row => {

          const name =
            row.dataset.name || "";

          if (name.includes(query)) {

            row.style.display = "";
            visible++;

          } else {

            row.style.display = "none";

          }

        });

      section.style.display =
        visible > 0 ? "" : "none";

    });

};


/* =========================================================
   LOAD WHEN CUSTOMER WEBSITE OPENS
   ========================================================= */

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    loadCustomerProducts
  );

} else {

  loadCustomerProducts();

}


/* =========================================================
   FINAL SUPABASE FULL MENU
   Admin Categories + Products -> Customer Full Menu
   ========================================================= */

let liveMenuProducts = [];
let liveMenuCategories = [];

;


/* LOAD CATEGORIES + PRODUCTS */

async function loadLiveMenu() {

  const content = document.getElementById("liveMenuContent");

  try {

    if (typeof supabaseClient === "undefined") {
      throw new Error("Supabase client not found");
    }

    /* Categories */

    const categoryResult = await supabaseClient
      .from("categories")
      .select("id,name,parent_id")
      .order("name");

    if (categoryResult.error) {
      throw categoryResult.error;
    }

    liveMenuCategories = categoryResult.data || [];


    /* Products */

    const productResult = await supabaseClient
      .from("products")
      .select(`
        id,
        name,
        price,
        description,
        photo_url,
        available,
        bestseller,
        category_id,
        subcategory_id
      `)
      .eq("available", true)
      .order("created_at", { ascending: false });

    if (productResult.error) {
      throw productResult.error;
    }

    liveMenuProducts = productResult.data || [];


    renderLiveMenuTabs();
    renderLiveMenu();


  } catch (error) {

    console.error("FULL MENU ERROR:", error);

    if (content) {
      content.innerHTML = `
        <div style="
          text-align:center;
          padding:45px 20px;
          color:#777;
        ">
          <div style="font-size:45px;">⚠️</div>

          <h3>Menu could not be loaded</h3>

          <p style="font-size:13px;">
            ${escapeHTML(error.message || "Unknown error")}
          </p>
        </div>
      `;
    }
  }
}


/* CATEGORY TABS */

function renderLiveMenuTabs() {

  const tabs = document.getElementById("liveMenuTabs");

  if (!tabs) return;

  const parents = liveMenuCategories.filter(
    category => !category.parent_id
  );

  tabs.innerHTML = `
    <button
      class="menu-tab active"
      onclick="showLiveCategory('all',this)">
      All
    </button>
  `;

  parents.forEach(category => {

    const button = document.createElement("button");

    button.className = "menu-tab";

    button.textContent = category.name;

    button.onclick = function () {
      showLiveCategory(category.id, this);
    };

    tabs.appendChild(button);

  });
}


/* MENU */

function renderLiveMenu(products = liveMenuProducts) {

  const content = document.getElementById("liveMenuContent");

  if (!content) return;

  if (!products.length) {

    content.innerHTML = `
      <div style="
        text-align:center;
        padding:50px 20px;
        color:#777;
      ">
        <div style="font-size:50px;">🍽️</div>
        <h3>No dishes available</h3>
        <p>Please check back soon.</p>
      </div>
    `;

    return;
  }


  const parents = liveMenuCategories.filter(
    category => !category.parent_id
  );


  let html = "";


  parents.forEach(parent => {

    const categoryProducts = products.filter(product => {

      const category = liveMenuCategories.find(
        c => c.id === product.category_id
      );

      if (!category) return false;

      return (
        category.id === parent.id ||
        category.parent_id === parent.id
      );

    });


    if (!categoryProducts.length) return;


    html += `
      <div
        class="menu-category live-menu-category"
        data-category-id="${parent.id}"
      >

        <div class="menu-category-title">
          <h3>🍽️ ${escapeHTML(parent.name)}</h3>

          <span>
            ${categoryProducts.length} items
          </span>
        </div>

        ${categoryProducts
          .map(product => liveMenuItem(product))
          .join("")}

      </div>
    `;

  });


  /* Products without matching category */

  const uncategorized = products.filter(product => {

    return !liveMenuCategories.some(
      category => category.id === product.category_id
    );

  });


  if (uncategorized.length) {

    html += `
      <div class="menu-category live-menu-category">

        <div class="menu-category-title">
          <h3>🍽️ Other</h3>
          <span>${uncategorized.length} items</span>
        </div>

        ${uncategorized
          .map(product => liveMenuItem(product))
          .join("")}

      </div>
    `;

  }


  content.innerHTML = html || `
    <div style="
      text-align:center;
      padding:50px 20px;
      color:#777;
    ">
      <div style="font-size:50px;">🍽️</div>
      <h3>No dishes available</h3>
    </div>
  `;
}


/* PRODUCT CARD */

function liveMenuItem(product) {

  const photo = getLiveProductPhoto(product);

  return `
    <div
      class="menu-row live-menu-row"
      data-category-id="${product.category_id || ""}"
      data-name="${escapeHTML(
        String(product.name || "").toLowerCase()
      )}"
    >

      <div
        class="menu-row-icon"
        style="overflow:hidden;"
      >

        ${
          photo
            ? `
              <img
                src="${photo}"
                alt="${escapeHTML(product.name)}"
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                  border-radius:12px;
                "
              >
            `
            : "🍽️"
        }

      </div>


      <div class="menu-row-info">

        <strong>
          ${escapeHTML(product.name)}
        </strong>

        <span>
          ${escapeHTML(
            product.description || ""
          )}
        </span>

        ${
          product.bestseller
            ? `<small style="color:#d97706;font-weight:700;">
                 Bestseller
               </small>`
            : ""
        }

      </div>


      <div class="menu-price">
        ₹${Number(product.price || 0)}
      </div>


      <button
        class="menu-add"
        onclick="addToCart(
          '${escapeJS(product.name)}',
          ${Number(product.price || 0)},
          this
        )"
      >
        + Add
      </button>

    </div>
  `;
}


/* PHOTO */

function getLiveProductPhoto(product) {

  if (!product.photo_url) {
    return null;
  }

  if (
    product.photo_url.startsWith("http://") ||
    product.photo_url.startsWith("https://")
  ) {
    return product.photo_url;
  }

  try {

    const result = supabaseClient
      .storage
      .from("product-images")
      .getPublicUrl(product.photo_url);

    return result?.data?.publicUrl || null;

  } catch (error) {

    console.error("PHOTO ERROR:", error);

    return null;
  }
}


/* CATEGORY FILTER */

window.showLiveCategory = function(categoryId, button) {

  document
    .querySelectorAll("#liveMenuTabs .menu-tab")
    .forEach(tab => {
      tab.classList.remove("active");
    });

  button?.classList.add("active");


  const sections = document.querySelectorAll(
    ".live-menu-category"
  );


  sections.forEach(section => {

    if (
      categoryId === "all" ||
      section.dataset.categoryId === categoryId
    ) {
      section.style.display = "";
    } else {
      section.style.display = "none";
    }

  });

};


/* SEARCH */

window.searchLiveMenu = function(value) {

  const query = String(value || "")
    .toLowerCase()
    .trim();


  document
    .querySelectorAll(".live-menu-category")
    .forEach(section => {

      let visible = 0;


      section
        .querySelectorAll(".live-menu-row")
        .forEach(row => {

          const name =
            row.dataset.name || "";

          if (name.includes(query)) {

            row.style.display = "";

            visible++;

          } else {

            row.style.display = "none";

          }

        });


      section.style.display =
        visible > 0 ? "" : "none";

    });

};


window.openFullMenu = async function () {

  const old = document.querySelector(".full-menu-modal");
  if (old) old.remove();

  const modal = document.createElement("div");
  modal.className = "full-menu-modal show";

  modal.innerHTML = `
    <div class="full-menu-box">

      <div class="full-menu-top">
        <div class="full-menu-brand">
          <small>RESTAURANT MENU</small>
          <h2>Our Menu</h2>
        </div>

        <button class="full-menu-close"
          onclick="this.closest('.full-menu-modal').remove()">
          ×
        </button>
      </div>

      <input
        class="menu-search"
        id="customerMenuSearch"
        placeholder="🔍 Search dishes..."
      >

      <div class="menu-tabs" id="customerMenuTabs">
        <button class="menu-tab active">All</button>
      </div>

      <div id="customerMenuContent"
           style="padding-top:20px;text-align:center;">
        <div style="font-size:40px;">⏳</div>
        <p>Loading menu...</p>
      </div>

    </div>
  `;

  document.body.appendChild(modal);

  await loadFinalCustomerMenu();
};


/* LOAD DATA */

async function loadFinalCustomerMenu() {

  const content = document.getElementById("customerMenuContent");

  if (!content) return;

  try {

    if (typeof supabaseClient === "undefined") {
      throw new Error("Supabase client is not loaded");
    }

    /* Load categories + products at the same time */
    const [catResult, productResult] = await Promise.all([

      supabaseClient
        .from("categories")
        .select("id,name,parent_id")
        .order("name"),

      supabaseClient
        .from("products")
        .select(`
          id,
          name,
          price,
          description,
          photo_url,
          available,
          bestseller,
          category_id
        `)
        .eq("available", true)
        .order("created_at", { ascending: false })

    ]);

    if (catResult.error) {
      throw new Error("Categories: " + catResult.error.message);
    }

    if (productResult.error) {
      throw new Error("Products: " + productResult.error.message);
    }

    const categories = catResult.data || [];
    const products = productResult.data || [];

    console.log("FAST CUSTOMER MENU:", {
      categories: categories.length,
      products: products.length
    });

    /* Create category tabs */
    const tabs = document.getElementById("customerMenuTabs");

    if (tabs) {

      tabs.innerHTML = `<button class="menu-tab active">All</button>`;

      const parentCategories = categories.filter(function (c) {
        return !c.parent_id;
      });

      parentCategories.forEach(function (category) {

        const btn = document.createElement("button");

        btn.className = "menu-tab";
        btn.textContent = category.name;

        btn.onclick = function () {

          document
            .querySelectorAll("#customerMenuTabs .menu-tab")
            .forEach(function (x) {
              x.classList.remove("active");
            });

          btn.classList.add("active");

          const filtered = products.filter(function (p) {

            return (
              p.category_id === category.id ||
              categories.some(function (sub) {
                return (
                  sub.id === p.category_id &&
                  sub.parent_id === category.id
                );
              })
            );

          });

          renderFinalCustomerProducts(filtered, categories);
        };

        tabs.appendChild(btn);

      });
    }

    /* Render all products immediately */
    renderFinalCustomerProducts(products, categories);

    /* Search */
    const search = document.getElementById("customerMenuSearch");

    if (search && !search.dataset.fastMenuReady) {

      search.dataset.fastMenuReady = "true";

      search.addEventListener("input", function () {

        const q = this.value.toLowerCase().trim();

        const filtered = q
          ? products.filter(function (p) {
              return String(p.name || "")
                .toLowerCase()
                .includes(q);
            })
          : products;

        renderFinalCustomerProducts(filtered, categories);

      });
    }

  } catch (error) {

    console.error("FAST CUSTOMER MENU ERROR:", error);

    content.innerHTML = `
      <div style="
        padding:35px 15px;
        text-align:center;
        color:#b91c1c;
      ">
        <div style="font-size:45px;">⚠️</div>
        <h3>Menu Loading Error</h3>
        <p style="
          font-size:13px;
          word-break:break-word;
        ">
          ${typeof escapeHTML === "function"
            ? escapeHTML(error.message)
            : error.message}
        </p>
      </div>
    `;
  }
}


/* RENDER PRODUCTS */

function renderFinalCustomerProducts(
  products,
  categories
) {

  const content =
    document.getElementById("customerMenuContent");

  if (!content) return;


  if (!products.length) {

    content.innerHTML = `
      <div style="
        padding:50px 20px;
        text-align:center;
        color:#777;
      ">
        <div style="font-size:50px;">🍽️</div>
        <h3>No dishes available</h3>
        <p>
          Add an available product from Admin Panel.
        </p>
      </div>
    `;

    return;
  }


  const grouped = {};


  products.forEach(product => {

    const cat =
      categories.find(
        c => c.id === product.category_id
      );

    const name =
      cat?.name || "Other";


    if (!grouped[name]) {
      grouped[name] = [];
    }

    grouped[name].push(product);

  });


  let html = "";


  Object.entries(grouped)
    .forEach(([categoryName, items]) => {

      html += `
        <div class="menu-category">

          <div class="menu-category-title">
            <h3>
              🍽️ ${escapeHTML(categoryName)}
            </h3>

            <span>
              ${items.length} items
            </span>
          </div>

          ${items.map(product => {

            let photo = null;

            if (product.photo_url) {

              if (
                product.photo_url
                  .startsWith("http")
              ) {

                photo =
                  product.photo_url;

              } else {

                try {

                  photo =
                    supabaseClient
                      .storage
                      .from("product-images")
                      .getPublicUrl(
                        product.photo_url
                      )
                      .data
                      .publicUrl;

                } catch(e) {}

              }

            }


            return `
              <div class="menu-row">

                <div
                  class="menu-row-icon"
                  style="overflow:hidden;"
                >

                  ${
                    photo
                    ? `
                      <img
                        src="${photo}"
                        style="
                          width:100%;
                          height:100%;
                          object-fit:cover;
                          border-radius:12px;
                        "
                      >
                    `
                    : "🍽️"
                  }

                </div>


                <div class="menu-row-info">

                  <strong>
                    ${escapeHTML(product.name)}
                  </strong>

                  <span>
                    ${escapeHTML(
                      product.description || ""
                    )}
                  </span>

                  ${
                    product.bestseller
                    ? `
                      <small style="
                        color:#d97706;
                        font-weight:700;
                      ">
                        Bestseller
                      </small>
                    `
                    : ""
                  }

                </div>


                <div class="menu-price">
                  ₹${Number(product.price || 0)}
                </div>


                <button
                  class="menu-add"
                  onclick="addToCart(
                    '${escapeJS(product.name)}',
                    ${Number(product.price || 0)},
                    this
                  )"
                >
                  + Add
                </button>

              </div>
            `;

          }).join("")}

        </div>
      `;

    });


  content.innerHTML = html;
}


/* STOP ALL OLD FULL MENU CLICK HANDLERS */

document.addEventListener(
  "click",
  function(event) {

    const button =
      event.target.closest(".view-menu");

    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    window.openFullMenu();

  },
  true
);

/* ===== FINAL CART ADD FIX ===== */
function addToCart(name, price, button = null) {
  price = Number(price) || 0;

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
    button.innerHTML = "✓ Added";
    button.classList.add("added");

    setTimeout(() => {
      button.innerHTML = "+ Add";
      button.classList.remove("added");
    }, 1200);
  }

  showMenuToast(name + " added to your order");
}

function updateCart() {
  const totalItems = cart.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0
  );

  const totalAmount = cart.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1),
    0
  );

  const cartText = document.getElementById("cartText");

  if (cartText) {
    cartText.textContent =
      totalItems + " items • ₹" + totalAmount;
  }

  const cartCount = document.querySelector(".cart-count");
  if (cartCount) {
    cartCount.textContent = totalItems;
  }
}

function showMenuToast(message) {
  document.querySelector(".menu-toast")?.remove();

  const toast = document.createElement("div");
  toast.className = "menu-toast";
  toast.innerHTML = "✓ " + message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 20);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 1800);
}

window.addToCart = addToCart;
window.updateCart = updateCart;
window.showMenuToast = showMenuToast;

console.log("FINAL CART FIX LOADED");



/* ===== CLEAN FINAL ADD BUTTON + QUANTITY BOX ===== */
(function () {

  function saveCartData() {
    try {
      localStorage.setItem("restaurant_cart", JSON.stringify(cart));
    } catch (e) {}
  }

  function getQty(name) {
    const item = cart.find(i => i.name === name);
    return item ? (Number(item.quantity) || 1) : 0;
  }

  function refreshAddBoxes() {
    document.querySelectorAll("button").forEach(function (btn) {

      const onclick = btn.getAttribute("onclick") || "";
      const match = onclick.match(/addToCart\(['"](.+?)['"]/);

      if (!match) return;

      const name = match[1];
      const qty = getQty(name);
      const parent = btn.parentElement;

      if (!parent) return;

      /* Remove/hide any old +/- quantity control */
      parent.querySelectorAll(".item-qty-control").forEach(function (old) {
        old.remove();
      });

      let box = parent.querySelector(".item-added-count");

      if (qty > 0) {

        if (!box) {
          box = document.createElement("span");
          box.className = "item-added-count";
          btn.parentElement.insertBefore(box, btn);
        }

        box.textContent = qty;
        box.style.display = "inline-flex";

      } else if (box) {

        box.remove();

      }

      btn.textContent = "+ Add";
      btn.classList.remove("added");
    });
  }

  /* Final Add function */
  window.addToCart = function (name, price, button) {

    price = Number(price) || 0;

    const existing = cart.find(function (item) {
      return item.name === name;
    });

    if (existing) {

      existing.quantity = (Number(existing.quantity) || 1) + 1;

    } else {

      cart.push({
        name: name,
        price: price,
        quantity: 1
      });

    }

    saveCartData();

    if (typeof updateCart === "function") {
      updateCart();
    }

    refreshAddBoxes();

    if (typeof showMenuToast === "function") {
      showMenuToast(name + " added to your order");
    }
  };

  /* Restore cart after refresh */
  try {

    const saved = localStorage.getItem("restaurant_cart");

    if (saved) {

      const savedCart = JSON.parse(saved);

      if (Array.isArray(savedCart)) {

        cart.length = 0;

        savedCart.forEach(function (item) {

          cart.push({
            name: item.name,
            price: Number(item.price) || 0,
            quantity: Number(item.quantity) || 1
          });

        });
      }
    }

  } catch (e) {}

  /* Final quantity-box design */
  const style = document.createElement("style");

  style.textContent = `
    .item-qty-control {
      display: none !important;
    }

    .item-added-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 7px;
      margin-right: 7px;
      border: 1px solid currentColor;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      vertical-align: middle;
    }

    .menu-add {
      white-space: nowrap;
    }
  `;

  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(refreshAddBoxes, 300);
    setTimeout(refreshAddBoxes, 1000);
  });

  /* Refresh when Full Menu/Home dynamically creates buttons */
  const observer = new MutationObserver(function () {
    clearTimeout(window.__cleanAddBoxTimer);

    window.__cleanAddBoxTimer = setTimeout(function () {
      refreshAddBoxes();
    }, 150);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.refreshAddBoxes = refreshAddBoxes;

  console.log("CLEAN FINAL ADD BOX LOADED");

})();


// SUPABASE POPULAR DISHES
async function loadPopularDishes() {
  const grid = document.getElementById("popularDishesGrid");
  if (!grid || typeof supabaseClient === "undefined") return;

  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("id,name,price,description,photo_url,available,bestseller")
      .eq("available", true)
      .eq("bestseller", true)
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) {
      console.error("Popular dishes error:", error);
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;">
          <p>Popular dishes could not be loaded.</p>
        </div>`;
      return;
    }

    if (!data || data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:30px;">
          <p>No popular dishes selected yet.</p>
          <small>Admin Panel → Products → turn Bestseller ON.</small>
        </div>`;
      return;
    }

    grid.innerHTML = data.map(item => {
      const image = item.photo_url
        ? `<img src="${item.photo_url}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`
        : `<div style="font-size:70px;display:flex;align-items:center;justify-content:center;width:100%;height:100%;">🍽️</div>`;

      const description = item.description || "Delicious food prepared fresh for you.";

      return `
        <article class="food-card">
          <div class="food-photo" style="overflow:hidden;">
            ${image}
          </div>

          <div class="food-info">
            <span class="badge">Bestseller</span>

            <div class="food-row">
              <h3>${item.name}</h3>
              <b>₹${item.price}</b>
            </div>

            <p>${description}</p>

            <button onclick="addToCart('${String(item.name).replace(/'/g, "\\'")}',${Number(item.price)})">
              + Add
            </button>
          </div>
        </article>
      `;
    }).join("");

  } catch (err) {
    console.error("Popular dishes crashed:", err);
  }
}

document.addEventListener("DOMContentLoaded", loadPopularDishes);

/* ===== RESERVATION TABLE PICKER V1 ===== */
function showReservationTablePicker(){
  const ctx = window.reservationContext;
  if(!ctx || !ctx.availableTables?.length) return;

  const old = document.getElementById("reservationTablePicker");
  if(old) old.remove();

  const popup = document.createElement("div");
  popup.id = "reservationTablePicker";

  popup.innerHTML = `
    <div class="reservation-picker-box">
      <button type="button" class="reservation-picker-close"
        onclick="this.closest('#reservationTablePicker').remove()">×</button>

      <h2>Choose Your Table</h2>
      <p>Select an available table for your reservation.</p>

      <div class="reservation-table-list">
        ${ctx.availableTables.map(t => `
          <button type="button"
            class="reservation-table-option"
            onclick="selectReservationTable('${t.id}')">
            <strong>Table ${t.table_number}</strong>
            <span>👥 Up to ${t.capacity} Guests</span>
            ${t.table_type ? `<small>${t.table_type}</small>` : ""}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(popup);
}

function selectReservationTable(tableId){
  const ctx = window.reservationContext;
  if(!ctx) return;

  const table = ctx.availableTables.find(
    t => String(t.id) === String(tableId)
  );

  if(!table) return;

  ctx.selectedTable = table;
  window.forcedReservationTableId = table.id;

  const picker = document.getElementById("reservationTablePicker");
  if(picker) picker.remove();

  const fee = Number(ctx.reservationFee || 0);
  const paymentLink = String(ctx.paymentLink || "").trim();

  const popup = document.createElement("div");
  popup.id = "reservationPaymentPopup";

  popup.innerHTML = `
    <div class="reservation-picker-box">
      <button type="button"
        class="reservation-picker-close"
        onclick="this.closest('#reservationPaymentPopup').remove()">×</button>

      <div style="font-size:48px;">🍽️</div>
      <h2>Table Selected</h2>

      <p style="margin:8px 0;">
        <b>Table ${table.table_number}</b>
      </p>

      <p style="color:#666;">
        ${ctx.guests} Guest${ctx.guests > 1 ? "s" : ""}
      </p>

      ${
        fee > 0
          ? `
            <div style="
              margin:18px 0;
              padding:16px;
              border-radius:14px;
              background:#fff7e8;
              border:1px solid #f0d28a;
            ">
              <div style="font-size:14px;color:#777;">
                Reservation Fee
              </div>
              <div style="font-size:30px;font-weight:700;">
                ₹${fee.toFixed(2)}
              </div>
              <div style="font-size:13px;color:#087f23;margin-top:5px;">
                ${ctx.reservationRefundable !== false
                  ? "100% refundable"
                  : "Non-refundable"}
              </div>
            </div>

            ${
              paymentLink
                ? `
                  <button
                    type="button"
                    class="primary-btn"
                    onclick="openReservationPayment()">
                    💳 Pay ₹${fee.toFixed(2)}
                  </button>

                  <button
                    type="button"
                    class="primary-btn"
                    style="margin-top:10px;background:#087f23;"
                    onclick="completeReservationAfterPayment()">
                    ✅ I Have Paid
                  </button>
                `
                : `
                  <div style="
                    padding:12px;
                    border-radius:10px;
                    background:#fff0f0;
                    color:#b00020;
                    font-size:14px;
                  ">
                    Payment link is not configured by the restaurant.
                  </div>
                `
            }
          `
          : `
            <p style="margin:18px 0;color:#087f23;">
              No reservation fee required.
            </p>

            <button
              type="button"
              class="primary-btn"
              onclick="completeReservationWithoutPayment()">
              ✅ Confirm Reservation
            </button>
          `
      }
    </div>
  `;

  document.body.appendChild(popup);
}

function openReservationPayment(){
  const ctx = window.reservationContext;
  if(!ctx || !ctx.paymentLink) return;

  window.open(ctx.paymentLink, "_blank");
}

function completeReservationAfterPayment(){
  const ctx = window.reservationContext;
  if(!ctx || !ctx.selectedTable) return;

  window.forcedReservationTableId = ctx.selectedTable.id;

  const popup = document.getElementById("reservationPaymentPopup");
  if(popup) popup.remove();

  if(ctx.form){
    ctx.form.requestSubmit();
  }
}

function completeReservationWithoutPayment(){
  const ctx = window.reservationContext;
  if(!ctx || !ctx.selectedTable) return;

  window.forcedReservationTableId = ctx.selectedTable.id;

  const popup = document.getElementById("reservationPaymentPopup");
  if(popup) popup.remove();

  if(ctx.form){
    ctx.form.requestSubmit();
  }
}

/* ===== END RESERVATION TABLE PICKER V1 ===== */

