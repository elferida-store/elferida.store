/**
 * بوابة الإدارة ومخزن خيوط الفريدة للكروشيه
 * Refactored secure administration dashboard with strict email checks, paginated catalog searching,
 * immediate drag-and-drop file previews, and custom responsive layouts.
 */

// Permitted Admin Emails - STRICT: Only the official store account is permitted
const PERMITTED_EMAIL = "elferida.store@gmail.com";

const DEFAULT_SUPABASE_URL = "https://qpjjocvkctfaydaxxzck.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwampvY3ZrY3RmYXlkYXh4emNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NTEzNDgsImV4cCI6MjA5OTAyNzM0OH0.GhcAHAiPNJX9PwCy8JUGirSNcjtcMcdK2mt8zXob9_s";

let supabaseClient = null;
let currentProducts = [];

// Local file preview caching
let selectedImageFile = null;

// Pagination and Filtering State
let currentPage = 1;
const itemsPerPage = 10;
let searchQuery = "";
let categoryFilter = "all";

// DOM Elements
const DOM = {
  loadingView: document.getElementById("admin-loading"),
  authView: document.getElementById("admin-auth"),
  dashboardView: document.getElementById("admin-dashboard"),
  emailDisplay: document.getElementById("admin-email-display"),
  adminAvatar: document.getElementById("admin-avatar"),
  btnGoogleAuth: document.getElementById("btn-google-auth"),
  btnLogOut: document.getElementById("btn-admin-logout"),
  authErrorBanner: document.getElementById("auth-error-banner"),
  authErrorText: document.getElementById("auth-error-text"),
  
  // Stats
  statTotal: document.getElementById("stat-total-items"),
  statInStock: document.getElementById("stat-instock-items"),
  statOutOfStock: document.getElementById("stat-outofstock-items"),
  statBestSeller: document.getElementById("stat-bestseller-items"),
  dashboardCount: document.getElementById("dashboard-count-lbl"),

  // Form Controls
  formAdd: document.getElementById("form-add-product"),
  editProductId: document.getElementById("edit-product-id"),
  formCardTitle: document.getElementById("form-card-title"),
  formCardSubtitle: document.getElementById("form-card-subtitle"),
  newCategory: document.getElementById("new-category"),
  newTitle: document.getElementById("new-title"),
  newPrice: document.getElementById("new-price"),
  newDescription: document.getElementById("new-description"),
  newStorageCode: document.getElementById("new-storage-code"),
  newBrand: document.getElementById("new-brand"),
  newMaterial: document.getElementById("new-material"),
  newShade: document.getElementById("new-shade"),
  newColorFamily: document.getElementById("new-color-family"),
  newSize: document.getElementById("new-size"),
  newImage: document.getElementById("new-image"),
  newInStock: document.getElementById("new-instock"),
  newBestSeller: document.getElementById("new-bestseller"),
  newArrival: document.getElementById("new-arrival"),
  btnSubmitForm: document.getElementById("btn-submit-form"),
  btnCancelEdit: document.getElementById("btn-cancel-edit"),

  // Upload Zone
  imageDropzone: document.getElementById("image-dropzone"),
  imageFileInput: document.getElementById("image-file-input"),
  previewThumbnailArea: document.getElementById("preview-thumbnail-area"),
  imagePreview: document.getElementById("image-preview"),
  previewFilename: document.getElementById("preview-filename"),
  previewFilesize: document.getElementById("preview-filesize"),
  btnRemovePreview: document.getElementById("btn-remove-preview"),

  // Inventory & Search
  tableBody: document.getElementById("admin-tbody-products"),
  inventorySearch: document.getElementById("inventory-search"),
  inventoryCategoryFilter: document.getElementById("inventory-category-filter"),
  paginationInfo: document.getElementById("pagination-info"),
  btnPrevPage: document.getElementById("btn-prev-page"),
  btnNextPage: document.getElementById("btn-next-page"),

  // Config panel
  btnToggleConfig: document.getElementById("btn-toggle-config-panel"),
  configPanel: document.getElementById("supabase-config-panel"),
  inputUrl: document.getElementById("input-sb-url"),
  inputKey: document.getElementById("input-sb-key"),
  btnSaveConfig: document.getElementById("btn-save-sb-config"),
  configStatusLbl: document.getElementById("config-status-lbl"),

  // Modals
  confirmModal: document.getElementById("confirm-modal"),
  confirmModalIcon: document.getElementById("confirm-modal-icon"),
  confirmModalTitle: document.getElementById("confirm-modal-title"),
  confirmModalMessage: document.getElementById("confirm-modal-message"),
  btnConfirmYes: document.getElementById("btn-confirm-yes"),
  btnConfirmNo: document.getElementById("btn-confirm-no"),

  // Toast
  toast: document.getElementById("admin-toast"),

  // Nav shortcuts
  navBtnForm: document.getElementById("nav-btn-form"),
  navBtnInventory: document.getElementById("nav-btn-inventory")
};

