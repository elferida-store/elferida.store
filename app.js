/**
 * خيوط الفريدة للكروشيه - محرك عرض وتصفية المنتجات باللغة العربية
 * Refactored solution using secure live Supabase integration and blistering fast non-destructive class toggling.
 */

/* ==========================================================================
   1. DEFAULT MOCK DATA COLLECTION (Fallback for High-Availability if Supabase is unconfigured)
   ========================================================================== */
const DEFAULT_STORE_PRODUCTS = [
  {
    id: "yarn-001",
    category: "خيوط",
    title: "قطن كومفورت الفاخر",
    brand: "Alize",
    material: "Cotton",
    color_name: "كشمير وردي هادئ",
    color_family: "red-pink",
    price: 85.00,
    image_url: "/images/terracotta_rose.jpg",
    is_available: true,
    is_best_seller: true,
    is_new_arrival: false
  },
  {
    id: "yarn-002",
    category: "خيوط",
    title: "ميرينو دريم الفاخر",
    brand: "Nako",
    material: "Wool",
    color_name: "أخضر ميرمية ساحر",
    color_family: "green-sage",
    price: 142.00,
    image_url: "/images/sage_green.jpg",
    is_available: true,
    is_best_seller: true,
    is_new_arrival: true
  },
  {
    id: "needle-001",
    category: "سنارات",
    title: "طقم سنارات تيوبروز الذهبية",
    price: 245.00,
    size: "8 مقاسات (2.5 - 6.0 ملم)",
    description: "سنارات مريحة بمقبض سليكون ناعم لتقليل تعب اليدين أثناء الحياكة الطويلة.",
    image_url: "/images/warm_mustard.jpg",
    is_available: true,
    is_best_seller: true,
    is_new_arrival: true
  },
  {
    id: "yarn-003",
    category: "خيوط",
    title: "شلة الكلاسيك اليومية",
    brand: "Alize",
    material: "Acrylic",
    color_name: "أزرق باستيل ناعم",
    color_family: "blue-denim",
    price: 69.00,
    image_url: "/images/denim_blue.jpg",
    is_available: true,
    is_best_seller: false,
    is_new_arrival: false
  },
  {
    id: "mesh-001",
    category: "شبك",
    title: "شبك حقائب بلاستيكي مرن",
    price: 32.00,
    size: "30x50 سم - فتحات 2 ملم",
    description: "شبك كروشيه عالي الجودة لصناعة حقائب وعلب منسوجة متماسكة واحترافية.",
    image_url: "/images/earthy_beige.jpg",
    is_available: true,
    is_best_seller: false,
    is_new_arrival: false
  },
  {
    id: "yarn-004",
    category: "خيوط",
    title: "إيكو سوفت قطن عضوي",
    brand: "Himalaya",
    material: "Cotton",
    color_name: "وردي بلوسوم دافئ",
    color_family: "red-pink",
    price: 98.00,
    image_url: "/images/terracotta_rose.jpg",
    is_available: true,
    is_best_seller: false,
    is_new_arrival: true
  },
  {
    id: "needle-002",
    category: "سنارات",
    title: "سنارة بامبو طبيعي فردية",
    price: 55.00,
    size: "مقاس 4.0 ملم",
    description: "سنارة بامبو خفيفة الوزن ومصقولة بعناية فائقة لانزلاق مثالي وسلس للخيوط.",
    image_url: "/images/sage_green.jpg",
    is_available: true,
    is_best_seller: false,
    is_new_arrival: false
  },
  {
    id: "acc-001",
    category: "إكسسوارات",
    title: "مجموعة علامات الغرز الفاخرة",
    price: 48.00,
    size: "علبة بها 50 قطعة ملونة",
    description: "دبابيس لتحديد الغرز البلاستيكية الآمنة مريحة للاستخدام وسهلة الغلق.",
    image_url: "/images/denim_blue.jpg",
    is_available: true,
    is_best_seller: false,
    is_new_arrival: false
  }
];

/* WhatsApp Store Contact Number */
const WHATSAPP_PHONE_NUMBER = "20123456789"; 

