/**
 * لوحة تحكم الإدارة - خيوط الفريدة للكروشيه
 * Senior-Architect optimized secure CRUD managers, instant route guards, and live Supabase querying.
 */

// Permitted Admin Emails
const PERMITTED_EMAILS = [
  "noviumnodes@gmail.com",
  "elferida.store@gmail.com"
];

let supabaseClient = null;
let currentProducts = [];

// DOM Elements
const DOM = {
  loadingView: document.getElementById("admin-loading"),
  authView: document.getElementById("admin-auth"),
  dashboardView: document.getElementById("admin-dashboard"),
  userNav: document.getElementById("admin-user-nav"),
  emailDisplay: document.getElementById("admin-email-display"),
  btnGoogleAuth: document.getElementById("btn-google-auth"),
  btnLogOut: document.getElementById("btn-admin-logout"),
  
  // Stats Elements
  statTotal: document.getElementById("stat-total-items"),
  statInStock: document.getElementById("stat-instock-items"),
  statOutOfStock: document.getElementById("stat-outofstock-items"),
  statBestSeller: document.getElementById("stat-bestseller-items"),
  dashboardCount: document.getElementById("dashboard-count-lbl"),

  // Table & Form
  tableBody: document.getElementById("admin-tbody-products"),
  formAdd: document.getElementById("form-add-product"),
  toast: document.getElementById("admin-toast"),

  // Supabase Configuration Panel
  btnToggleConfig: document.getElementById("btn-toggle-config-panel"),
  configPanel: document.getElementById("supabase-config-panel"),
  inputUrl: document.getElementById("input-sb-url"),
  inputKey: document.getElementById("input-sb-key"),
  btnSaveConfig: document.getElementById("btn-save-sb-config"),
  configStatusLbl: document.getElementById("config-status-lbl")
};

/* ==========================================================================
   1. SUPABASE CLIENT HANDLER
   ========================================================================== */

function loadSavedSupabaseCredentials() {
  let url = localStorage.getItem("sb_url") || "";
  let key = localStorage.getItem("sb_key") || "";
  try {
    if (!url && typeof import.meta !== "undefined" && import.meta.env) {
      url = import.meta.env.VITE_SUPABASE_URL || "";
    }
    if (!key && typeof import.meta !== "undefined" && import.meta.env) {
      key = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
    }
  } catch (e) {
    // Fail silently in development
  }
  return { url, key };
}

function initSupabase() {
  const { url, key } = loadSavedSupabaseCredentials();
  
  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      DOM.configStatusLbl.textContent = "متصل بنجاح";
      DOM.configStatusLbl.className = "config-status active";
      if (DOM.inputUrl) DOM.inputUrl.value = url;
      if (DOM.inputKey) DOM.inputKey.value = key;
      return true;
    } catch (e) {
      console.error("Supabase Initialization Failed", e);
    }
  }
  
  DOM.configStatusLbl.textContent = "غير متصل";
  DOM.configStatusLbl.className = "config-status inactive";
  return false;
}

/* ==========================================================================
   2. AUTHENTICATION & SECURITY CONTROLLER (Strict Guarding)
   ========================================================================== */

async function checkAuthSession() {
  // Show loading initially to prevent any flash of layout/products
  showView("loading");

  // Completely wipe any sandbox quick-access variables from local storage to prevent bypass
  localStorage.removeItem("admin_sandbox_active");

  const connected = initSupabase();
  if (connected && supabaseClient) {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) throw error;

      if (session && session.user) {
        const userEmail = (session.user.email || "").toLowerCase().trim();
        const isPermitted = PERMITTED_EMAILS.some(email => email.toLowerCase().trim() === userEmail);
        if (isPermitted) {
          // Retrieve real products from Supabase first before rendering
          await loadCatalogFromSupabase();
          setupAdminDashboard(session.user.email);
          return;
        } else {
          // Immediate zero-leak secure wipe and redirect
          document.body.innerHTML = "";
          window.location.replace("/index.html");
          return;
        }
      }
    } catch (err) {
      console.error("Auth session validation error:", err);
    }
  }

  // Not logged in: show clean Auth screen
  showView("auth");
}