/* ==========================================================================
   1. SUPABASE CONNECTION SYSTEM
   ========================================================================== */

function getSavedSupabaseConfig() {
  const url = localStorage.getItem("sb_url") || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem("sb_key") || DEFAULT_SUPABASE_ANON_KEY;
  return { url, key };
}

function initSupabase() {
  const { url, key } = getSavedSupabaseConfig();
  
  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      if (DOM.configStatusLbl) {
        DOM.configStatusLbl.textContent = "متصل بنجاح";
        DOM.configStatusLbl.style.color = "var(--color-whatsapp)";
      }
      if (DOM.inputUrl) DOM.inputUrl.value = url;
      if (DOM.inputKey) DOM.inputKey.value = key;
      return true;
    } catch (e) {
      console.error("Supabase initialization error:", e);
    }
  }
  
  if (DOM.configStatusLbl) {
    DOM.configStatusLbl.textContent = "غير متصل";
    DOM.configStatusLbl.style.color = "var(--color-terracotta)";
  }
  return false;
}

/* ==========================================================================
   2. AUTHENTICATION & SECURITY GUARDING (STRICT CHECK)
   ========================================================================== */

async function checkAuthSession() {
  showView("loading");

  const connected = initSupabase();
  if (!connected || !supabaseClient) {
    showView("auth");
    return;
  }

  // Subscribe to changes
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log("Auth State Changed:", event);
    
    // Clean OAuth credentials from URL hash
    if (window.location.hash && (window.location.hash.includes("access_token=") || window.location.hash.includes("id_token="))) {
      try {
        const cleanUrl = window.location.pathname + window.location.search;
        window.history.replaceState(null, document.title, cleanUrl);
      } catch (e) {
        console.error("Failed to strip token hash:", e);
      }
    }

    if (session && session.user) {
      const email = (session.user.email || "").toLowerCase().trim();
      if (email === PERMITTED_EMAIL.toLowerCase().trim()) {
        if (DOM.authErrorBanner) DOM.authErrorBanner.classList.add("hidden");
        await loadCatalogFromSupabase();
        setupDashboardUI(session.user);
      } else {
        // STRICT email authorization breach: immediately log them out, deny layout rendering
        await supabaseClient.auth.signOut();
        showView("auth");
        showAuthError("عذراً، هذا الحساب لا يملك صلاحية دخول للوحة التحكم.");
      }
    } else {
      showView("auth");
    }
  });

  // Check current session
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    if (session && session.user) {
      const email = (session.user.email || "").toLowerCase().trim();
      if (email === PERMITTED_EMAIL.toLowerCase().trim()) {
        if (DOM.authErrorBanner) DOM.authErrorBanner.classList.add("hidden");
        await loadCatalogFromSupabase();
        setupDashboardUI(session.user);
      } else {
        await supabaseClient.auth.signOut();
        showView("auth");
        showAuthError("عذراً، هذا الحساب لا يملك صلاحية دخول للوحة التحكم.");
      }
    } else {
      showView("auth");
    }
  } catch (err) {
    console.error("Failed to fetch startup session:", err);
    showView("auth");
  }
}

function showAuthError(message) {
  if (DOM.authErrorBanner && DOM.authErrorText) {
    DOM.authErrorText.textContent = message;
    DOM.authErrorBanner.classList.remove("hidden");
  }
}

