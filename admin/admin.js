let currentRestaurant = null;

const pageNames = {
  dashboard: ['Dashboard', 'Restaurant overview'],
  orders: ['Orders', 'Manage all restaurant orders'],
  categories: ['Categories', 'Manage categories and sub-categories'],
  products: ['Products', 'Manage your food menu'],
  tables: ['Tables & QR', 'Manage tables and QR codes'],
  reservations: ['Reservations', 'Manage table reservations'],
  delivery: ['Delivery', 'Manage home delivery'],
  customers: ['Customers', 'Customer information'],
  reports: ['Sales & Reports', 'Revenue and sales analytics'],
  offers: ['Offers & Coupons', 'Manage discounts and offers'],
  settings: ['Restaurant Settings', 'Manage restaurant information']
};


document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('loginForm').addEventListener('submit', login);

  document.getElementById('logoutBtn').addEventListener('click', logout);

  document.getElementById('restaurantSettingsForm')
    .addEventListener('submit', saveSettings);

  document.getElementById('mobileMenuBtn')
    .addEventListener('click', () => {
      document.querySelector('.sidebar').classList.toggle('open');
    });

  document.addEventListener('click', (e) => {

    const pageButton = e.target.closest('[data-page]');

    if(pageButton){
      openPage(pageButton.dataset.page);
    }

  });

  checkSession();
});


async function checkSession(){

  const { data } = await supabaseClient.auth.getSession();

  if(data.session){
    showAdmin(data.session);
  }else{
    showLogin();
  }
}


async function login(e){
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const message = document.getElementById('loginMessage');

  message.style.color = '#b00020';
  message.textContent = '⏳ Signing in...';

  console.log('ADMIN LOGIN START');
  console.log('Email:', email);
  console.log('Supabase URL:', SUPABASE_URL);

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    console.log('LOGIN RESPONSE:', { data, error });

    if(error){
      console.error('SUPABASE LOGIN ERROR:', error);

      message.innerHTML =
        '❌ <b>Login failed</b><br>' +
        'Reason: ' + (error.message || 'Unknown error') +
        '<br><small>Code: ' + (error.code || error.status || 'N/A') + '</small>';

      return;
    }

    if(!data || !data.session){
      message.innerHTML =
        '❌ Login response এসেছে, কিন্তু session পাওয়া যায়নি।<br>' +
        '<small>Console-এ ADMIN LOGIN START / LOGIN RESPONSE দেখুন.</small>';
      console.error('NO SESSION:', data);
      return;
    }

    message.style.color = '#087f23';
    message.textContent = '✅ Login successful. Loading admin panel...';

    console.log('LOGIN SUCCESS');
    console.log('User ID:', data.user?.id);
    console.log('Email:', data.user?.email);

    showAdmin(data.session);

  } catch(err) {
    console.error('ADMIN LOGIN CRASH:', err);

    message.innerHTML =
      '❌ <b>Unexpected Error</b><br>' +
      (err?.message || String(err)) +
      '<br><small>Browser Console দেখুন.</small>';
  }
}


async function logout(){

  await supabaseClient.auth.signOut();

  showLogin();
}


function showLogin(){

  document.getElementById('loginPage').style.display = 'flex';
  document.getElementById('adminApp').style.display = 'none';

}


async function showAdmin(session){

  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('adminApp').style.display = 'flex';

  document.getElementById('adminEmail').textContent =
    session.user.email || 'Admin';

  await loadRestaurant();

}


async function loadRestaurant(){

  const { data: profile, error: profileError } =
    await supabaseClient
      .from('profiles')
      .select('restaurant_id')
      .eq('id', (await supabaseClient.auth.getUser()).data.user.id)
      .single();

  if(profileError || !profile?.restaurant_id){

    console.log('Admin profile is not connected to a restaurant yet.');

    return;
  }

  const { data: restaurant, error } =
    await supabaseClient
      .from('restaurants')
      .select('*')
      .eq('id', profile.restaurant_id)
      .single();

  if(error){

    console.error(error);
    return;
  }

  currentRestaurant = restaurant;

  fillRestaurantSettings(restaurant);

      await loadPaymentSettings();

  document.getElementById('sidebarRestaurantName').textContent =
    restaurant.name || 'Restaurant';

  await loadDashboard();

}


/* =========================================================
   PAYMENT SETTINGS V1
   Supabase payment_settings integration
   ========================================================= */

async function getPaymentApiToken(){
  const { data, error } = await supabaseClient.auth.getSession();

  if(error || !data?.session?.access_token){
    throw new Error("Admin session expired. Please login again.");
  }

  return data.session.access_token;
}