function handleGoogleLogin() {
  if (!supabaseClient) {
    showToast("يرجى إدخال وحفظ بيانات اتصال Supabase أولاً!");
    DOM.configPanel.classList.remove("hidden");
    return;
  }

  try {
    supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/admin.html"
      }
    });
  } catch (err) {
    showToast("فشل توجيه المصادقة: " + err.message);
  }
}

function handleLogOut() {
  if (supabaseClient) {
    supabaseClient.auth.signOut().then(() => {
      showToast("تم تسجيل الخروج بنجاح");
      setTimeout(() => {
        window.location.replace("/index.html");
      }, 1000);
    });
  } else {
    window.location.replace("/index.html");
  }
}

function showView(viewName) {
  DOM.loadingView.classList.add("hidden");
  DOM.authView.classList.add("hidden");
  DOM.dashboardView.classList.add("hidden");
  DOM.userNav.classList.add("hidden");

  if (viewName === "loading") {
    DOM.loadingView.classList.remove("hidden");
  } else if (viewName === "auth") {
    DOM.authView.classList.remove("hidden");
  } else if (viewName === "dashboard") {
    DOM.dashboardView.classList.remove("hidden");
    DOM.userNav.classList.remove("hidden");
  }
}

/* ==========================================================================
   3. CATALOG STATE MANAGEMENT (CRUD Engine)
   ========================================================================== */

async function loadCatalogFromSupabase() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      currentProducts = data || [];
    } catch (err) {
      console.error("Failed to load products from database:", err);
      showToast("خطأ في جلب بيانات الكتالوج: " + err.message);
      currentProducts = [];
    }
  } else {
    currentProducts = [];
  }
}

function setupAdminDashboard(email) {
  DOM.emailDisplay.textContent = email;
  renderProductsTable();
  updateStats();
  showView("dashboard");
  showToast("تمت المصادقة وتسجيل الدخول بنجاح.");
}

function updateStats() {
  DOM.statTotal.textContent = currentProducts.length;
  
  const inStock = currentProducts.filter(p => p.is_available).length;
  DOM.statInStock.textContent = inStock;
  DOM.statOutOfStock.textContent = currentProducts.length - inStock;
  
  const bestSellers = currentProducts.filter(p => p.is_best_seller).length;
  DOM.statBestSeller.textContent = bestSellers;

  DOM.dashboardCount.textContent = `${currentProducts.length} منتجاً مسجلاً في المتجر حالياً`;
}

/**
 * Translates material name to Arabic for admin table display
 */
function translateMaterial(mat) {
  switch(mat) {
    case "Cotton": return "قطن";
    case "Wool": return "صوف";
    case "Acrylic": return "أكريليك";
    case "Silk": return "مزيج حرير";
    default: return mat || "";
  }
}

/**
 * Translates brand name to Arabic for admin table display
 */
function translateBrand(br) {
  switch(br) {
    case "Alize": return "أليز";
    case "Nako": return "ناكو";
    case "Himalaya": return "هيمالايا";
    case "Bespoke": return "استوديو خاص";
    default: return br || "";
  }
}