function showView(viewName) {
  DOM.loadingView.classList.add("hidden");
  DOM.authView.classList.add("hidden");
  DOM.dashboardView.classList.add("hidden");

  if (viewName === "loading") {
    DOM.loadingView.classList.remove("hidden");
  } else if (viewName === "auth") {
    DOM.authView.classList.remove("hidden");
  } else if (viewName === "dashboard") {
    DOM.dashboardView.classList.remove("hidden");
  }
}

function handleGoogleLogin() {
  if (!supabaseClient) {
    showToast("يرجى إدخال وحفظ بيانات اتصال Supabase أولاً!");
    DOM.configPanel.classList.remove("hidden");
    return;
  }

  try {
    const redirectUrl = window.location.href.split('#')[0].split('?')[0];
    supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl
      }
    });
  } catch (err) {
    showToast("فشل توجيه المصادقة: " + err.message);
  }
}

async function handleLogOut() {
  if (supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
      showToast("تم تسجيل الخروج بنجاح.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error(err);
      window.location.reload();
    }
  }
}

/* ==========================================================================
   3. DATA FETCHING & STATS CALCULATIONS
   ========================================================================== */

async function loadCatalogFromSupabase() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    currentProducts = (data || []).map(p => {
      // Ensure compatibility: map is_in_stock column value to is_available and vice-versa
      const inStock = p.is_in_stock !== undefined ? p.is_in_stock : (p.is_available !== undefined ? p.is_available : true);
      p.is_in_stock = inStock;
      p.is_available = inStock;
      return p;
    });
  } catch (err) {
    console.error("Failed to query catalog:", err);
    showToast("خطأ في قراءة بيانات المتجر: " + err.message);
    currentProducts = [];
  }
}

function setupDashboardUI(user) {
  if (DOM.emailDisplay) DOM.emailDisplay.textContent = user.email;
  
  // Profile picture fallback
  const avatarUrl = user.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop";
  if (DOM.adminAvatar) DOM.adminAvatar.src = avatarUrl;

  updateStats();
  renderProductsTable();
  showView("dashboard");
}

function updateStats() {
  const total = currentProducts.length;
  const inStock = currentProducts.filter(p => p.is_available).length;
  const outOfStock = total - inStock;
  const bestSellers = currentProducts.filter(p => p.is_best_seller).length;

  if (DOM.statTotal) DOM.statTotal.textContent = total;
  if (DOM.statInStock) DOM.statInStock.textContent = inStock;
  if (DOM.statOutOfStock) DOM.statOutOfStock.textContent = outOfStock;
  if (DOM.statBestSeller) DOM.statBestSeller.textContent = bestSellers;
  
  if (DOM.dashboardCount) {
    DOM.dashboardCount.textContent = `يتوفر لديكِ ${total} منتجاً مسجلاً في الكتالوج حالياً.`;
  }
}

/* ==========================================================================
   4. INTERACTIVE REUSABLE CONFIRMATION MODAL
   ========================================================================== */

function showConfirmModal({ title, message, icon, onConfirm }) {
  if (!DOM.confirmModal) return;

  if (DOM.confirmModalTitle) DOM.confirmModalTitle.textContent = title;
  if (DOM.confirmModalMessage) DOM.confirmModalMessage.textContent = message;
  if (DOM.confirmModalIcon) DOM.confirmModalIcon.textContent = icon || "💡";

  DOM.confirmModal.classList.remove("hidden");

  // Remove previous listener clones by replacing buttons
  const newYes = DOM.btnConfirmYes.cloneNode(true);
  const newNo = DOM.btnConfirmNo.cloneNode(true);

  DOM.btnConfirmYes.parentNode.replaceChild(newYes, DOM.btnConfirmYes);
  DOM.btnConfirmNo.parentNode.replaceChild(newNo, DOM.btnConfirmNo);

  DOM.btnConfirmYes = newYes;
  DOM.btnConfirmNo = newNo;

  DOM.btnConfirmYes.addEventListener("click", () => {
    DOM.confirmModal.classList.add("hidden");
    if (onConfirm) onConfirm();
  });

  DOM.btnConfirmNo.addEventListener("click", () => {
    DOM.confirmModal.classList.add("hidden");
  });
}