/* ==========================================================================
   2. APPLICATION STATE
   ========================================================================== */
const appState = {
  selectedCategory: "all",
  selectedBrand: "all",
  selectedMaterial: "all",
  selectedColorFamily: "all"
};

let supabaseClient = null;

/* ==========================================================================
   3. DOM ELEMENT SELECTORS (Pre-Cached for performance)
   ========================================================================== */
const DOM = {
  productsGrid: document.getElementById("products-grid"),
  emptyState: document.getElementById("empty-state"),
  activeFiltersMeta: document.getElementById("active-filters-meta"),
  txtResultsCount: document.getElementById("txt-results-count"),
  btnClearFilters: document.getElementById("btn-clear-filters"),
  btnResetEmpty: document.getElementById("btn-reset-empty"),
  brandFilters: document.querySelectorAll('[data-filter-type="brand"]'),
  materialFilters: document.querySelectorAll('[data-filter-type="material"]'),
  colorFilters: document.querySelectorAll('[data-filter-type="color_family"]'),
  storyTriggerAbout: document.getElementById("story-trigger-about"),
  storyModal: document.getElementById("story-modal"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalExploreBtn: document.getElementById("modal-explore-btn"),
  catalogSection: document.getElementById("catalog-section"),
  categoryTabs: document.querySelectorAll(".category-tab"),
  filterBar: document.getElementById("filter-bar"),
  
  // Dropdown System Elements
  triggerBrand: document.getElementById("trigger-brand"),
  triggerColor: document.getElementById("trigger-color"),
  triggerMaterial: document.getElementById("trigger-material"),
  menuBrand: document.getElementById("menu-brand"),
  menuColor: document.getElementById("menu-color"),
  menuMaterial: document.getElementById("menu-material"),
  badgeBrand: document.getElementById("badge-brand"),
  badgeColor: document.getElementById("badge-color"),
  badgeMaterial: document.getElementById("badge-material")
};

/* ==========================================================================
   4. SUPABASE CREDENTIALS & DB ENGINE
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
      return true;
    } catch (e) {
      console.error("Supabase Client Initialization Error:", e);
    }
  }
  return false;
}

/**
 * Fetch products directly from the Supabase table (products).
 * LocalStorage reading has been completely eliminated for products data.
 */
async function getActiveProducts() {
  const isConnected = initSupabase();
  if (isConnected && supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return data.map(p => {
          if (!p.category) p.category = "خيوط";
          return p;
        });
      }
    } catch (err) {
      console.error("Failed to fetch products from Supabase. Falling back to offline fallback data.", err);
    }
  }
  return DEFAULT_STORE_PRODUCTS;
}

/* ==========================================================================
   5. CATALOG RENDER ENGINE (Pristine non-destructive class toggle system)
   ========================================================================== */

/**
 * Renders all store items into the DOM exactly ONCE during application ingress.
 */
async function buildFullCatalogDOM() {
  DOM.productsGrid.innerHTML = "";
  
  const products = await getActiveProducts();
  
  if (products.length === 0) {
    DOM.productsGrid.classList.add("hidden");
    DOM.emptyState.classList.remove("hidden");
    updateFilterMetaUI(0);
    return;
  }
  
  DOM.emptyState.add = "hidden"; // Safe reset
  DOM.emptyState.classList.add("hidden");
  DOM.productsGrid.classList.remove("hidden");
  
  const fragment = document.createDocumentFragment();
  products.forEach((product, index) => {
    const card = createProductCard(product);
    // Capped animation delay for smooth entry
    card.style.animationDelay = `${Math.min(index, 8) * 50}ms`;
    fragment.appendChild(card);
  });
  
  DOM.productsGrid.appendChild(fragment);
  
  // Apply filtering system state over existing DOM elements initially
  applyFilters();
}

/**
 * Blistering-fast non-destructive filter toggling system.
 * Avoids .innerHTML re-renders and eliminates heavy browser repaints.
 */