function renderProductsTable() {
  DOM.tableBody.innerHTML = "";

  const fragment = document.createDocumentFragment();

  currentProducts.forEach(product => {
    const tr = document.createElement("tr");
    tr.id = `row-${product.id}`;

    // Handle appropriate details markup based on product category
    let detailsHTML = "";
    if (product.category === "خيوط") {
      detailsHTML = `${translateBrand(product.brand)} • ${translateMaterial(product.material)} • درجة اللون: ${product.color_name || "درجة مميزة"}`;
    } else {
      const sizeDesc = product.size ? `• ${product.size}` : "";
      detailsHTML = `${product.category} ${sizeDesc} • ${product.description || "لا يوجد وصف"}`;
    }

    tr.innerHTML = `
      <td>
        <div class="td-product">
          <img class="admin-thumb" src="${product.image_url}" alt="Thumbnail" referrerpolicy="no-referrer">
          <div class="product-info-text">
            <h4>${product.title}</h4>
            <span>${detailsHTML}</span>
          </div>
        </div>
      </td>
      <td>
        <input type="number" step="0.01" class="price-input" value="${product.price.toFixed(2)}" data-id="${product.id}">
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-stock" data-id="${product.id}" ${product.is_available ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-bestseller" data-id="${product.id}" ${product.is_best_seller ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-new" data-id="${product.id}" ${product.is_new_arrival ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <button class="btn-delete" data-id="${product.id}" title="حذف المنتج">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </td>
    `;

    // Bind item-level events
    // Price change
    const priceInput = tr.querySelector(".price-input");
    priceInput.addEventListener("change", async (e) => {
      const pid = e.target.getAttribute("data-id");
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        await updateProductField(pid, "price", val);
      }
    });

    // In Stock Toggle
    const stockToggle = tr.querySelector(".toggle-stock");
    stockToggle.addEventListener("change", async (e) => {
      const pid = e.target.getAttribute("data-id");
      await updateProductField(pid, "is_available", e.target.checked);
    });

    // Best Seller Toggle
    const bsToggle = tr.querySelector(".toggle-bestseller");
    bsToggle.addEventListener("change", async (e) => {
      const pid = e.target.getAttribute("data-id");
      await updateProductField(pid, "is_best_seller", e.target.checked);
    });

    // New Arrival Toggle
    const newToggle = tr.querySelector(".toggle-new");
    newToggle.addEventListener("change", async (e) => {
      const pid = e.target.getAttribute("data-id");
      await updateProductField(pid, "is_new_arrival", e.target.checked);
    });

    // Delete Button
    const deleteBtn = tr.querySelector(".btn-delete");
    deleteBtn.addEventListener("click", () => {
      const pid = deleteBtn.getAttribute("data-id");
      if (confirm("هل أنتِ متأكدة من رغبتكِ في حذف هذا المنتج نهائياً؟ سيتم مزامنة الحذف فوراً وبشكل لا يمكن تراجعه.")) {
        deleteProduct(pid);
      }
    });

    fragment.appendChild(tr);
  });

  DOM.tableBody.appendChild(fragment);
}

async function updateProductField(id, field, value) {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("products")
        .update({ [field]: value })
        .eq("id", id);
      
      if (error) throw error;

      // Update local cache
      currentProducts = currentProducts.map(p => {
        if (p.id === id) {
          return { ...p, [field]: value };
        }
        return p;
      });
      updateStats();
      showToast("تم مزامنة التعديل بنجاح");
    } catch (err) {
      console.error("Database update error:", err);
      showToast("خطأ أثناء مزامنة التعديل: " + err.message);
      // Re-render to revert visual switch state
      renderProductsTable();
    }
  } else {
    showToast("تنبيه: قاعدة البيانات غير متصلة حالياً.");
  }
}

async function deleteProduct(id) {
  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", id);
      
      if (error) throw error;

      currentProducts = currentProducts.filter(p => p.id !== id);
      renderProductsTable();
      updateStats();
      showToast("تم حذف المنتج ومزامنة التغيير بنجاح");
    } catch (err) {
      console.error("Database deletion error:", err);
      showToast("فشل الحذف من قاعدة البيانات: " + err.message);
    }
  } else {
    showToast("تنبيه: قاعدة البيانات غير متصلة حالياً.");
  }
}