/* ==========================================================================
   5. IMAGE UPLOAD PREVIEW & STORAGE SYSTEM
   ========================================================================== */

function handleImageFileSelection(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("يرجى اختيار ملف صورة صالح (png, jpg, jpeg)!");
    return;
  }

  selectedImageFile = file;

  // Immediate preview using FileReader before uploading to Supabase Bucket
  const reader = new FileReader();
  reader.onload = (e) => {
    if (DOM.imagePreview) DOM.imagePreview.src = e.target.result;
    if (DOM.previewFilename) DOM.previewFilename.textContent = file.name;
    
    // Format size
    const kb = (file.size / 1024).toFixed(1);
    if (DOM.previewFilesize) DOM.previewFilesize.textContent = `${kb} KB`;
    
    // Display thumbnail area
    if (DOM.previewThumbnailArea) DOM.previewThumbnailArea.classList.remove("hidden");
    
    // Clear URL field to signify file upload is primary
    if (DOM.newImage) DOM.newImage.value = "";
  };
  reader.readAsDataURL(file);
}

function removeImagePreview() {
  selectedImageFile = null;
  if (DOM.imagePreview) DOM.imagePreview.src = "";
  if (DOM.previewThumbnailArea) DOM.previewThumbnailArea.classList.add("hidden");
  if (DOM.imageFileInput) DOM.imageFileInput.value = "";
}

// Upload file to Supabase bucket 'products'
async function uploadImageToSupabaseBucket() {
  if (!selectedImageFile || !supabaseClient) return null;
  
  try {
    const fileExt = selectedImageFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    const { data, error } = await supabaseClient.storage
      .from("products")
      .upload(filePath, selectedImageFile);

    if (error) throw error;

    const { data: { publicUrl } } = supabaseClient.storage
      .from("products")
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error("Storage upload error:", err);
    showToast("تنبيه: فشل رفع الملف إلى Supabase Bucket، سيتم حفظ الرابط المحلي.");
    // Fallback to dataURL if bucket doesn't exist
    return DOM.imagePreview.src;
  }
}

/* ==========================================================================
   6. PAGINATED PRODUCTS INVENTORY TABLE RENDER
   ========================================================================== */