async function loadPaymentSettings(){
  if(!currentRestaurant?.id) return;

  try {
    const token = await getPaymentApiToken();

    const response = await fetch("/api/payment-settings", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const result = await response.json();

    if(!response.ok){
      throw new Error(result.error || "Could not load payment settings.");
    }

    const p = result || {};

    const provider = document.getElementById("paymentProvider");
    const enabled = document.getElementById("paymentEnabled");
    const environment = document.getElementById("paymentEnvironment");
    const cashfreeAppId = document.getElementById("cashfreeAppId");
    const phonepeMerchantId = document.getElementById("phonepeMerchantId");
    const phonepeSaltIndex = document.getElementById("phonepeSaltIndex");
    const manualPaymentLink = document.getElementById("manualPaymentLink");

    if(provider) provider.value = p.provider || "manual";
    if(enabled) enabled.value = String(p.enabled ?? false);
    if(environment) environment.value = p.environment || "sandbox";

    if(cashfreeAppId) cashfreeAppId.value = p.app_id || "";
    if(phonepeMerchantId) phonepeMerchantId.value = p.merchant_id || "";
    if(phonepeSaltIndex) phonepeSaltIndex.value = p.salt_index || "";
    if(manualPaymentLink) manualPaymentLink.value = p.payment_link || "";

    const secretInput = document.getElementById("cashfreeSecretKey");
    const saltInput = document.getElementById("phonepeSaltKey");

    if(secretInput) secretInput.value = "";
    if(saltInput) saltInput.value = "";

  } catch(error) {
    console.error("PAYMENT SETTINGS LOAD ERROR:", error);
  }
}

async function savePaymentSettings(){
  if(!currentRestaurant?.id){
    alert("Restaurant information is not loaded yet.");
    return;
  }

  const message = document.getElementById("paymentSettingsMessage");

  try {
    const token = await getPaymentApiToken();

    const payload = {
      provider:
        document.getElementById("paymentProvider")?.value || "manual",

      enabled:
        document.getElementById("paymentEnabled")?.value === "true",

      environment:
        document.getElementById("paymentEnvironment")?.value || "sandbox",

      app_id:
        document.getElementById("cashfreeAppId")?.value.trim() || null,

      merchant_id:
        document.getElementById("phonepeMerchantId")?.value.trim() || null,

      salt_index:
        document.getElementById("phonepeSaltIndex")?.value.trim() || null,

      payment_link:
        document.getElementById("manualPaymentLink")?.value.trim() || null
    };

    const cashfreeSecret =
      document.getElementById("cashfreeSecretKey")?.value.trim();

    const phonepeSalt =
      document.getElementById("phonepeSaltKey")?.value.trim();

    if(cashfreeSecret){
      payload.secret_key = cashfreeSecret;
    }

    if(phonepeSalt){
      payload.salt_key = phonepeSalt;
    }

    if(message){
      message.innerHTML =
        '<div style="margin-top:15px;padding:12px;border-radius:10px;background:#fff7e8;color:#8a5a00;">⏳ Saving securely...</div>';
    }

    const response = await fetch("/api/payment-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if(!response.ok){
      throw new Error(
        result.error || "Could not save payment settings."
      );
    }

    if(message){
      message.innerHTML =
        '<div style="margin-top:15px;padding:12px;border-radius:10px;background:#eaf8ed;color:#087f23;">✅ Payment settings saved securely.</div>';
    }

    if(document.getElementById("cashfreeSecretKey")){
      document.getElementById("cashfreeSecretKey").value = "";
    }

    if(document.getElementById("phonepeSaltKey")){
      document.getElementById("phonepeSaltKey").value = "";
    }

  } catch(error) {
    console.error("SECURE PAYMENT SETTINGS ERROR:", error);

    if(message){
      message.innerHTML =
        '<div style="margin-top:15px;padding:12px;border-radius:10px;background:#fff0f0;color:#b00020;">❌ ' +
        (error.message || "Could not save payment settings.") +
        '</div>';
    }
  }
}

window.loadPaymentSettings = loadPaymentSettings;
window.savePaymentSettings = savePaymentSettings;

/* END PAYMENT SETTINGS V1 */


function fillRestaurantSettings(r){

  document.getElementById('restaurantName').value = r.name || '';
  document.getElementById('restaurantPhone').value = r.phone || '';
  document.getElementById('restaurantEmail').value = r.email || '';
  document.getElementById('restaurantAddress').value = r.address || '';
  document.getElementById('restaurantCity').value = r.city || '';
  document.getElementById('restaurantState').value = r.state || '';
  document.getElementById('restaurantPincode').value = r.pincode || '';

  document.getElementById('openingTime').value =
    r.opening_time ? String(r.opening_time).slice(0,5) : '';

  document.getElementById('closingTime').value =
    r.closing_time ? String(r.closing_time).slice(0,5) : '';

  const settings = r.settings || {};
  
  const reservationFeeInput =
    document.getElementById('reservationFee');

  if (reservationFeeInput) {
    reservationFeeInput.value =
      Number(settings.reservation_fee || 0);
  }

  const reservationRefundableInput =
    document.getElementById('reservationRefundable');

  if (reservationRefundableInput) {
    reservationRefundableInput.value =
      String(settings.reservation_refundable !== false);
  }

  const reservationPaymentLinkInput =
    document.getElementById('reservationPaymentLink');

  if (reservationPaymentLinkInput) {
    reservationPaymentLinkInput.value =
      settings.reservation_payment_link || '';
  }


  document.getElementById('restaurantWhatsapp').value =
    settings.whatsapp || '';

  document.getElementById('restaurantMap').value =
    settings.map_link || '';

  document.getElementById('deliveryCharge').value =
    settings.delivery_charge ?? 0;

  document.getElementById('minimumOrder').value =
    settings.minimum_order ?? 0;

  document.getElementById('freeDeliveryAbove').value =
    settings.free_delivery_above ?? 0;

  document.getElementById('deliveryTime').value =
    settings.delivery_time || '';

  document.getElementById('deliveryAvailable').value =
    String(settings.delivery_available ?? true);

  document.getElementById('restaurantOpen').value =
    String(r.is_open ?? true);
}


async function saveSettings(e){

  e.preventDefault();

  if(!currentRestaurant){

    showMessage(
      'settingsMessage',
      'Restaurant profile not connected yet.',
      true
    );

    return;
  }

  const settings = {

    ...(currentRestaurant.settings || {}),
      reservation_fee:
        Number(document.getElementById('reservationFee')?.value || 0),

      reservation_refundable:
        document.getElementById('reservationRefundable')?.value !== 'false',

      reservation_payment_link:
        document.getElementById('reservationPaymentLink')?.value.trim() || '',


    whatsapp:
      document.getElementById('restaurantWhatsapp').value.trim(),

    map_link:
      document.getElementById('restaurantMap').value.trim(),

    delivery_charge:
      Number(document.getElementById('deliveryCharge').value || 0),

    minimum_order:
      Number(document.getElementById('minimumOrder').value || 0),

    free_delivery_above:
      Number(document.getElementById('freeDeliveryAbove').value || 0),

    delivery_time:
      document.getElementById('deliveryTime').value.trim(),

    delivery_available:
      document.getElementById('deliveryAvailable').value === 'true'
  };


  const updateData = {

    name:
      document.getElementById('restaurantName').value.trim(),

    phone:
      document.getElementById('restaurantPhone').value.trim(),

    email:
      document.getElementById('restaurantEmail').value.trim(),

    address:
      document.getElementById('restaurantAddress').value.trim(),

    city:
      document.getElementById('restaurantCity').value.trim(),

    state:
      document.getElementById('restaurantState').value.trim(),

    pincode:
      document.getElementById('restaurantPincode').value.trim(),

    opening_time:
      document.getElementById('openingTime').value || null,

    closing_time:
      document.getElementById('closingTime').value || null,

    is_open:
      document.getElementById('restaurantOpen').value === 'true',

    settings
  };


  const { error } =
    await supabaseClient
      .from('restaurants')
      .update(updateData)
      .eq('id', currentRestaurant.id);


  if(error){

    showMessage(
      'settingsMessage',
      error.message,
      true
    );

    return;
  }


  currentRestaurant = {
    ...currentRestaurant,
    ...updateData
  };


  document.getElementById('sidebarRestaurantName').textContent =
    updateData.name || 'Restaurant';


  showMessage(
    'settingsMessage',
    '✓ Restaurant settings saved successfully.',
    false
  );

}


async function loadDashboard(){

  if(!currentRestaurant) return;

  const restaurantId = currentRestaurant.id;

  const today = new Date();
  today.setHours(0,0,0,0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate()+1);


  const { data: orders } =
    await supabaseClient
      .from('orders')
      .select('id,total,status,created_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());


  const orderList = orders || [];

  const sales = orderList.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const pending = orderList.filter(
    o => ['pending','confirmed','preparing','ready'].includes(o.status)
  ).length;


  document.getElementById('todaySales').textContent =
    `₹${sales.toFixed(2)}`;

  document.getElementById('todayOrders').textContent =
    orderList.length;

  document.getElementById('pendingOrders').textContent =
    pending;


  const { data: reservations } =
    await supabaseClient
      .from('reservations')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq(
        'reservation_date',
        new Date().toISOString().split('T')[0]
      );


  document.getElementById('todayReservations').textContent =
    reservations?.length || 0;


  const recent = orderList
    .sort(
      (a,b) =>
        new Date(b.created_at) - new Date(a.created_at)
    )
    .slice(0,5);


  const container =
    document.getElementById('recentOrders');


  if(!recent.length){

    container.textContent = 'No orders today.';
    return;
  }


  container.innerHTML = recent.map(order => `

    <div style="
      display:flex;
      justify-content:space-between;
      padding:12px 0;
      border-bottom:1px solid #eee;
    ">

      <strong>${order.id.slice(0,8)}</strong>

      <span>₹${Number(order.total || 0).toFixed(2)}</span>

      <small>${order.status}</small>

    </div>

  `).join('');

}




/* =========================================================
   ORDERS FUNCTION V2 SAFE
   Existing Supabase connection preserved.
   ========================================================= */

let ordersCache = [];
let activeOrderStatus = "all";

async function loadOrders(){

  const loading = document.getElementById("ordersLoading");
  const list = document.getElementById("ordersList");

  if(!loading || !list) return;

  loading.style.display = "block";

  if(!currentRestaurant?.id){
    loading.textContent = "Restaurant information not available.";
    return;
  }

  try{

    const { data: orders, error: ordersError } =
      await supabaseClient
        .from("orders")
        .select("*")
        .eq("restaurant_id", currentRestaurant.id)
        .order("created_at", { ascending:false });

    if(ordersError) throw ordersError;

    const orderIds = (orders || []).map(order => order.id);

    let items = [];

    if(orderIds.length){

      const { data, error: itemsError } =
        await supabaseClient
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

      if(itemsError) throw itemsError;

      items = data || [];
    }

    const itemMap = {};

    items.forEach(item => {

      if(!itemMap[item.order_id]){
        itemMap[item.order_id] = [];
      }

      itemMap[item.order_id].push(item);

    });

    ordersCache = (orders || []).map(order => ({
      ...order,
      __items: itemMap[order.id] || []
    }));

    loading.style.display = "none";

    setupOrderFilters();

    renderOrdersV2();

  }catch(error){

    console.error("LOAD ORDERS ERROR:", error);

    loading.style.display = "none";

    list.innerHTML = `
      <div class="coming-page">
        <div>❌</div>
        <h2>Could not load orders</h2>
        <p>${error.message || "Unknown error"}</p>
      </div>
    `;

  }

}


function setupOrderFilters(){

  document
    .querySelectorAll(".order-status-tab")
    .forEach(tab => {

      tab.onclick = function(){

        activeOrderStatus =
          this.dataset.orderStatus || "all";

        document
          .querySelectorAll(".order-status-tab")
          .forEach(t => t.classList.remove("active"));

        this.classList.add("active");

        renderOrdersV2();

      };

    });

  const search =
    document.getElementById("orderSearchInput");

  if(search && !search.dataset.bound){

    search.dataset.bound = "1";

    search.addEventListener("input", () => {
      renderOrdersV2();
    });

  }

  const time =
    document.getElementById("orderTimeFilter");

  if(time && !time.dataset.bound){

    time.dataset.bound = "1";

    time.addEventListener("change", () => {
      renderOrdersV2();
    });

  }

  const sort =
    document.getElementById("orderSortFilter");

  if(sort && !sort.dataset.bound){

    sort.dataset.bound = "1";

    sort.addEventListener("change", () => {
      renderOrdersV2();
    });

  }

}


function renderOrdersV2(){

  const list =
    document.getElementById("ordersList");

  if(!list) return;

  const search =
    (document.getElementById("orderSearchInput")?.value || "")
      .trim()
      .toLowerCase();

  const timeValue =
    document.getElementById("orderTimeFilter")?.value || "12";

  const sortValue =
    document.getElementById("orderSortFilter")?.value || "latest";

  let filtered = [...ordersCache];

  if(timeValue !== "all"){

    const hours = Number(timeValue);

    const cutoff =
      Date.now() - hours * 60 * 60 * 1000;

    filtered = filtered.filter(order => {

      if(!order.created_at) return false;

      return new Date(order.created_at).getTime() >= cutoff;

    });

  }


  if(activeOrderStatus !== "all"){

    filtered = filtered.filter(order =>
      (order.status || "pending") === activeOrderStatus
    );

  }


  if(search){

    filtered = filtered.filter(order => {

      const searchable = [

        order.order_number,
        order.id,
        order.customer_name,
        order.customer_phone,
        order.delivery_address,
        order.delivery_pincode,
        order.notes

      ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

      return searchable.includes(search);

    });

  }


  filtered.sort((a,b) => {

    const aTime =
      new Date(a.created_at || 0).getTime();

    const bTime =
      new Date(b.created_at || 0).getTime();

    return sortValue === "oldest"
      ? aTime - bTime
      : bTime - aTime;

  });


  updateOrderCountsV2(timeValue);


  const title =
    document.getElementById("ordersListTitle");

  const subtitle =
    document.getElementById("ordersListSubtitle");

  const visible =
    document.getElementById("ordersVisibleCount");


  if(title){

    title.textContent =
      activeOrderStatus === "all"
        ? "All Orders"
        : activeOrderStatus
            .replaceAll("_"," ")
            .replace(/\b\w/g,c => c.toUpperCase()) +
          " Orders";

  }


  if(subtitle){

    subtitle.textContent =
      timeValue === "all"
        ? "Showing all orders"
        : "Showing orders from last " +
          timeValue +
          " hours";

  }


  if(visible){

    visible.textContent =
      filtered.length +
      " Order" +
      (filtered.length === 1 ? "" : "s");

  }


  if(!filtered.length){

    list.innerHTML = `
      <div class="coming-page">
        <div>📦</div>
        <h2>No Orders Found</h2>
        <p>Try another status, search or time filter.</p>
      </div>
    `;

    return;

  }


  list.innerHTML = filtered.map(order => {

    const status =
      order.status || "pending";

    const isDelivery =
      order.order_type === "home_delivery";

    const typeLabel =
      isDelivery
        ? "🛵 Home Delivery"
        : "🍽️ Dine In";


    const location =
      isDelivery
        ? [
            order.delivery_address || "Address not provided",
            order.delivery_pincode
              ? "PIN: " + order.delivery_pincode
              : "",
            order.notes
              ? "📍 " +
                String(order.notes)
                  .replace("Landmark: ","")
              : ""
          ]
          .filter(Boolean)
          .join("<br>")
        : (
            order.notes ||
            "Table information not provided"
          );


    const created =
      order.created_at
        ? new Date(order.created_at)
            .toLocaleString("en-IN")
        : "";


    const orderItems =
      order.__items || [];


    const itemsHTML =
      orderItems.length
        ? orderItems.map(item => `
            <div style="
              display:flex;
              justify-content:space-between;
              gap:10px;
              padding:8px 0;
              border-bottom:1px solid #eee;
            ">
              <span>
                ${escapeOrderText(item.product_name || "Food Item")}
                × ${Number(item.quantity || 1)}
              </span>
              <strong>
                ₹${Number(item.subtotal || 0).toFixed(2)}
              </strong>
            </div>
          `).join("")
        : `
            <div style="color:#888;padding:8px 0;">
              No item details found.
            </div>
          `;


    let statusOptions = `
      <option value="pending" ${status === "pending" ? "selected" : ""}>
        Pending
      </option>

      <option value="confirmed" ${status === "confirmed" ? "selected" : ""}>
        Confirmed
      </option>

      <option value="preparing" ${status === "preparing" ? "selected" : ""}>
        Preparing
      </option>

      <option value="ready" ${status === "ready" ? "selected" : ""}>
        Ready
      </option>
    `;


    if(isDelivery){

      statusOptions += `
        <option value="out_for_delivery"
          ${status === "out_for_delivery" ? "selected" : ""}>
          Out for Delivery
        </option>

        <option value="delivered"
          ${status === "delivered" ? "selected" : ""}>
          Delivered
        </option>

        <option value="cancelled"
          ${status === "cancelled" ? "selected" : ""}>
          Cancelled
        </option>
      `;

    }else{

      statusOptions += `
        <option value="served"
          ${status === "served" ? "selected" : ""}>
          Served
        </option>

        <option value="cancelled"
          ${status === "cancelled" ? "selected" : ""}>
          Cancelled
        </option>
      `;

    }


    return `
      <div
        class="order-card-v2"
        data-order-id="${escapeOrderText(order.id)}"
        style="
          background:#fff;
          border-radius:18px;
          padding:20px;
          margin-bottom:18px;
          box-shadow:0 4px 18px rgba(0,0,0,.06);
        "
      >

        <div style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
          margin-bottom:15px;
        ">

          <div>

            <strong style="font-size:19px;">
              #${escapeOrderText(
                order.order_number ||
                String(order.id).slice(0,8)
              )}
            </strong>

            <div style="
              color:#777;
              font-size:13px;
              margin-top:4px;
            ">
              🕐 ${escapeOrderText(created)}
            </div>

          </div>


          <select
            class="order-status-select-v2"
            data-order-id="${escapeOrderText(order.id)}"
            data-previous-status="${escapeOrderText(status)}"
            onchange="updateOrderStatus(this.value, '${escapeOrderText(order.id)}')"
            style="
              padding:8px 12px;
              border-radius:20px;
              border:1px solid #f0d8c2;
              background:#fff3e8;
              color:#b65f18;
              font-weight:700;
            "
          >
            ${statusOptions}
          </select>

        </div>


        <div style="
          background:#fafafa;
          padding:14px;
          border-radius:12px;
          margin-bottom:15px;
        ">

          <div style="
            font-weight:700;
            margin-bottom:7px;
          ">
            ${typeLabel}
          </div>

          <div>
            <strong>
              ${escapeOrderText(
                order.customer_name || "Customer"
              )}
            </strong>
          </div>

          <div>
            📞 ${escapeOrderText(
              order.customer_phone || "Not provided"
            )}
          </div>

          <div style="margin-top:6px;">
            📍 ${location}
          </div>

        </div>


        <h4 style="margin:0 0 8px;">
          Order Items (${orderItems.length})
        </h4>

        ${itemsHTML}


        <div style="
          display:flex;
          justify-content:space-between;
          margin-top:15px;
          padding-top:12px;
          border-top:2px solid #eee;
          font-size:18px;
        ">
          <strong>Total</strong>
          <strong>
            ₹${Number(order.total || 0).toFixed(2)}
          </strong>
        </div>

      </div>
    `;

  }).join("");

}


function escapeOrderText(value){

  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}


function updateOrderCountsV2(timeValue){

  const cutoff =
    timeValue === "all"
      ? null
      : Date.now() -
        Number(timeValue) * 60 * 60 * 1000;


  const visibleOrders =
    ordersCache.filter(order => {

      if(!cutoff) return true;

      return order.created_at &&
        new Date(order.created_at).getTime() >= cutoff;

    });


  const counts = {

    all: visibleOrders.length,

    pending: 0,
    confirmed: 0,
    preparing: 0,
    ready: 0,
    served: 0,
    out_for_delivery: 0,
    delivered: 0,
    cancelled: 0

  };


  visibleOrders.forEach(order => {

    const status =
      order.status || "pending";

    if(
      Object.prototype.hasOwnProperty
        .call(counts,status)
    ){
      counts[status]++;
    }

  });


  const ids = {

    countAll: counts.all,
    countPending: counts.pending,
    countConfirmed: counts.confirmed,
    countPreparing: counts.preparing,
    countReady: counts.ready,
    countServed: counts.served,
    countOutForDelivery: counts.out_for_delivery,
    countDelivered: counts.delivered,
    countCancelled: counts.cancelled

  };


  Object.entries(ids).forEach(([id,value]) => {

    const element =
      document.getElementById(id);

    if(element){
      element.textContent = value;
    }

  });

}


async function updateOrderStatus(newStatus, orderId){

  if(!newStatus || !orderId) return;


  const select =
    document.querySelector(
      '.order-status-select-v2[data-order-id="' +
      String(orderId).replace(/"/g,'\\"') +
      '"]'
    );


  const cachedOrder =
    ordersCache.find(
      order =>
        String(order.id) === String(orderId)
    );


  const previousStatus =
    cachedOrder?.status ||
    select?.dataset.previousStatus ||
    "pending";


  if(select){

    select.disabled = true;
    select.style.opacity = "0.6";

  }


  try{

    const { error } =
      await supabaseClient
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", orderId)
        .eq("restaurant_id", currentRestaurant.id);


    if(error) throw error;


    if(cachedOrder){
      cachedOrder.status = newStatus;
    }


    if(select){

      select.dataset.previousStatus = newStatus;
      select.disabled = false;
      select.style.opacity = "1";

    }


    renderOrdersV2();


  }catch(error){

    console.error(
      "UPDATE ORDER STATUS ERROR:",
      error
    );


    if(cachedOrder){
      cachedOrder.status = previousStatus;
    }


    if(select){

      select.value = previousStatus;
      select.dataset.previousStatus = previousStatus;
      select.disabled = false;
      select.style.opacity = "1";

    }


    alert(
      "❌ Could not update order status.\n\n" +
      (error.message || "Unknown error")
    );

  }

}


/* END ORDERS FUNCTION V2 SAFE */


/* RESERVATION SYSTEM V1 */

let reservationsCache = [];
let activeReservationStatus = "all";

async function loadReservations(){
  const loading = document.getElementById("reservationsLoading");
  const list = document.getElementById("reservationsList");

  if(!loading || !list) return;

  loading.style.display = "block";
  list.innerHTML = "";

  if(!currentRestaurant?.id){
    loading.textContent = "Restaurant information not available.";
    return;
  }

  const dateInput = document.getElementById("reservationDateFilter");

  if(dateInput && !dateInput.value){
    dateInput.value = new Date().toISOString().split("T")[0];
  }

  try{
    const { data: reservations, error } =
      await supabaseClient
        .from("reservations")
        .select("*")
        .eq("restaurant_id", currentRestaurant.id)
        .order("reservation_date", { ascending:true })
        .order("reservation_time", { ascending:true });

    if(error) throw error;

    reservationsCache = reservations || [];

    const tableIds = reservationsCache
      .map(r => r.table_id)
      .filter(Boolean);

    let tables = [];

    if(tableIds.length){
      const { data: tableData, error: tableError } =
        await supabaseClient
          .from("restaurant_tables")
          .select("id,table_number,capacity,table_type")
          .in("id", tableIds);

      if(tableError) throw tableError;
      tables = tableData || [];
    }

    const tableMap = {};
    tables.forEach(t => {
      tableMap[t.id] = t;
    });

    window.reservationTableMap = tableMap;

    setupReservationFilters();
    updateReservationCounts();
    renderReservations();

  }catch(error){
    console.error("LOAD RESERVATIONS ERROR:", error);

    loading.style.display = "none";

    list.innerHTML = `
      <div class="coming-page">
        <div>⚠️</div>
        <h2>Could not load reservations</h2>
        <p>${escapeReservationText(error.message || "Unknown error")}</p>
      </div>
    `;

    return;
  }
}

function setupReservationFilters(){

  const search = document.getElementById("reservationSearchInput");
  const status = document.getElementById("reservationStatusFilter");
  const date = document.getElementById("reservationDateFilter");

  if(search && !search.dataset.bound){
    search.dataset.bound = "1";
    search.addEventListener("input", renderReservations);
  }

  if(status && !status.dataset.bound){
    status.dataset.bound = "1";

    status.addEventListener("change", function(){
      activeReservationStatus = this.value;
      renderReservations();
    });
  }

  if(date && !date.dataset.bound){
    date.dataset.bound = "1";
    date.addEventListener("change", renderReservations);
  }
}

function updateReservationCounts(){

  const dateInput = document.getElementById("reservationDateFilter");
  const selectedDate =
    dateInput?.value ||
    new Date().toISOString().split("T")[0];

  const todayReservations = reservationsCache.filter(
    r => r.reservation_date === selectedDate
  );

  const pending = todayReservations.filter(
    r => r.status === "pending"
  ).length;

  const confirmed = todayReservations.filter(
    r => r.status === "confirmed"
  ).length;

  const cancelled = todayReservations.filter(
    r => r.status === "cancelled"
  ).length;

  const totalEl = document.getElementById("reservationTotalCount");
  const pendingEl = document.getElementById("reservationPendingCount");
  const confirmedEl = document.getElementById("reservationConfirmedCount");
  const cancelledEl = document.getElementById("reservationCancelledCount");

  if(totalEl) totalEl.textContent = todayReservations.length;
  if(pendingEl) pendingEl.textContent = pending;
  if(confirmedEl) confirmedEl.textContent = confirmed;
  if(cancelledEl) cancelledEl.textContent = cancelled;
}

function renderReservations(){

  const loading = document.getElementById("reservationsLoading");
  const list = document.getElementById("reservationsList");
  const visibleCount = document.getElementById("reservationVisibleCount");

  if(!list) return;

  const search =
    (document.getElementById("reservationSearchInput")?.value || "")
      .trim()
      .toLowerCase();

  const selectedStatus =
    document.getElementById("reservationStatusFilter")?.value || "all";

  const selectedDate =
    document.getElementById("reservationDateFilter")?.value || "";

  let rows = [...reservationsCache];

  if(selectedDate){
    rows = rows.filter(
      r => r.reservation_date === selectedDate
    );
  }

  if(selectedStatus !== "all"){
    rows = rows.filter(
      r => (r.status || "pending") === selectedStatus
    );
  }

  if(search){
    rows = rows.filter(r => {

      const table =
        window.reservationTableMap?.[r.table_id];

      const tableNumber =
        table?.table_number || "";

      return [
        r.customer_name,
        r.customer_phone,
        r.customer_email,
        tableNumber,
        r.notes
      ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);

    });
  }

  rows.sort((a,b) => {
    const aValue =
      `${a.reservation_date || ""} ${a.reservation_time || ""}`;

    const bValue =
      `${b.reservation_date || ""} ${b.reservation_time || ""}`;

    return aValue.localeCompare(bValue);
  });

  if(loading) loading.style.display = "none";

  if(visibleCount){
    visibleCount.textContent =
      `${rows.length} Reservation${rows.length === 1 ? "" : "s"}`;
  }

  if(!rows.length){
    list.innerHTML = `
      <div class="coming-page">
        <div>📅</div>
        <h2>No Reservations Found</h2>
        <p>No reservations match the selected filters.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = rows.map(r => {

    const table =
      window.reservationTableMap?.[r.table_id];

    const tableNumber =
      table?.table_number || "Not assigned";

    const capacity =
      table?.capacity || r.guests || "-";

    const status =
      r.status || "pending";

    const statusOptions = [
      "pending",
      "confirmed",
      "completed",
      "cancelled"
    ];

    const optionsHTML = statusOptions.map(option => `
      <option value="${option}" ${status === option ? "selected" : ""}>
        ${option.charAt(0).toUpperCase() + option.slice(1)}
      </option>
    `).join("");

    return `
      <div class="reservation-card">

        <div class="reservation-card-main">

          <div class="reservation-customer">
            <strong>${escapeReservationText(r.customer_name || "Customer")}</strong>

            <span>
              📞 ${escapeReservationText(r.customer_phone || "No phone")}
            </span>

            ${
          r.customer_email
            ? `<span>✉️ ${escapeReservationText(r.customer_email)}</span>`
            : ""
        }

        <div class="reservation-booking-id">
          <small>Booking ID</small>
          <strong>${escapeReservationText(r.booking_number || "Pending")}</strong>
        </div>

            <div>
              <small>Date</small>
              <strong>${escapeReservationText(r.reservation_date || "-")}</strong>
            </div>

            <div>
              <small>Time</small>
              <strong>${escapeReservationText(String(r.reservation_time || "-").slice(0,5))}</strong>
            </div>

            <div>
              <small>Table</small>
              <strong>Table ${escapeReservationText(tableNumber)}</strong>
            </div>

            <div>
              <small>Guests</small>
              <strong>${escapeReservationText(String(r.guests || capacity))}</strong>
            </div>

          </div>

        </div>

        <div class="reservation-card-bottom">

          <div class="reservation-notes">
            ${
              r.notes
              ? `📝 ${escapeReservationText(r.notes)}`
              : "No additional notes"
            }
          </div>

          <select
            class="reservation-status-select"
            onchange="updateReservationStatus(this.value, '${r.id}')"
          >
            ${optionsHTML}
          </select>

        </div>

      </div>
    `;

  }).join("");
}

async function updateReservationStatus(newStatus, reservationId){

  if(!newStatus || !reservationId) return;

  try{

    const { error } =
      await supabaseClient
        .from("reservations")
        .update({
          status: newStatus
        })
        .eq("id", reservationId)
        .eq("restaurant_id", currentRestaurant.id);

    if(error) throw error;

    const reservation =
      reservationsCache.find(r => r.id === reservationId);

    if(reservation){
      reservation.status = newStatus;
    }

    updateReservationCounts();
    renderReservations();

    console.log(
      "RESERVATION STATUS UPDATED:",
      reservationId,
      newStatus
    );

  }catch(error){

    console.error(
      "UPDATE RESERVATION STATUS ERROR:",
      error
    );

    alert(
      "❌ Could not update reservation status.\n\n" +
      (error.message || "Unknown error")
    );

    renderReservations();
  }
}

function escapeReservationText(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* END RESERVATION SYSTEM V1 */


/* =========================================================
   TABLES MANAGEMENT V1
   Supabase restaurant_tables connection
   ========================================================= */

let restaurantTablesCache = [];

async function loadTables(){
  const loading = document.getElementById("tablesLoading");
  const grid = document.getElementById("tablesGrid");

  if(!loading || !grid) return;

  loading.style.display = "block";
  grid.innerHTML = "";

  if(!currentRestaurant?.id){
    loading.textContent = "Restaurant information not available.";
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("restaurant_tables")
      .select("*")
      .eq("restaurant_id", currentRestaurant.id)
      .order("table_number", { ascending: true });

    if(error) throw error;

    restaurantTablesCache = data || [];

    updateTableSummary();
    renderTables();

    loading.style.display = "none";

  } catch(error) {
    console.error("LOAD TABLES ERROR:", error);

    loading.style.display = "none";

    grid.innerHTML = `
      <div class="coming-page">
        <div>⚠️</div>
        <h2>Could not load tables</h2>
        <p>${escapeTableText(error.message || "Unknown error")}</p>
      </div>
    `;
  }
}

function updateTableSummary(){

  const total = restaurantTablesCache.length;

  const available = restaurantTablesCache.filter(
    table => (table.status || "available") === "available"
  ).length;

  const unavailable = total - available;

  const totalEl = document.getElementById("tablesTotalCount");
  const availableEl = document.getElementById("tablesAvailableCount");
  const unavailableEl = document.getElementById("tablesUnavailableCount");

  if(totalEl) totalEl.textContent = total;
  if(availableEl) availableEl.textContent = available;
  if(unavailableEl) unavailableEl.textContent = unavailable;
}

function renderTables(){

  const grid = document.getElementById("tablesGrid");

  if(!grid) return;

  if(!restaurantTablesCache.length){

    grid.innerHTML = `
      <div class="coming-page">
        <div>🪑</div>
        <h2>No Tables Added</h2>
        <p>Click "+ Add Table" to create your first restaurant table.</p>
      </div>
    `;

    return;
  }

  grid.innerHTML = restaurantTablesCache.map(table => {

    const number = escapeTableText(table.table_number || "");
    const capacity = Number(table.capacity || 2);
    const type = escapeTableText(table.table_type || "normal");
    const status = table.status || "available";

    const qrToken = table.qr_token || "";

    return `
      <div class="restaurant-table-card">

        <div class="table-card-top">

          <div class="table-number">
            TABLE ${number}
          </div>

          <span class="table-status ${status === "available" ? "available" : "unavailable"}">
            ${status === "available" ? "Available" : "Unavailable"}
          </span>

        </div>

        <div class="table-card-icon">
          🪑
        </div>

        <div class="table-card-info">

          <div>
            <strong>Capacity</strong>
            <span>${capacity} Guests</span>
          </div>

          <div>
            <strong>Type</strong>
            <span>${type}</span>
          </div>

        </div>

        <div class="table-qr-box">

          ${
            qrToken
              ? `<div class="table-qr-token">QR: ${escapeTableText(qrToken)}</div>`
              : `<div class="table-qr-token">QR Token unavailable</div>`
          }

        </div>

        <div class="table-card-actions">

          <button
            class="table-edit-btn"
            onclick="editRestaurantTable('${table.id}')">
            ✏️ Edit
          </button>

          <button
            class="table-delete-btn"
            onclick="deleteRestaurantTable('${table.id}')">
            🗑️ Delete
          </button>

        </div>

      </div>
    `;

  }).join("");
}

function openTableForm(tableId = ""){

  const box = document.getElementById("tableFormBox");

  if(!box) return;

  const title = document.getElementById("tableFormTitle");
  const editId = document.getElementById("editTableId");
  const number = document.getElementById("tableNumberInput");
  const capacity = document.getElementById("tableCapacityInput");
  const type = document.getElementById("tableTypeInput");
  const status = document.getElementById("tableStatusInput");

  if(!tableId){

    if(title) title.textContent = "Add Table";
    if(editId) editId.value = "";
    if(number) number.value = "";
    if(capacity) capacity.value = "2";
    if(type) type.value = "normal";
    if(status) status.value = "available";

  } else {

    const table = restaurantTablesCache.find(
      item => String(item.id) === String(tableId)
    );

    if(!table) return;

    if(title) title.textContent = "Edit Table";
    if(editId) editId.value = table.id;
    if(number) number.value = table.table_number || "";
    if(capacity) capacity.value = table.capacity || 2;
    if(type) type.value = table.table_type || "normal";
    if(status) status.value = table.status || "available";
  }

  box.style.display = "block";
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeTableForm(){

  const box = document.getElementById("tableFormBox");

  if(box) box.style.display = "none";
}

async function saveRestaurantTable(){

  if(!currentRestaurant?.id){
    alert("Restaurant information not available.");
    return;
  }

  const editId =
    document.getElementById("editTableId")?.value.trim();

  const tableNumber =
    document.getElementById("tableNumberInput")?.value.trim();

  const capacity =
    Number(document.getElementById("tableCapacityInput")?.value || 0);

  const tableType =
    document.getElementById("tableTypeInput")?.value || "normal";

  const status =
    document.getElementById("tableStatusInput")?.value || "available";

  if(!tableNumber){
    alert("Please enter table number.");
    return;
  }

  if(!capacity || capacity < 1){
    alert("Please enter a valid capacity.");
    return;
  }

  const payload = {
    restaurant_id: currentRestaurant.id,
    table_number: tableNumber,
    capacity: capacity,
    table_type: tableType,
    status: status
  };

  try {

    let result;

    if(editId){

      result = await supabaseClient
        .from("restaurant_tables")
        .update(payload)
        .eq("id", editId)
        .eq("restaurant_id", currentRestaurant.id);

    } else {

      result = await supabaseClient
        .from("restaurant_tables")
        .insert(payload);
    }

    if(result.error) throw result.error;

    alert(editId ? "✅ Table updated successfully." : "✅ Table added successfully.");

    closeTableForm();

    await loadTables();

  } catch(error){

    console.error("SAVE TABLE ERROR:", error);

    alert(
      "❌ Could not save table.\n\n" +
      (error.message || "Unknown error")
    );
  }
}

function editRestaurantTable(tableId){

  openTableForm(tableId);
}

async function deleteRestaurantTable(tableId){

  if(!confirm("Delete this table?")) return;

  try {

    const { error } = await supabaseClient
      .from("restaurant_tables")
      .delete()
      .eq("id", tableId)
      .eq("restaurant_id", currentRestaurant.id);

    if(error) throw error;

    alert("✅ Table deleted.");

    await loadTables();

  } catch(error){

    console.error("DELETE TABLE ERROR:", error);

    alert(
      "❌ Could not delete table.\n\n" +
      (error.message || "Unknown error")
    );
  }
}

function escapeTableText(value){

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* END TABLES MANAGEMENT V1 */


function openPage(page){
  if (page === "orders") {
    loadOrders();
  }

  if (page === "tables") {
    loadTables();
  }

  if (page === "reservations") {
    loadReservations();
  }

  document.querySelectorAll('.page')
    .forEach(p => p.classList.remove('active'));

  const target =
    document.getElementById(`${page}Page`);

  if(target){
    target.classList.add('active');
  }


  document.querySelectorAll('.nav-item')
    .forEach(btn => btn.classList.remove('active'));

  document.querySelectorAll('.nav-item')
    .forEach(btn => {

      if(btn.dataset.page === page){
        btn.classList.add('active');
      }

    });


  const info = pageNames[page];

  if(info){

    document.getElementById('pageTitle').textContent =
      info[0];

    document.getElementById('pageSubtitle').textContent =
      info[1];

  }


  document.querySelector('.sidebar')
    .classList.remove('open');

}


function showMessage(id,text,error){

  const el = document.getElementById(id);

  el.textContent = text;

  el.style.color = error ? '#d33' : '#159447';

  setTimeout(() => {
    el.textContent = '';
  },4000);

}

/* =========================================================
   CATEGORY MANAGEMENT
   ========================================================= */

let categoryEditId = null;
let subcategoryEditId = null;
let categoryModalType = 'category';


function buildCategoryPage(){

  const page = document.getElementById('categoriesPage');

  if(!page) return;

  page.innerHTML = `

    <div class="category-toolbar">

      <div>
        <h2>Categories & Sub-categories</h2>
        <p style="color:#888;margin:5px 0 0;">
          Manage your menu structure
        </p>
      </div>

      <button class="primary-btn" onclick="openCategoryModal()">
        + Add Category
      </button>

    </div>

    <div id="categoryList" class="category-list">
      <div class="category-empty">
        Loading categories...
      </div>
    </div>

  `;

  createCategoryModal();

}


function createCategoryModal(){

  if(document.getElementById('categoryModal')) return;

  const modal = document.createElement('div');

  modal.id = 'categoryModal';

  modal.className = 'category-modal';

  modal.innerHTML = `

    <div class="category-modal-card">

      <h3 id="categoryModalTitle">
        Add Category
      </h3>

      <div class="category-field">

        <label>Name</label>

        <input
          id="categoryInputName"
          type="text"
          placeholder="e.g. Biryani"
        >

      </div>

      <div class="category-field">

        <label>Icon / Emoji</label>

        <input
          id="categoryInputIcon"
          type="text"
          placeholder="🍗"
          maxlength="10"
        >

      </div>

      <div
        id="parentCategoryField"
        class="category-field"
        style="display:none;"
      >

        <label>Main Category</label>

        <select id="parentCategorySelect"></select>

      </div>

      <div class="modal-actions">

        <button
          class="modal-cancel"
          onclick="closeCategoryModal()"
        >
          Cancel
        </button>

        <button
          class="modal-save"
          onclick="saveCategoryModal()"
        >
          Save
        </button>

      </div>

      <div
        id="categoryModalMessage"
        style="margin-top:10px;font-size:13px;"
      ></div>

    </div>

  `;

  document.body.appendChild(modal);


  modal.addEventListener('click', (e) => {

    if(e.target === modal){
      closeCategoryModal();
    }

  });

}


async function loadCategories(){

  if(!currentRestaurant){

    const box = document.getElementById('categoryList');

    if(box){
      box.innerHTML = `
        <div class="category-empty">
          Restaurant information is not loaded yet.
        </div>
      `;
    }

    return;
  }


  const { data, error } = await supabaseClient
    .from('categories')
    .select('*')
    .eq('restaurant_id', currentRestaurant.id)
    .order('sort_order', { ascending:true })
    .order('created_at', { ascending:true });


  if(error){

    console.error(error);

    document.getElementById('categoryList').innerHTML = `
      <div class="category-empty">
        Unable to load categories.<br>
        ${escapeCategoryText(error.message)}
      </div>
    `;

    return;
  }


  const categories = data || [];

  const mainCategories =
    categories.filter(c => !c.parent_id);

  const subCategories =
    categories.filter(c => c.parent_id);


  const container =
    document.getElementById('categoryList');


  if(!mainCategories.length){

    container.innerHTML = `
      <div class="category-empty">
        <div style="font-size:45px;">📂</div>
        <h3>No categories yet</h3>
        <p>Create your first category.</p>
        <button
          class="primary-btn"
          onclick="openCategoryModal()"
        >
          + Add Category
        </button>
      </div>
    `;

    return;
  }


  container.innerHTML =
    mainCategories.map(category => {

      const children =
        subCategories.filter(
          sub => sub.parent_id === category.id
        );


      return `

        <div class="category-card">

          <div class="category-main">

            <div class="category-info">

              <div class="category-icon">
                ${escapeCategoryText(category.icon || '📂')}
              </div>

              <div>

                <h3>
                  ${escapeCategoryText(category.name)}
                </h3>

                <small>
                  ${children.length}
                  sub-category${children.length === 1 ? '' : 'ies'}
                  •
                  ${category.active ? 'Active' : 'Inactive'}
                </small>

              </div>

            </div>


            <div class="category-actions">

              <button
                onclick="openEditCategory('${category.id}')"
              >
                ✏️ Edit
              </button>

              <button
                class="status-btn"
                onclick="toggleCategoryStatus(
                  '${category.id}',
                  ${category.active}
                )"
              >
                ${category.active ? '🔴 Disable' : '🟢 Enable'}
              </button>

              <button
                onclick="openSubCategoryModal('${category.id}')"
              >
                + Sub-category
              </button>

              <button
                class="delete-btn"
                onclick="deleteCategory('${category.id}')"
              >
                🗑️ Delete
              </button>

            </div>

          </div>


          ${
            children.length
            ?
            `
              <div class="subcategory-list">

                ${
                  children.map(sub => `

                    <div class="subcategory-row">

                      <div>

                        <span class="subcategory-name">
                          ${escapeCategoryText(
                            sub.icon || '📁'
                          )}
                          ${escapeCategoryText(sub.name)}
                        </span>

                        <small style="
                          display:block;
                          color:#888;
                          margin-top:3px;
                        ">
                          ${sub.active ? 'Available' : 'Inactive'}
                        </small>

                      </div>


                      <div class="subcategory-actions">

                        <button
                          onclick="openEditSubCategory(
                            '${sub.id}',
                            '${category.id}'
                          )"
                        >
                          ✏️
                        </button>

                        <button
                          onclick="toggleCategoryStatus(
                            '${sub.id}',
                            ${sub.active}
                          )"
                        >
                          ${sub.active ? '🔴' : '🟢'}
                        </button>

                        <button
                          onclick="deleteCategory('${sub.id}')"
                        >
                          🗑️
                        </button>

                      </div>

                    </div>

                  `).join('')
                }

              </div>
            `
            :
            ''
          }

        </div>

      `;

    }).join('');

}


function openCategoryModal(){

  categoryEditId = null;
  categoryModalType = 'category';

  document.getElementById('categoryModalTitle').textContent =
    'Add Category';

  document.getElementById('categoryInputName').value = '';
  document.getElementById('categoryInputIcon').value = '';

  document.getElementById('parentCategoryField').style.display =
    'none';

  document.getElementById('categoryModal').classList.add('show');

}


async function openSubCategoryModal(parentId){

  categoryEditId = null;
  categoryModalType = 'subcategory';

  document.getElementById('categoryModalTitle').textContent =
    'Add Sub-category';

  document.getElementById('categoryInputName').value = '';
  document.getElementById('categoryInputIcon').value = '';

  const select =
    document.getElementById('parentCategorySelect');


  const { data, error } = await supabaseClient
    .from('categories')
    .select('id,name')
    .eq('restaurant_id', currentRestaurant.id)
    .is('parent_id', null)
    .order('name');


  if(error){

    alert(error.message);
    return;
  }


  select.innerHTML =
    (data || []).map(c => `
      <option value="${c.id}">
        ${escapeCategoryText(c.name)}
      </option>
    `).join('');


  select.value = parentId;


  document.getElementById('parentCategoryField').style.display =
    'block';


  document.getElementById('categoryModal').classList.add('show');

}


async function openEditCategory(id){

  const { data, error } = await supabaseClient
    .from('categories')
    .select('*')
    .eq('id', id)
    .single();


  if(error){

    alert(error.message);
    return;
  }


  categoryEditId = id;
  categoryModalType =
    data.parent_id ? 'subcategory' : 'category';


  document.getElementById('categoryModalTitle').textContent =
    data.parent_id ? 'Edit Sub-category' : 'Edit Category';

  document.getElementById('categoryInputName').value =
    data.name || '';

  document.getElementById('categoryInputIcon').value =
    data.icon || '';


  if(data.parent_id){

    const select =
      document.getElementById('parentCategorySelect');


    const { data: parents } = await supabaseClient
      .from('categories')
      .select('id,name')
      .eq('restaurant_id', currentRestaurant.id)
      .is('parent_id', null)
      .order('name');


    select.innerHTML =
      (parents || []).map(c => `
        <option value="${c.id}">
          ${escapeCategoryText(c.name)}
        </option>
      `).join('');


    select.value = data.parent_id;

    document.getElementById('parentCategoryField').style.display =
      'block';

  }else{

    document.getElementById('parentCategoryField').style.display =
      'none';

  }


  document.getElementById('categoryModal').classList.add('show');

}


function openEditSubCategory(id){

  openEditCategory(id);

}


function closeCategoryModal(){

  const modal =
    document.getElementById('categoryModal');

  if(modal){
    modal.classList.remove('show');
  }

}


async function saveCategoryModal(){

  const name =
    document.getElementById('categoryInputName')
      .value.trim();

  const icon =
    document.getElementById('categoryInputIcon')
      .value.trim();


  if(!name){

    document.getElementById('categoryModalMessage').textContent =
      'Please enter a name.';

    return;
  }


  if(!currentRestaurant){

    document.getElementById('categoryModalMessage').textContent =
      'Restaurant is not connected.';

    return;
  }


  const parentId =
    categoryModalType === 'subcategory'
    ? document.getElementById('parentCategorySelect').value
    : null;


  const payload = {

    restaurant_id: currentRestaurant.id,
    name,
    icon: icon || (parentId ? '📁' : '📂'),
    parent_id: parentId,
    active: true

  };


  let result;


  if(categoryEditId){

    result = await supabaseClient
      .from('categories')
      .update({
        name: payload.name,
        icon: payload.icon,
        parent_id: payload.parent_id
      })
      .eq('id', categoryEditId)
      .eq('restaurant_id', currentRestaurant.id);

  }else{

    result = await supabaseClient
      .from('categories')
      .insert(payload);

  }


  if(result.error){

    document.getElementById('categoryModalMessage').textContent =
      result.error.message;

    return;
  }


  closeCategoryModal();

  await loadCategories();

}


async function toggleCategoryStatus(id, currentStatus){

  const { error } = await supabaseClient
    .from('categories')
    .update({
      active: !currentStatus
    })
    .eq('id', id)
    .eq('restaurant_id', currentRestaurant.id);


  if(error){

    alert(error.message);
    return;

  }


  await loadCategories();

}


async function deleteCategory(id){

  const ok =
    confirm(
      'Delete this category/sub-category?'
    );


  if(!ok) return;


  const { error } = await supabaseClient
    .from('categories')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', currentRestaurant.id);


  if(error){

    alert(error.message);
    return;

  }


  await loadCategories();

}


function escapeCategoryText(value){

  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

}


/* Load category page when opened */
const originalOpenPage = openPage;

openPage = function(page){

  originalOpenPage(page);

  if(page === 'categories'){

    buildCategoryPage();
    loadCategories();

  }

};


/* =========================================================
   PRODUCT MANAGEMENT
   ========================================================= */

let productEditId = null;
let productListCache = [];


function buildProductsPage(){

  const page = document.getElementById('productsPage');

  if(!page) return;

  page.innerHTML = `

    <div class="product-toolbar">

      <div>
        <h2>Products / Menu</h2>
        <p style="color:#888;margin:5px 0 0;">
          Manage food items, prices and availability
        </p>
      </div>

      <button
        class="primary-btn"
        onclick="openProductModal()"
      >
        + Add Product
      </button>

    </div>


    <div class="product-tools">

      <input
        id="productSearch"
        class="product-search"
        type="search"
        placeholder="🔎 Search food..."
        oninput="filterProducts()"
      >

      <select
        id="productCategoryFilter"
        class="product-filter"
        onchange="filterProducts()"
      >
        <option value="">All Categories</option>
      </select>

    </div>


    <div id="productList" class="product-list">

      <div class="product-empty">
        Loading products...
      </div>

    </div>

  `;

  createProductModal();

}


function createProductModal(){

  if(document.getElementById('productModal')) return;

  const modal = document.createElement('div');

  modal.id = 'productModal';
  modal.className = 'product-modal';

  modal.innerHTML = `

    <div class="product-modal-card">

      <h3 id="productModalTitle">
        Add Product
      </h3>


      <div class="product-form-grid">

        <div class="product-field full">

          <label>Food Name *</label>

          <input
            id="productName"
            type="text"
            placeholder="Chicken Biryani"
          >

        </div>


        <div class="product-field">

          <label>Category *</label>

          <select
            id="productCategory"
            onchange="loadProductSubCategories()"
          >
            <option value="">
              Select Category
            </option>
          </select>

        </div>


        <div class="product-field">

          <label>Sub-category</label>

          <select id="productSubCategory">

            <option value="">
              Select Sub-category
            </option>

          </select>

        </div>


        <div class="product-field">

          <label>Price (₹) *</label>

          <input
            id="productPrice"
            type="number"
            min="0"
            step="0.01"
            placeholder="220"
          >

        </div>


        <div class="product-field">

          <label>Food Type</label>

          <select id="productVeg">

            <option value="true">
              🟢 Veg
            </option>

            <option value="false">
              🔴 Non-Veg
            </option>

          </select>

        </div>


        <div class="product-field full">

          <label>Description</label>

          <textarea
            id="productDescription"
            placeholder="Food description..."
          ></textarea>

        </div>


        <div class="product-field full">

          <label>Food Photo</label>

          <input
            id="productPhoto"
            type="file"
            accept="image/*"
            onchange="previewProductImage(event)"
          >

          <img
            id="productImagePreview"
            class="product-image-preview"
          >

        </div>


        <div class="product-field full">

          <div class="product-checkboxes">

            <label>
              <input
                id="productAvailable"
                type="checkbox"
                checked
              >
              🟢 Available
            </label>

            <label>
              <input
                id="productBestseller"
                type="checkbox"
              >
              ⭐ Bestseller
            </label>

          </div>

        </div>

      </div>


      <div
        id="productModalMessage"
        style="
          margin-top:12px;
          font-size:13px;
        "
      ></div>


      <div class="product-modal-actions">

        <button
          class="product-cancel"
          onclick="closeProductModal()"
        >
          Cancel
        </button>

        <button
          class="product-save"
          onclick="saveProduct()"
        >
          Save Product
        </button>

      </div>

    </div>

  `;

  document.body.appendChild(modal);


  modal.addEventListener('click',(e)=>{

    if(e.target === modal){
      closeProductModal();
    }

  });

}


async function loadProductCategories(){

  if(!currentRestaurant) return;

  const { data, error } = await supabaseClient
    .from('categories')
    .select('id,name,parent_id,active,icon')
    .eq('restaurant_id', currentRestaurant.id)
    .order('sort_order')
    .order('name');


  if(error){

    console.error(error);
    return;

  }


  const mainCategories =
    (data || []).filter(c => !c.parent_id && c.active);


  const select =
    document.getElementById('productCategory');

  const filter =
    document.getElementById('productCategoryFilter');


  if(select){

    select.innerHTML = `
      <option value="">Select Category</option>
      ${
        mainCategories.map(c => `
          <option value="${c.id}">
            ${escapeProductText(c.icon || '📂')}
            ${escapeProductText(c.name)}
          </option>
        `).join('')
      }
    `;

  }


  if(filter){

    filter.innerHTML = `
      <option value="">All Categories</option>
      ${
        mainCategories.map(c => `
          <option value="${c.id}">
            ${escapeProductText(c.name)}
          </option>
        `).join('')
      }
    `;

  }


  window.productCategoryData = data || [];

}


async function loadProductSubCategories(selectedId=''){

  const categoryId =
    document.getElementById('productCategory')?.value;

  const select =
    document.getElementById('productSubCategory');

  if(!select) return;


  const all =
    window.productCategoryData || [];


  const children =
    all.filter(
      c =>
        c.parent_id === categoryId &&
        c.active
    );


  select.innerHTML = `

    <option value="">
      Select Sub-category
    </option>

    ${
      children.map(c => `
        <option value="${c.id}">
          ${escapeProductText(c.icon || '📁')}
          ${escapeProductText(c.name)}
        </option>
      `).join('')
    }

  `;


  if(selectedId){
    select.value = selectedId;
  }

}


async function loadProducts(){

  if(!currentRestaurant) return;


  const container =
    document.getElementById('productList');

  if(!container) return;


  const { data, error } =
    await supabaseClient
      .from('products')
      .select(`
        *,
        categories:category_id(
          id,
          name,
          parent_id
        )
      `)
      .eq(
        'restaurant_id',
        currentRestaurant.id
      )
      .order('created_at', {
        ascending:false
      });


  if(error){

    container.innerHTML = `
      <div class="product-empty">
        ${escapeProductText(error.message)}
      </div>
    `;

    return;

  }


  productListCache = data || [];

  renderProducts(productListCache);

}


function renderProducts(products){

  const container =
    document.getElementById('productList');

  if(!container) return;


  if(!products.length){

    container.innerHTML = `

      <div class="product-empty">

        <div style="font-size:45px;">
          🍽️
        </div>

        <h3>No products yet</h3>

        <p>Add your first food item.</p>

        <button
          class="primary-btn"
          onclick="openProductModal()"
        >
          + Add Product
        </button>

      </div>

    `;

    return;

  }


  container.innerHTML =
    products.map(product => {

      const category =
        product.categories?.name || 'No Category';


      return `

        <div class="product-card">

          ${
            product.photo_url
            ?
            `
              <img
                class="product-photo"
                src="${escapeProductText(product.photo_url)}"
                alt="${escapeProductText(product.name)}"
              >
            `
            :
            `
              <div class="product-photo-empty">
                🍽️
              </div>
            `
          }


          <div class="product-info">

            <h3>
              ${escapeProductText(product.name)}
            </h3>

            <div class="product-meta">
              ${escapeProductText(category)}
            </div>

            <div class="product-price">
              ₹${Number(product.price || 0).toFixed(2)}
            </div>


            ${
              product.description
              ?
              `
                <p>
                  ${escapeProductText(product.description)}
                </p>
              `
              :
              ''
            }


            <div class="product-badges">

              <span class="
                product-badge
                ${product.available ? 'available' : 'unavailable'}
              ">
                ${product.available ? '🟢 Available' : '🔴 Not Available'}
              </span>

              ${
                product.bestseller
                ?
                `
                  <span class="product-badge best">
                    ⭐ Bestseller
                  </span>
                `
                :
                ''
              }

              <span class="product-badge">
                ${product.veg ? '🌱 Veg' : '🍗 Non-Veg'}
              </span>

            </div>


            <div class="product-actions">

              <button
                onclick="editProduct('${product.id}')"
              >
                ✏️ Edit
              </button>

              <button
                onclick="toggleProductAvailability(
                  '${product.id}',
                  ${product.available}
                )"
              >
                ${product.available ? '🔴 Disable' : '🟢 Enable'}
              </button>

              <button
                class="delete-product"
                onclick="deleteProduct('${product.id}')"
              >
                🗑️ Delete
              </button>

            </div>

          </div>

        </div>

      `;

    }).join('');

}


function filterProducts(){

  const search =
    (
      document.getElementById('productSearch')?.value || ''
    ).toLowerCase().trim();


  const category =
    document.getElementById('productCategoryFilter')?.value || '';


  const filtered =
    productListCache.filter(product => {

      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search);


      const matchesCategory =
        !category ||
        product.category_id === category;


      return matchesSearch && matchesCategory;

    });


  renderProducts(filtered);

}


async function openProductModal(){

  productEditId = null;

  document.getElementById('productModalTitle').textContent =
    'Add Product';

  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productDescription').value = '';
  document.getElementById('productVeg').value = 'true';
  document.getElementById('productAvailable').checked = true;
  document.getElementById('productBestseller').checked = false;
  document.getElementById('productPhoto').value = '';

  const preview =
    document.getElementById('productImagePreview');

  preview.src = '';
  preview.style.display = 'none';


  await loadProductCategories();


  document.getElementById('productCategory').value = '';

  await loadProductSubCategories();


  document.getElementById('productModal').classList.add('show');

}


async function editProduct(id){

  const { data, error } =
    await supabaseClient
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', currentRestaurant.id)
      .single();


  if(error){

    alert(error.message);
    return;

  }


  productEditId = id;


  document.getElementById('productModalTitle').textContent =
    'Edit Product';


  document.getElementById('productName').value =
    data.name || '';

  document.getElementById('productPrice').value =
    data.price ?? '';

  document.getElementById('productDescription').value =
    data.description || '';

  document.getElementById('productVeg').value =
    String(data.veg ?? true);

  document.getElementById('productAvailable').checked =
    data.available !== false;

  document.getElementById('productBestseller').checked =
    data.bestseller === true;

  document.getElementById('productPhoto').value = '';


  await loadProductCategories();


  document.getElementById('productCategory').value =
    data.category_id || '';


  await loadProductSubCategories(data.category_id || '');


  const preview =
    document.getElementById('productImagePreview');


  if(data.photo_url){

    preview.src = data.photo_url;
    preview.style.display = 'block';

  }else{

    preview.src = '';
    preview.style.display = 'none';

  }


  document.getElementById('productModal').classList.add('show');

}


function previewProductImage(event){

  const file =
    event.target.files?.[0];

  const preview =
    document.getElementById('productImagePreview');

  if(!file){

    preview.src = '';
    preview.style.display = 'none';

    return;

  }


  preview.src =
    URL.createObjectURL(file);

  preview.style.display = 'block';

}


async function uploadProductImage(file){

  if(!file) return null;


  const extension =
    file.name.split('.').pop().toLowerCase();


  const filename =
    `${currentRestaurant.id}/${crypto.randomUUID()}.${extension}`;


  const { error } =
    await supabaseClient
      .storage
      .from('product-images')
      .upload(filename, file, {
        cacheControl:'3600',
        upsert:false
      });


  if(error){

    throw error;

  }


  const { data } =
    supabaseClient
      .storage
      .from('product-images')
      .getPublicUrl(filename);


  return data.publicUrl;

}


async function saveProduct(){

  const name =
    document.getElementById('productName')
      .value.trim();

  const categoryId =
    document.getElementById('productCategory')
      .value;

  const subCategoryId =
    document.getElementById('productSubCategory')
      .value;

  const price =
    Number(
      document.getElementById('productPrice')
        .value
    );


  if(!name){

    showProductMessage(
      'Please enter food name.',
      true
    );

    return;

  }


  if(!categoryId){

    showProductMessage(
      'Please select a category.',
      true
    );

    return;

  }


  if(!Number.isFinite(price) || price < 0){

    showProductMessage(
      'Please enter a valid price.',
      true
    );

    return;

  }


  const photoFile =
    document.getElementById('productPhoto')
      .files?.[0];


  const payload = {

    restaurant_id:
      currentRestaurant.id,

    name,

    category_id:
      subCategoryId || categoryId,

    description:
      document.getElementById('productDescription')
        .value.trim(),

    price,

    veg:
      document.getElementById('productVeg').value === 'true',

    available:
      document.getElementById('productAvailable').checked,

    bestseller:
      document.getElementById('productBestseller').checked

  };


  try{

    if(photoFile){

      showProductMessage(
        'Uploading photo...',
        false
      );

      payload.photo_url =
        await uploadProductImage(photoFile);

    }


    let result;


    if(productEditId){

      result =
        await supabaseClient
          .from('products')
          .update(payload)
          .eq('id', productEditId)
          .eq('restaurant_id', currentRestaurant.id);

    }else{

      result =
        await supabaseClient
          .from('products')
          .insert(payload);

    }


    if(result.error){

      throw result.error;

    }


    closeProductModal();

    await loadProducts();

  }catch(error){

    console.error(error);

    showProductMessage(
      error.message,
      true
    );

  }

}


async function toggleProductAvailability(
  id,
  currentStatus
){

  const { error } =
    await supabaseClient
      .from('products')
      .update({
        available: !currentStatus
      })
      .eq('id', id)
      .eq('restaurant_id', currentRestaurant.id);


  if(error){

    alert(error.message);
    return;

  }


  await loadProducts();

}


async function deleteProduct(id){

  if(!confirm('Delete this food item?')){
    return;
  }


  const { error } =
    await supabaseClient
      .from('products')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', currentRestaurant.id);


  if(error){

    alert(error.message);
    return;

  }


  await loadProducts();

}


function closeProductModal(){

  const modal =
    document.getElementById('productModal');

  if(modal){
    modal.classList.remove('show');
  }

}


function showProductMessage(text,error){

  const el =
    document.getElementById('productModalMessage');

  if(!el) return;

  el.textContent = text;

  el.style.color =
    error ? '#d33' : '#168b4d';

}


function escapeProductText(value){

  return String(value ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');

}


/* Load Products page */
const previousOpenPageForProducts = openPage;

openPage = function(page){

  previousOpenPageForProducts(page);

  if(page === 'products'){

    buildProductsPage();

    loadProductCategories();

    loadProducts();

  }

};