async function handleAddProduct() {
  const category = document.getElementById("new-category").value;
  const title = document.getElementById("new-title").value.trim();
  const price = parseFloat(document.getElementById("new-price").value);
  const imageUrl = document.getElementById("new-image").value;

  if (!title || isNaN(price)) {
    showToast("يرجى ملء جميع الحقول المطلوبة بشكل صحيح.");
    return;
  }

  const newId = `${category === "خيوط" ? "yarn" : "item"}-${Date.now()}`;
  const newProduct = {
    id: newId,
    category: category,
    title: title,
    price: price,
    image_url: imageUrl,
    is_available: true,
    is_best_seller: false,
    is_new_arrival: true
  };

  // Dynamically pack values based on the product category
  if (category === "خيوط") {
    const brand = document.getElementById("new-brand").value;
    const material = document.getElementById("new-material").value;
    const shadeName = document.getElementById("new-shade").value.trim() || "درجة مميزة";
    const colorFamily = document.getElementById("new-color-family").value;

    newProduct.brand = brand;
    newProduct.material = material;
    newProduct.color_name = shadeName;
    newProduct.color_family = colorFamily;
  } else {
    const size = document.getElementById("new-size").value.trim();
    const description = document.getElementById("new-description").value.trim();

    newProduct.size = size || "";
    newProduct.description = description || "خامة وجودة عالية ومناسبة للأعمال الاحترافية";
  }

  if (supabaseClient) {
    try {
      const { error } = await supabaseClient
        .from("products")
        .insert([newProduct]);
      
      if (error) throw error;

      currentProducts.unshift(newProduct);
      renderProductsTable();
      updateStats();
      
      // Reset form and UI
      DOM.formAdd.reset();
      const yarnFields = document.getElementById("yarn-fields-container");
      const genericFields = document.getElementById("generic-fields-container");
      if (yarnFields) yarnFields.classList.remove("hidden");
      if (genericFields) genericFields.classList.add("hidden");

      showToast("تم نشر وتعميم المنتج بنجاح في كتالوج المتجر المباشر!");
    } catch (err) {
      console.error("Database insert error:", err);
      showToast("خطأ أثناء نشر المنتج في قاعدة البيانات: " + err.message);
    }
  } else {
    showToast("لا يمكن إضافة المنتج: العميل غير متصل بـ Supabase.");
  }
}

/* ==========================================================================
   4. UTILITIES & HELPERS
   ========================================================================== */

function showToast(message) {
  DOM.toast.textContent = message;
  DOM.toast.classList.add("show");
  setTimeout(() => {
    DOM.toast.classList.remove("show");
  }, 3000);
}

// Bind Global Actions
document.addEventListener("DOMContentLoaded", () => {
  // Check auth immediately
  checkAuthSession();

  // Category select dynamic field showing/fading
  const categorySelect = document.getElementById("new-category");
  const yarnFields = document.getElementById("yarn-fields-container");
  const genericFields = document.getElementById("generic-fields-container");

  if (categorySelect && yarnFields && genericFields) {
    categorySelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      if (selected === "خيوط") {
        yarnFields.classList.remove("hidden");
        genericFields.classList.add("hidden");
      } else {
        yarnFields.classList.add("hidden");
        genericFields.classList.remove("hidden");
      }
    });
  }

  // Bind Google auth click
  if (DOM.btnGoogleAuth) {
    DOM.btnGoogleAuth.addEventListener("click", handleGoogleLogin);
  }

  // Bind Logout
  if (DOM.btnLogOut) {
    DOM.btnLogOut.addEventListener("click", handleLogOut);
  }

  // Bind toggle config credentials panel
  if (DOM.btnToggleConfig) {
    DOM.btnToggleConfig.addEventListener("click", () => {
      DOM.configPanel.classList.toggle("hidden");
    });
  }

  // Save Supabase credentials click
  if (DOM.btnSaveConfig) {
    DOM.btnSaveConfig.addEventListener("click", () => {
      const url = DOM.inputUrl.value.trim();
      const key = DOM.inputKey.value.trim();
      
      if (url && key) {
        localStorage.setItem("sb_url", url);
        localStorage.setItem("sb_key", key);
        showToast("تم حفظ بيانات Supabase بنجاح محلياً!");
        const connected = initSupabase();
        if (connected) {
          // Attempt to re-run auth check with the new database connection
          checkAuthSession();
        }
      } else {
        showToast("يرجى إدخال الرابط والمفتاح معاً");
      }
    });
  }

  // Save new product form
  if (DOM.formAdd) {
    DOM.formAdd.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAddProduct();
    });
  }
});