function translateMaterial(mat) {
  switch(mat) {
    case "Cotton": return "قطن";
    case "Wool": return "صوف";
    case "Acrylic": return "أكريليك";
    case "Silk": return "مزيج حرير";
    default: return mat || "";
  }
}

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
  if (!DOM.tableBody) return;

  DOM.tableBody.innerHTML = "";

  // 1. Filter locally
  let filtered = currentProducts;

  if (categoryFilter !== "all") {
    filtered = filtered.filter(p => p.category === categoryFilter);
  }

  if (searchQuery.trim() !== "") {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => {
      const titleMatch = (p.title || "").toLowerCase().includes(query);
      const skuMatch = (p.storage_code || "").toLowerCase().includes(query);
      return titleMatch || skuMatch;
    });
  }

  // 2. Paginate
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filtered.slice(startIndex, endIndex);

  // 3. Update pagination text & buttons
  if (DOM.paginationInfo) {
    const showingStart = totalItems === 0 ? 0 : startIndex + 1;
    const showingEnd = Math.min(endIndex, totalItems);
    DOM.paginationInfo.textContent = `عرض ${showingStart} - ${showingEnd} من أصل ${totalItems} منتج`;
  }

  if (DOM.btnPrevPage) DOM.btnPrevPage.disabled = currentPage === 1;
  if (DOM.btnNextPage) DOM.btnNextPage.disabled = currentPage === totalPages;

  if (pageItems.length === 0) {
    DOM.tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding: 40px; color: var(--color-text-light);">لا يوجد منتجات تطابق البحث المختار.</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();

  pageItems.forEach(product => {
    const tr = document.createElement("tr");
    tr.id = `row-${product.id}`;

    let detailsHTML = "";
    if (product.category === "خيوط") {
      detailsHTML = `${translateBrand(product.brand)} • ${translateMaterial(product.material)} • درجة: ${product.color_name || "مميزة"}`;
    } else {
      const sizeDesc = product.size ? `• ${product.size}` : "";
      detailsHTML = `${product.category} ${sizeDesc}`;
    }

    const rawPrice = product.price !== undefined && product.price !== null ? parseFloat(product.price) : 0;
    const safePrice = isNaN(rawPrice) ? 0 : rawPrice;
    const sku = product.storage_code || "غير محدد";

    const isProductInStock = product.is_in_stock !== undefined ? product.is_in_stock : (product.is_available !== undefined ? product.is_available : true);

    tr.innerHTML = `
      <td>
        <div class="table-product-cell">
          <img class="table-product-thumb" src="${product.image_url || 'https://images.unsplash.com/photo-1584990347449-ac7757f43ba1?q=80&w=128'}" alt="Thumb" referrerpolicy="no-referrer">
          <div class="table-product-info">
            <h4>${product.title}</h4>
            <span>${detailsHTML}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="sku-badge-code">${sku}</span>
      </td>
      <td>
        <span class="table-price-text">${safePrice.toFixed(2)} ج.م</span>
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" class="toggle-stock" data-id="${product.id}" ${isProductInStock ? "checked" : ""}>
          <span class="slider"></span>
        </label>
      </td>
      <td>
        <div class="row-actions-grp">
          <button class="action-row-btn edit" data-id="${product.id}" title="تعديل بيانات المنتج" style="display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></button>
          <button class="action-row-btn copy" data-id="${product.id}" title="نسخ رابط المنتج المباشر" style="display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="link" style="width: 14px; height: 14px;"></i></button>
          <button class="action-row-btn delete" data-id="${product.id}" title="حذف المنتج نهائياً" style="display: inline-flex; align-items: center; justify-content: center;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
        </div>
      </td>
    `;

    // Toggle stock status switch with small confirmation modal
    const stockToggle = tr.querySelector(".toggle-stock");
    stockToggle.addEventListener("click", (e) => {
      e.preventDefault(); // Pause toggle behavior until approved
      const targetState = stockToggle.checked;
      
      showConfirmModal({
        title: "تغيير حالة توفر القطعة",
        message: `هل أنتِ متأكدة من تغيير حالة توفر [${product.title}] بالمخزن؟`,
        icon: "💡",
        onConfirm: async () => {
          stockToggle.checked = targetState;
          await updateProductField(product.id, "is_available", targetState);
        }
      });
    });

    // Row Edit Button Click
    tr.querySelector(".action-row-btn.edit").addEventListener("click", () => {
      fillFormForEditing(product);
    });

    // Row Delete Button Click
    tr.querySelector(".action-row-btn.delete").addEventListener("click", () => {
      showConfirmModal({
        title: "حذف المنتج نهائياً",
        message: `هل أنتِ متأكدة من رغبتكِ في حذف المنتج [${product.title}] نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`,
        icon: "⚠️",
        onConfirm: async () => {
          await deleteProductFromDatabase(product.id);
        }
      });
    });

    // Row Copy Direct Link
    tr.querySelector(".action-row-btn.copy").addEventListener("click", () => {
      const productUrl = `${window.location.origin}/index.html?product=${product.id}`;
      navigator.clipboard.writeText(productUrl).then(() => {
        showToast("تم نسخ رابط المنتج المباشر بنجاح!");
      }).catch(err => {
        showToast("عذراً، فشل نسخ الرابط.");
      });
    });

    fragment.appendChild(tr);
  });

  DOM.tableBody.appendChild(fragment);

  // Re-initialize Lucide Icons for dynamic table rows
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/* ==========================================================================
   7. FORM CRUD MUTATIONS (Publish, Edit, Update, Delete)
   ========================================================================== */

async function updateProductField(id, field, value) {
  if (!supabaseClient) return;
  try {
    const dbField = field === "is_available" ? "is_in_stock" : field;

    const { error } = await supabaseClient
      .from("products")
      .update({ [dbField]: value })
      .eq("id", id);

    if (error) throw error;

    // Update locally
    currentProducts = currentProducts.map(p => {
      if (p.id === id) {
        return { ...p, is_available: value, is_in_stock: value };
      }
      return p;
    });

    updateStats();
    renderProductsTable();
    showToast("تم تحديث حالة المنتج بنجاح ومزامنتها.");
  } catch (err) {
    console.error(err);
    showToast("فشلت مزامنة حالة المنتج: " + err.message);
    renderProductsTable();
  }
}

async function deleteProductFromDatabase(id) {
  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;

    currentProducts = currentProducts.filter(p => p.id !== id);
    updateStats();
    renderProductsTable();
    showToast("تم حذف المنتج بنجاح من كتالوج المتجر.");
  } catch (err) {
    console.error(err);
    showToast("عذراً، فشل حذف المنتج: " + err.message);
  }
}