function applyFilters() {
  const cards = DOM.productsGrid.querySelectorAll(".product-card");
  let visibleCount = 0;
  
  cards.forEach(card => {
    const category = card.getAttribute("data-category") || "خيوط";
    const brand = card.getAttribute("data-brand") || "all";
    const material = card.getAttribute("data-material") || "all";
    const colorFamily = card.getAttribute("data-color-family") || "all";
    
    const categoryMatch = appState.selectedCategory === "all" || category === appState.selectedCategory;
    const brandMatch = appState.selectedBrand === "all" || brand === appState.selectedBrand;
    const materialMatch = appState.selectedMaterial === "all" || material === appState.selectedMaterial;
    const colorMatch = appState.selectedColorFamily === "all" || colorFamily === appState.selectedColorFamily;
    
    const isMatch = categoryMatch && brandMatch && materialMatch && colorMatch;
    
    if (isMatch) {
      card.classList.remove("hidden");
      visibleCount++;
    } else {
      card.classList.add("hidden");
    }
  });
  
  // Toggle layout structure based on dynamic visible counts
  if (visibleCount === 0) {
    DOM.productsGrid.classList.add("hidden");
    DOM.emptyState.classList.remove("hidden");
  } else {
    DOM.emptyState.classList.add("hidden");
    DOM.productsGrid.classList.remove("hidden");
  }
  
  // Sync the metadata text
  updateFilterMetaUI(visibleCount);
  
  // Synchronize dropdown controls
  syncDropdownTriggers();
}

/**
 * Synchronizes the visual active states and badges of the multi-dropdown system.
 */
function syncDropdownTriggers() {
  if (DOM.triggerBrand && DOM.badgeBrand) {
    if (appState.selectedBrand === "all") {
      DOM.triggerBrand.classList.remove("active-trigger");
      DOM.badgeBrand.textContent = "الكل";
    } else {
      DOM.triggerBrand.classList.add("active-trigger");
      DOM.badgeBrand.textContent = translateBrand(appState.selectedBrand);
    }
  }

  if (DOM.triggerMaterial && DOM.badgeMaterial) {
    if (appState.selectedMaterial === "all") {
      DOM.triggerMaterial.classList.remove("active-trigger");
      DOM.badgeMaterial.textContent = "الكل";
    } else {
      DOM.triggerMaterial.classList.add("active-trigger");
      DOM.badgeMaterial.textContent = translateMaterial(appState.selectedMaterial);
    }
  }

  if (DOM.triggerColor && DOM.badgeColor) {
    if (appState.selectedColorFamily === "all") {
      DOM.triggerColor.classList.remove("active-trigger");
      DOM.badgeColor.textContent = "الكل";
    } else {
      DOM.triggerColor.classList.add("active-trigger");
      let colorName = "الكل";
      switch (appState.selectedColorFamily) {
        case "red-pink": colorName = "وردي/أحمر"; break;
        case "blue-denim": colorName = "أزرق"; break;
        case "green-sage": colorName = "أخضر"; break;
        case "earthy-beige": colorName = "بيج"; break;
        case "yellow-mustard": colorName = "خردلي"; break;
      }
      DOM.badgeColor.textContent = colorName;
    }
  }
}

/**
 * Translates material name to Arabic for client display
 */
function translateMaterial(mat) {
  switch(mat) {
    case "Cotton": return "قطن طبيعي";
    case "Wool": return "صوف ناعم";
    case "Acrylic": return "أكريليك فاخر";
    case "Silk": return "مزيج الحرير";
    default: return mat || "";
  }
}

/**
 * Translates brand name to Arabic for client display
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

/**
 * Creates product card DOM element with appropriate attributes and datasets
 * @param {Object} product Product model
 * @returns {HTMLElement} Custom formatted div element
 */