function fillFormForEditing(product) {
  if (!DOM.formAdd) return;

  // Change Title and UI indicators
  if (DOM.formCardTitle) DOM.formCardTitle.textContent = `تعديل المنتج: ${product.title}`;
  if (DOM.formCardSubtitle) DOM.formCardSubtitle.textContent = "أنتِ الآن في وضع تعديل بيانات القطعة.";
  if (DOM.btnSubmitForm) DOM.btnSubmitForm.textContent = "تحديث المنتج الآن ✨";
  if (DOM.btnCancelEdit) DOM.btnCancelEdit.classList.remove("hidden");

  // Populate basic inputs
  if (DOM.editProductId) DOM.editProductId.value = product.id;
  if (DOM.newCategory) {
    DOM.newCategory.value = product.category || "خيوط";
    // Trigger change event to toggle custom fields
    DOM.newCategory.dispatchEvent(new Event("change"));
  }
  if (DOM.newTitle) DOM.newTitle.value = product.title || "";
  if (DOM.newPrice) DOM.newPrice.value = product.price || "";
  if (DOM.newDescription) DOM.newDescription.value = product.description || "";
  if (DOM.newStorageCode) DOM.newStorageCode.value = product.storage_code || "";

  // Populate dynamic ones
  if (product.category === "خيوط") {
    if (DOM.newBrand) DOM.newBrand.value = product.brand || "Alize";
    if (DOM.newMaterial) DOM.newMaterial.value = product.material || "Cotton";
    if (DOM.newShade) DOM.newShade.value = product.color_name || "";
    if (DOM.newColorFamily) DOM.newColorFamily.value = product.color_family || "earthy-beige";
  } else {
    if (DOM.newSize) DOM.newSize.value = product.size || "";
  }

  // Populate image values
  if (DOM.newImage) DOM.newImage.value = product.image_url || "";
  
  if (product.image_url) {
    if (DOM.imagePreview) DOM.imagePreview.src = product.image_url;
    if (DOM.previewFilename) DOM.previewFilename.textContent = "الرابط الحالي للصورة";
    if (DOM.previewFilesize) DOM.previewFilesize.textContent = "موجود مسبقاً";
    if (DOM.previewThumbnailArea) DOM.previewThumbnailArea.classList.remove("hidden");
  } else {
    removeImagePreview();
  }

  // Switches
  if (DOM.newInStock) DOM.newInStock.checked = !!(product.is_in_stock !== undefined ? product.is_in_stock : product.is_available);
  if (DOM.newBestSeller) DOM.newBestSeller.checked = !!product.is_best_seller;
  if (DOM.newArrival) DOM.newArrival.checked = !!product.is_new_arrival;

  // Scroll to form container for seamless editing
  const formSection = document.getElementById("form-card-container");
  if (formSection) {
    formSection.scrollIntoView({ behavior: "smooth" });
  }
}