function createProductCard(product) {
  const cardDiv = document.createElement("div");
  cardDiv.className = "product-card";
  cardDiv.id = `card-${product.id}`;
  
  // Set filter dataset tags for non-destructive class filtering
  cardDiv.setAttribute("data-category", product.category || "خيوط");
  cardDiv.setAttribute("data-brand", product.brand || "all");
  cardDiv.setAttribute("data-material", product.material || "all");
  cardDiv.setAttribute("data-color-family", product.color_family || "all");

  // Overlaid badges markup
  let badgeHTML = "";
  if (!product.is_available) {
    badgeHTML += `<span class="badge badge-stock out-of-stock">غير متوفر</span>`;
  } else {
    badgeHTML += `<span class="badge badge-stock">متوفر في المخزن</span>`;
    if (product.is_best_seller) {
      badgeHTML += `<span class="badge badge-promo">الأكثر مبيعاً</span>`;
    } else if (product.is_new_arrival) {
      badgeHTML += `<span class="badge badge-new">وصل حديثاً</span>`;
    }
  }

  const isAvailable = product.is_available;
  const btnClass = isAvailable ? "btn-order-wa" : "btn-order-wa disabled";
  const btnText = isAvailable ? "اطلبي الآن عبر الواتساب" : "منتهي من المخزن";
  const btnDisabledAttr = isAvailable ? "" : "disabled aria-disabled='true'";

  // Handle dynamic metadata and descriptions based on category type
  let metaHTML = "";
  let descriptionHTML = "";

  if (product.category === "خيوط") {
    metaHTML = `${translateBrand(product.brand)} • ${translateMaterial(product.material)}`;
    descriptionHTML = `درجة اللون: ${product.color_name || "درجة مميزة"}`;
  } else {
    metaHTML = `${product.category} ${product.size ? `• ${product.size}` : ""}`;
    descriptionHTML = product.description || "خامة وجودة عالية ومناسبة للأعمال الاحترافية";
  }

  cardDiv.innerHTML = `
    <div class="product-image-container">
      <div class="badge-container">
        ${badgeHTML}
      </div>
      <img class="product-image" 
           src="${product.image_url}" 
           alt="${product.title}" 
           loading="lazy" 
           referrerpolicy="no-referrer">
    </div>
    <div class="product-details">
      <span class="product-meta">${metaHTML}</span>
      <h3 class="product-title" title="${product.title}">${product.title}</h3>
      <span class="product-shade">${descriptionHTML}</span>
      <div class="price-row">
        <span class="price-tag">${product.price} ج.م</span>
      </div>
      <button class="${btnClass}" ${btnDisabledAttr} data-product-id="${product.id}">
        <svg class="wa-icon wa-icon-inline" viewBox="0 0 64 64">
          <path d="M30.19.031a31.753 31.753 0 0 0-26.735 46.12L.085 62.509A1.235 1.235 0 0 0 1.58 63.96l16.029-3.8A31.744 31.744 0 1 0 30.19.031zM49.316 49.31A24.871 24.871 0 0 1 20.68 54l-2.232-1.112-9.828 2.326 2.069-10.042-1.1-2.154a24.874 24.874 0 0 1 4.578-28.857A24.854 24.854 0 0 1 49.316 49.31zm0 0" fill="currentColor"></path>
          <path d="M47.147 38.619L41 36.854a2.292 2.292 0 0 0-2.267.6l-1.5 1.531a2.239 2.239 0 0 1-2.435.514C31.883 38.32 25.765 32.88 24.2 30.16a2.239 2.239 0 0 1 .177-2.483l1.312-1.7a2.292 2.292 0 0 0 .283-2.328L23.388 17.8a2.293 2.293 0 0 0-3.58-.82c-1.716 1.451-3.752 3.657-4 6.1-.436 4.308 1.411 9.738 8.4 16.258 8.071 7.534 14.534 8.528 18.743 7.509 2.387-.578 4.294-2.9 5.5-4.793a2.293 2.293 0 0 0-1.3-3.436z" fill="currentColor"></path>
        </svg>
        <span>${btnText}</span>
      </button>
    </div>
  `;

  // Attach interactive click handler to order button if item is in stock
  if (isAvailable) {
    const orderBtn = cardDiv.querySelector(".btn-order-wa");
    orderBtn.addEventListener("click", () => handleOrderClick(product));
  }

  return cardDiv;
}