function clearFormAndResetState() {
  if (DOM.formAdd) DOM.formAdd.reset();
  if (DOM.editProductId) DOM.editProductId.value = "";
  
  removeImagePreview();

  if (DOM.formCardTitle) DOM.formCardTitle.textContent = "إضافة منتج جديد";
  if (DOM.formCardSubtitle) DOM.formCardSubtitle.textContent = "أدخلي تفاصيل القطعة لنشرها بالمتجر فوراً.";
  if (DOM.btnSubmitForm) DOM.btnSubmitForm.textContent = "نشر المنتج في المتجر 🧶";
  if (DOM.btnCancelEdit) DOM.btnCancelEdit.classList.add("hidden");

  // Reset category selectors visibility
  if (DOM.newCategory) {
    DOM.newCategory.value = "خيوط";
    DOM.newCategory.dispatchEvent(new Event("change"));
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const title = DOM.newTitle.value.trim();
  const price = parseFloat(DOM.newPrice.value);
  const category = DOM.newCategory.value;
  const rawStorageCode = DOM.newStorageCode.value.trim();
  const editId = DOM.editProductId.value;

  // Sanitize storage_code to strip common injection characters, leaving uppercase clean string
  const storageCode = rawStorageCode.toUpperCase().replace(/[<>'"%;()]/g, "");

  if (!title || isNaN(price) || !storageCode) {
    showToast("يرجى ملء جميع الحقول الإلزامية بنجاح.");
    return;
  }

  // Show loading spinner
  DOM.btnSubmitForm.disabled = true;
  DOM.btnSubmitForm.textContent = "جاري الحفظ والمزامنة...";

  try {
    let finalImageUrl = DOM.newImage.value.trim();

    // If an image file was selected locally, upload it first to the 'products' bucket
    if (selectedImageFile) {
      const uploaded = await uploadImageToSupabaseBucket();
      if (uploaded) {
        finalImageUrl = uploaded;
      }
    }

    if (!finalImageUrl) {
      finalImageUrl = "https://images.unsplash.com/photo-1584990347449-ac7757f43ba1?q=80&w=256";
    }

    const payload = {
      title,
      price,
      category,
      storage_code: storageCode,
      image_url: finalImageUrl,
      image: finalImageUrl, // Ensure full database schema column compliance
      description: DOM.newDescription.value.trim() || "خامة وجودة عالية كروشيه صناعة يدوية فاخرة.",
      is_in_stock: DOM.newInStock.checked,
      is_available: DOM.newInStock.checked, // Backward compatibility with frontend logic
      is_best_seller: DOM.newBestSeller.checked,
      is_new_arrival: DOM.newArrival.checked,
    };

    // Pack dynamic fields
    if (category === "خيوط") {
      payload.brand = DOM.newBrand.value;
      payload.material = DOM.newMaterial.value;
      payload.color_name = DOM.newShade.value.trim() || "درجة مميزة";
      payload.color_family = DOM.newColorFamily.value;
      payload.size = null;
    } else {
      payload.brand = null;
      payload.material = null;
      payload.color_name = null;
      payload.color_family = null;
      payload.size = DOM.newSize.value.trim() || null;
    }

    if (editId) {
      // Edit Mode Update
      const { error } = await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", editId);

      if (error) throw error;

      // Update local array
      currentProducts = currentProducts.map(p => {
        if (p.id === editId) {
          return { ...p, ...payload };
        }
        return p;
      });

      showToast(`تم تحديث بيانات المنتج [${title}] بنجاح!`);
    } else {
      // Create Mode Insert
      const newId = `${category === "خيوط" ? "yarn" : "item"}-${Date.now()}`;
      const finalPayload = { id: newId, created_at: new Date().toISOString(), ...payload };

      const { error } = await supabaseClient
        .from("products")
        .insert([finalPayload]);

      if (error) throw error;

      // Add to local cache
      currentProducts.unshift(finalPayload);
      showToast(`تم نشر منتجكِ الجديد [${title}] بنجاح بالمتجر!`);
    }

    clearFormAndResetState();
    updateStats();
    renderProductsTable();

  } catch (err) {
    console.error("Form submission failed:", err);
    showToast("خطأ أثناء حفظ المنتج: " + err.message);
  } finally {
    DOM.btnSubmitForm.disabled = false;
    DOM.btnSubmitForm.textContent = editId ? "تحديث المنتج الآن ✨" : "نشر المنتج في المتجر 🧶";
  }
}

/* ==========================================================================
   8. NOTIFICATION TOAST
   ========================================================================== */

function showToast(message) {
  if (!DOM.toast) return;
  DOM.toast.textContent = message;
  DOM.toast.classList.add("show");
  setTimeout(() => {
    DOM.toast.classList.remove("show");
  }, 4000);
}

/* ==========================================================================
   9. SYSTEM INITIALIZER & EVENT BINDINGS
   ========================================================================== */

function init() {
  checkAuthSession();

  // Dynamic Category field toggle inside form
  if (DOM.newCategory) {
    DOM.newCategory.addEventListener("change", (e) => {
      const val = e.target.value;
      const yarnFields = document.getElementById("yarn-fields-container");
      const genericFields = document.getElementById("generic-fields-container");

      if (val === "خيوط") {
        if (yarnFields) yarnFields.classList.remove("hidden");
        if (genericFields) genericFields.classList.add("hidden");
      } else {
        if (yarnFields) yarnFields.classList.add("hidden");
        if (genericFields) genericFields.classList.remove("hidden");
      }
    });
  }

  // Google Login click
  if (DOM.btnGoogleAuth) {
    DOM.btnGoogleAuth.addEventListener("click", handleGoogleLogin);
  }

  // Logout click
  if (DOM.btnLogOut) {
    DOM.btnLogOut.addEventListener("click", handleLogOut);
  }

  // Supabase Local Configuration credentials toggle click
  if (DOM.btnToggleConfig) {
    DOM.btnToggleConfig.addEventListener("click", () => {
      if (DOM.configPanel) DOM.configPanel.classList.toggle("hidden");
    });
  }

  // Save Supabase local connections
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
          checkAuthSession();
        }
      } else {
        showToast("يرجى إدخال الرابط ومفتاح Anon API معاً.");
      }
    });
  }

  // Bind Form Submit
  if (DOM.formAdd) {
    DOM.formAdd.addEventListener("submit", handleFormSubmit);
  }

  // Cancel edit button click
  if (DOM.btnCancelEdit) {
    DOM.btnCancelEdit.addEventListener("click", clearFormAndResetState);
  }

  // Interactive local image file select
  if (DOM.imageDropzone && DOM.imageFileInput) {
    DOM.imageDropzone.addEventListener("click", () => {
      DOM.imageFileInput.click();
    });

    DOM.imageFileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFileSelection(e.target.files[0]);
      }
    });

    // Drag and drop mechanics
    DOM.imageDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      DOM.imageDropzone.style.borderColor = "var(--color-primary)";
      DOM.imageDropzone.style.backgroundColor = "var(--color-primary-light)";
    });

    DOM.imageDropzone.addEventListener("dragleave", () => {
      DOM.imageDropzone.style.borderColor = "var(--border-light)";
      DOM.imageDropzone.style.backgroundColor = "#FFFDFB";
    });

    DOM.imageDropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      DOM.imageDropzone.style.borderColor = "var(--border-light)";
      DOM.imageDropzone.style.backgroundColor = "#FFFDFB";

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  // Remove File Preview
  if (DOM.btnRemovePreview) {
    DOM.btnRemovePreview.addEventListener("click", removeImagePreview);
  }

  // Searching the inventory
  if (DOM.inventorySearch) {
    DOM.inventorySearch.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      currentPage = 1;
      renderProductsTable();
    });
  }

  // Category filtering
  if (DOM.inventoryCategoryFilter) {
    DOM.inventoryCategoryFilter.addEventListener("change", (e) => {
      categoryFilter = e.target.value;
      currentPage = 1;
      renderProductsTable();
    });
  }

  // Pagination navigation clicks
  if (DOM.btnPrevPage) {
    DOM.btnPrevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderProductsTable();
        document.getElementById("table-card-container").scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  if (DOM.btnNextPage) {
    DOM.btnNextPage.addEventListener("click", () => {
      currentPage++;
      renderProductsTable();
      document.getElementById("table-card-container").scrollIntoView({ behavior: "smooth" });
    });
  }

  // Sidebar shortcut links scroll behaviors
  if (DOM.navBtnForm) {
    DOM.navBtnForm.addEventListener("click", () => {
      DOM.navBtnForm.classList.add("active");
      if (DOM.navBtnInventory) DOM.navBtnInventory.classList.remove("active");
      
      const el = document.getElementById("form-card-container");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (DOM.navBtnInventory) {
    DOM.navBtnInventory.addEventListener("click", () => {
      DOM.navBtnInventory.classList.add("active");
      if (DOM.navBtnForm) DOM.navBtnForm.classList.remove("active");

      const el = document.getElementById("table-card-container");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    });
  }
}

// Ingress entry point
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