/* ==========================================================================
   6. DYNAMIC WHATSAPP LINK GENERATION (Bespoke custom encoded message)
   ========================================================================== */

/**
 * Constructs an aesthetic, custom-encoded pre-filled WhatsApp link and opens it
 * @param {Object} product Selected item details
 */
function handleOrderClick(product) {
  let message = `مرحباً خيوط الفريدة للكروشيه! 🌸\n\nأود طلب منتج مميز من كتالوج متجركم:\n\n`;
  message += `• الفئة: ${product.category}\n`;
  message += `• المنتج: ${product.title}\n`;
  
  if (product.category === "خيوط") {
    message += `• البراند: ${translateBrand(product.brand)}\n`;
    message += `• الخامة: ${translateMaterial(product.material)}\n`;
    message += `• درجة اللون: ${product.color_name || "غير محدد"}\n`;
  } else {
    if (product.size) message += `• المقاس: ${product.size}\n`;
    if (product.description) message += `• الوصف: ${product.description}\n`;
  }
  
  message += `• السعر: ${product.price} ج.م\n\n`;
  message += `يرجى إفادتي بتوفر هذا المنتج للتوصيل. شكراً جزيلاً لكم!`;

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodedText}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

/* ==========================================================================
   7. FILTER HANDLING & SYSTEM RESET
   ========================================================================== */

/**
 * Toggle visibility of reset action bar based on whether filters are selected
 * @param {Number} count Result count matching filters
 */
function updateFilterMetaUI(count) {
  const isAnyFilterActive = appState.selectedBrand !== "all" || 
                             appState.selectedMaterial !== "all" || 
                             appState.selectedColorFamily !== "all";

  if (isAnyFilterActive && (appState.selectedCategory === "all" || appState.selectedCategory === "خيوط")) {
    DOM.activeFiltersMeta.classList.remove("hidden");
    DOM.txtResultsCount.textContent = `عرض ${count} من منتجات الكروشيه الفاخرة`;
  } else {
    DOM.activeFiltersMeta.classList.add("hidden");
  }
}

/**
 * Resets all parameters to show the complete catalog list
 */
function resetAllFilters() {
  appState.selectedBrand = "all";
  appState.selectedMaterial = "all";
  appState.selectedColorFamily = "all";

  // Re-sync all buttons styling states in dropdown lists
  DOM.brandFilters.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter-value") === "all");
  });
  
  DOM.materialFilters.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter-value") === "all");
  });

  DOM.colorFilters.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-filter-value") === "all");
  });

  applyFilters();
}

/**
 * Coordinate and bind event handlers to category tabs and filter touch-pill rows
 */
function initializeFilters() {
  // Category tabs click handler
  DOM.categoryTabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      const cat = e.currentTarget.getAttribute("data-category");
      appState.selectedCategory = cat;

      // Style management
      DOM.categoryTabs.forEach(t => t.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // Collapsing / Hiding subfilters for non-yarn categories
      if (cat === "all" || cat === "خيوط") {
        if (DOM.filterBar) DOM.filterBar.classList.remove("collapsed");
      } else {
        if (DOM.filterBar) DOM.filterBar.classList.add("collapsed");
        // Reset subfilters so they don't block needles/mesh/accessories rendering
        appState.selectedBrand = "all";
        appState.selectedMaterial = "all";
        appState.selectedColorFamily = "all";
      }

      applyFilters();
    });
  });

  // Dropdown Toggles (Cached structures - only one open at a time)
  const triggers = [
    { btn: DOM.triggerBrand, menu: DOM.menuBrand },
    { btn: DOM.triggerColor, menu: DOM.menuColor },
    { btn: DOM.triggerMaterial, menu: DOM.menuMaterial }
  ];

  triggers.forEach(t => {
    if (t.btn && t.menu) {
      t.btn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Close other dropdowns
        triggers.forEach(other => {
          if (other.btn !== t.btn) {
            if (other.btn) other.btn.classList.remove("menu-open");
            if (other.menu) other.menu.classList.add("hidden");
          }
        });

        // Toggle current dropdown
        const isOpen = !t.menu.classList.contains("hidden");
        if (isOpen) {
          t.menu.classList.add("hidden");
          t.btn.classList.remove("menu-open");
        } else {
          t.menu.classList.remove("hidden");
          t.btn.classList.add("menu-open");
        }
      });
    }
  });

  // Close dropdowns on outside clicks
  document.addEventListener("click", () => {
    triggers.forEach(t => {
      if (t.btn) t.btn.classList.remove("menu-open");
      if (t.menu) t.menu.classList.add("hidden");
    });
  });

  // Prevent closing when clicking inside a dropdown list menu
  document.querySelectorAll(".dropdown-menu-list").forEach(menu => {
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  });

  // Brand Filter Events
  DOM.brandFilters.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const val = e.currentTarget.getAttribute("data-filter-value");
      appState.selectedBrand = val;
      
      DOM.brandFilters.forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // Close the menu
      if (DOM.menuBrand) DOM.menuBrand.classList.add("hidden");
      if (DOM.triggerBrand) DOM.triggerBrand.classList.remove("menu-open");
      
      applyFilters();
    });
  });

  // Material Filter Events
  DOM.materialFilters.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const val = e.currentTarget.getAttribute("data-filter-value");
      appState.selectedMaterial = val;
      
      DOM.materialFilters.forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // Close the menu
      if (DOM.menuMaterial) DOM.menuMaterial.classList.add("hidden");
      if (DOM.triggerMaterial) DOM.triggerMaterial.classList.remove("menu-open");
      
      applyFilters();
    });
  });

  // Color Swatch Circle Events
  DOM.colorFilters.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const val = e.currentTarget.getAttribute("data-filter-value");
      appState.selectedColorFamily = val;
      
      DOM.colorFilters.forEach(b => b.classList.remove("active"));
      e.currentTarget.classList.add("active");

      // Close the menu
      if (DOM.menuColor) DOM.menuColor.classList.add("hidden");
      if (DOM.triggerColor) DOM.triggerColor.classList.remove("menu-open");
      
      applyFilters();
    });
  });

  // Bind clear actions
  if (DOM.btnClearFilters) DOM.btnClearFilters.addEventListener("click", resetAllFilters);
  if (DOM.btnResetEmpty) DOM.btnResetEmpty.addEventListener("click", resetAllFilters);
}

/* ==========================================================================
   8. INTERACTIVE STORY MODAL SYSTEM (UX Requirements 2)
   ========================================================================== */

/**
 * Toggles "Our Story" overlay modal on and off with clean, graceful transitions
 * @param {Boolean} show True to open modal, False to dismiss
 */
function toggleStoryModal(show) {
  if (show) {
    DOM.storyModal.classList.remove("hidden");
    document.body.style.overflow = "hidden"; // Prevent background body-scrolling
  } else {
    DOM.storyModal.classList.add("hidden");
    document.body.style.overflow = ""; // Restore scrolling
  }
}

/**
 * Initialize interactive modal event listeners
 */
function initializeModal() {
  if (DOM.storyTriggerAbout) {
    DOM.storyTriggerAbout.addEventListener("click", () => {
      toggleStoryModal(true);
    });
  }

  if (DOM.modalCloseBtn) {
    DOM.modalCloseBtn.addEventListener("click", () => {
      toggleStoryModal(false);
    });
  }

  if (DOM.storyModal) {
    DOM.storyModal.addEventListener("click", (e) => {
      if (e.target === DOM.storyModal) {
        toggleStoryModal(false);
      }
    });
  }

  if (DOM.modalExploreBtn) {
    DOM.modalExploreBtn.addEventListener("click", () => {
      toggleStoryModal(false);
      if (DOM.catalogSection) {
        DOM.catalogSection.scrollIntoView({ behavior: "smooth" });
      }
    });
  }
}

/* ==========================================================================
   9. APPLICATION INGRESS
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initializeFilters();
  initializeModal();
  buildFullCatalogDOM(); // Single initial pull and layout render on startup
});
