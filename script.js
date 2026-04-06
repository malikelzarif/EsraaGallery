(function () {
  "use strict";

  const STORAGE_KEYS = {
    cart: "esraaGalleryCart",
    checkout: "esraaGalleryCheckout",
    order: "esraaGalleryLastOrder"
  };

  const DEFAULT_SHIPPING = 12;
  const TAX_RATE = 0.08;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

  const createImageMarkup = (imageClass = "product-card__image--one", extraClass = "") =>
    `<div class="product-card__image ${imageClass} ${extraClass}".trim()></div>`;

  const safeGetProducts = () => {
    if (typeof window.PRODUCTS !== "undefined" && Array.isArray(window.PRODUCTS)) {
      return window.PRODUCTS;
    }
    return [];
  };

  const getProductById = (id) => safeGetProducts().find((product) => product.id === id);

  const getCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.cart));
      return Array.isArray(cart) ? cart : [];
    } catch (error) {
      return [];
    }
  };

  const saveCart = (cart) => {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    updateCartCount();
    renderCartDrawer();
    renderCartPage();
    renderCheckoutSummary();
  };

  const getCartDetailed = () => {
    const cart = getCart();

    return cart
      .map((item) => {
        const product = getProductById(item.id);
        if (!product) return null;

        return {
          ...item,
          product,
          lineTotal: product.price * item.quantity
        };
      })
      .filter(Boolean);
  };

  const getCartTotals = () => {
    const items = getCartDetailed();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shipping = itemCount > 0 ? DEFAULT_SHIPPING : 0;
    const tax = subtotal > 0 ? subtotal * TAX_RATE : 0;
    const total = subtotal + shipping + tax;

    return {
      items,
      itemCount,
      subtotal,
      shipping,
      tax,
      total
    };
  };

  const updateCartCount = () => {
    const { itemCount } = getCartTotals();
    $$("[data-cart-count]").forEach((node) => {
      node.textContent = itemCount;
    });
  };

  const addToCart = (productId, quantity = 1) => {
    const product = getProductById(productId);
    if (!product) return;

    const cart = getCart();
    const existing = cart.find((item) => item.id === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ id: productId, quantity });
    }

    saveCart(cart);
    openCartDrawer();
  };

  const updateCartItemQuantity = (productId, nextQuantity) => {
    const cart = getCart();
    const item = cart.find((entry) => entry.id === productId);
    if (!item) return;

    if (nextQuantity <= 0) {
      const filtered = cart.filter((entry) => entry.id !== productId);
      saveCart(filtered);
      return;
    }

    item.quantity = nextQuantity;
    saveCart(cart);
  };

  const removeCartItem = (productId) => {
    const nextCart = getCart().filter((item) => item.id !== productId);
    saveCart(nextCart);
  };

  const clearCart = () => {
    localStorage.removeItem(STORAGE_KEYS.cart);
    updateCartCount();
    renderCartDrawer();
    renderCartPage();
    renderCheckoutSummary();
  };

  const setCurrentYear = () => {
    const yearNode = $("#year");
    if (yearNode) yearNode.textContent = new Date().getFullYear();
  };

  const handleHeaderScroll = () => {
    const header = $("#siteHeader");
    if (!header) return;

    const onScroll = () => {
      if (window.scrollY > 14) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  };

  const handleMobileMenu = () => {
    const toggle = $("#menuToggle");
    const mobileMenu = $("#mobileMenu");
    if (!toggle || !mobileMenu) return;

    const closeMenu = () => {
      toggle.classList.remove("is-active");
      toggle.setAttribute("aria-expanded", "false");
      mobileMenu.classList.remove("is-open");
      mobileMenu.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
    };

    const openMenu = () => {
      toggle.classList.add("is-active");
      toggle.setAttribute("aria-expanded", "true");
      mobileMenu.classList.add("is-open");
      mobileMenu.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
    };

    toggle.addEventListener("click", () => {
      const isOpen = mobileMenu.classList.contains("is-open");
      if (isOpen) closeMenu();
      else openMenu();
    });

    $$("a", mobileMenu).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 959) closeMenu();
    });
  };

  const handleRevealAnimations = () => {
    const revealItems = $$(".reveal");
    if (!revealItems.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px"
      }
    );

    revealItems.forEach((item) => observer.observe(item));
  };

  const handleTiltCards = () => {
    const cards = $$(".tilt-card");
    if (!cards.length) return;

    cards.forEach((card) => {
      let rafId = null;

      const reset = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          card.style.transform = "";
        });
      };

      const move = (event) => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateX = ((y / rect.height) - 0.5) * -10;
        const rotateY = ((x / rect.width) - 0.5) * 10;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });
      };

      card.addEventListener("mousemove", move);
      card.addEventListener("mouseleave", reset);
      card.addEventListener("blur", reset);
    });
  };

  const openCartDrawer = () => {
    const drawer = $("#cartDrawer");
    if (!drawer) return;

    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeCartDrawer = () => {
    const drawer = $("#cartDrawer");
    if (!drawer) return;

    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  const handleCartDrawer = () => {
    const drawer = $("#cartDrawer");
    if (!drawer) return;

    const openBtn = $("#cartDrawerToggle");
    const closeBtns = $$("[data-close-cart-drawer]");

    if (openBtn) {
      openBtn.addEventListener("click", openCartDrawer);
    }

    closeBtns.forEach((btn) => {
      btn.addEventListener("click", closeCartDrawer);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeCartDrawer();
      }
    });
  };

  const renderCartDrawer = () => {
    const drawerItemsRoot = $("#cartDrawerItems");
    const drawerSubtotal = $("#cartDrawerSubtotal");
    if (!drawerItemsRoot || !drawerSubtotal) return;

    const { items, subtotal } = getCartTotals();

    if (!items.length) {
      drawerItemsRoot.innerHTML = `
        <div class="cart-drawer__empty">
          <p>Your bag is currently empty.</p>
          <a href="Goods.html" class="btn btn--primary">Shop Goods</a>
        </div>
      `;
      drawerSubtotal.textContent = formatCurrency(0);
      return;
    }

    drawerItemsRoot.innerHTML = items
      .map((item) => {
        const imageClass = item.product.images?.[0] || "product-card__image--one";
        return `
          <article class="cart-drawer__item">
            <div class="cart-drawer__item-image ${imageClass}"></div>
            <div class="cart-drawer__item-content">
              <h3 class="cart-drawer__item-title">${item.product.name}</h3>
              <p class="cart-drawer__item-meta">${item.product.category} • ${formatCurrency(item.product.price)}</p>

              <div class="cart-drawer__item-controls">
                <div class="qty-control">
                  <button type="button" data-qty-action="decrease" data-id="${item.product.id}" aria-label="Decrease quantity">−</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-qty-action="increase" data-id="${item.product.id}" aria-label="Increase quantity">+</button>
                </div>

                <button type="button" class="remove-btn" data-remove-id="${item.product.id}">
                  Remove
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    drawerSubtotal.textContent = formatCurrency(subtotal);
    bindCartActionButtons(drawerItemsRoot);
  };

  const bindCartActionButtons = (scope = document) => {
    $$("[data-qty-action]", scope).forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";

      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const action = button.dataset.qtyAction;
        const cartItem = getCart().find((item) => item.id === id);
        if (!cartItem) return;

        const nextQuantity = action === "increase"
          ? cartItem.quantity + 1
          : cartItem.quantity - 1;

        updateCartItemQuantity(id, nextQuantity);
      });
    });

    $$("[data-remove-id]", scope).forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";

      button.addEventListener("click", () => {
        removeCartItem(button.dataset.removeId);
      });
    });
  };

  const createProductCard = (product) => {
    const images = product.images || ["product-card__image--one", "product-card__image--two", "product-card__image--three"];
    const activeClass = images[0] || "product-card__image--one";

    return `
      <article class="product-card advanced-card tilt-card reveal" data-product-id="${product.id}">
        <div class="product-card__media" data-slider-root="${product.id}">
          <span class="product-card__media-badge">${product.category}</span>
          <div class="product-card__image ${activeClass}" data-slider-stage="${product.id}"></div>
          <div class="product-card__slider-dots" data-slider-dots="${product.id}">
            ${images
              .map(
                (_, index) =>
                  `<span class="${index === 0 ? "is-active" : ""}" data-dot-index="${index}"></span>`
              )
              .join("")}
          </div>
        </div>

        <div class="product-card__body">
          <p class="product-card__category">${product.category}</p>
          <h3>${product.name}</h3>
          <p class="product-card__description">${product.description}</p>

          <div class="product-card__footer">
            <span class="product-card__price">${formatCurrency(product.price)}</span>
          </div>

          <div class="product-card__actions">
            <a class="product-card__view" href="product.html?id=${product.id}">View Details</a>
            <button class="btn btn--primary product-card__add" type="button" data-add-to-cart="${product.id}">
              Add to Bag
            </button>
          </div>
        </div>
      </article>
    `;
  };

  const initProductCardSliders = (scope = document) => {
    $$("[data-slider-root]", scope).forEach((root) => {
      const productId = root.dataset.sliderRoot;
      const product = getProductById(productId);
      const stage = $(`[data-slider-stage="${productId}"]`, root);
      const dotsWrap = $(`[data-slider-dots="${productId}"]`, root);

      if (!product || !stage || !dotsWrap || !product.images?.length) return;

      let currentIndex = 0;
      let interval = null;

      const setSlide = (index) => {
        currentIndex = index % product.images.length;
        stage.className = `product-card__image ${product.images[currentIndex]}`;
        $$("[data-dot-index]", dotsWrap).forEach((dot, dotIndex) => {
          dot.classList.toggle("is-active", dotIndex === currentIndex);
        });
      };

      const start = () => {
        stop();
        interval = setInterval(() => {
          setSlide((currentIndex + 1) % product.images.length);
        }, 2800);
      };

      const stop = () => {
        if (interval) clearInterval(interval);
      };

      $$("[data-dot-index]", dotsWrap).forEach((dot) => {
        dot.addEventListener("click", () => {
          setSlide(Number(dot.dataset.dotIndex));
          start();
        });
      });

      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", start);

      setSlide(0);
      start();
    });
  };

  const bindAddToCartButtons = (scope = document) => {
    $$("[data-add-to-cart]", scope).forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.dataset.bound = "true";

      button.addEventListener("click", () => {
        addToCart(button.dataset.addToCart, 1);
      });
    });
  };

  const renderGoodsPage = () => {
    const grid = $("#productsGrid");
    if (!grid) return;

    const countNode = $("#productCount");
    const emptyState = $("#shopEmptyState");
    const categoryFilter = $("#categoryFilter");
    const sortFilter = $("#sortFilter");
    const searchField = $("#shopSearch");
    const quickFilters = $$("#shopQuickFilters .chip-btn");

    const allProducts = safeGetProducts();

    const applyFilters = () => {
      const category = categoryFilter?.value || "all";
      const sort = sortFilter?.value || "featured";
      const term = (searchField?.value || "").trim().toLowerCase();

      let filtered = [...allProducts];

      if (category !== "all") {
        filtered = filtered.filter((product) => product.category === category);
      }

      if (term) {
        filtered = filtered.filter((product) =>
          [
            product.name,
            product.category,
            product.description
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)
        );
      }

      switch (sort) {
        case "price-low":
          filtered.sort((a, b) => a.price - b.price);
          break;
        case "price-high":
          filtered.sort((a, b) => b.price - a.price);
          break;
        case "name-asc":
          filtered.sort((a, b) => a.name.localeCompare(b.name));
          break;
        default:
          filtered.sort((a, b) => (a.featuredOrder || 999) - (b.featuredOrder || 999));
      }

      grid.innerHTML = filtered.map(createProductCard).join("");
      if (countNode) countNode.textContent = filtered.length;

      if (!filtered.length) {
        emptyState?.removeAttribute("hidden");
      } else {
        emptyState?.setAttribute("hidden", "");
      }

      bindAddToCartButtons(grid);
      initProductCardSliders(grid);
      handleRevealAnimations();
      handleTiltCards();
    };

    categoryFilter?.addEventListener("change", () => {
      quickFilters.forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.filter === categoryFilter.value);
      });
      applyFilters();
    });

    sortFilter?.addEventListener("change", applyFilters);
    searchField?.addEventListener("input", applyFilters);

    quickFilters.forEach((button) => {
      button.addEventListener("click", () => {
        quickFilters.forEach((btn) => btn.classList.remove("is-active"));
        button.classList.add("is-active");
        if (categoryFilter) categoryFilter.value = button.dataset.filter;
        applyFilters();
      });
    });

    $("#resetShopFilters")?.addEventListener("click", () => {
      if (categoryFilter) categoryFilter.value = "all";
      if (sortFilter) sortFilter.value = "featured";
      if (searchField) searchField.value = "";
      quickFilters.forEach((btn) => btn.classList.toggle("is-active", btn.dataset.filter === "all"));
      applyFilters();
    });

    applyFilters();
  };

  const createRelatedCard = (product) => createProductCard(product);

  const renderProductPage = () => {
    const root = $("#productDetailRoot");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");
    const product = getProductById(productId);

    if (!product) {
      root.innerHTML = `
        <div class="shop-empty-state__card">
          <h2>Product not found.</h2>
          <p>The item you requested could not be found. Explore the full collection instead.</p>
          <div style="margin-top:18px;">
            <a href="Goods.html" class="btn btn--primary">Back to Goods</a>
          </div>
        </div>
      `;
      return;
    }

    const breadcrumbCurrent = $("#breadcrumbCurrent");
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = product.name;
    document.title = `${product.name} | Esraa Gallery`;

    const images = product.images || ["product-card__image--one", "product-card__image--two", "product-card__image--three"];

    root.innerHTML = `
      <div class="product-detail">
        <div class="product-gallery reveal">
          <div class="product-gallery__main">
            <div class="product-gallery__stage ${images[0]}" id="productGalleryStage"></div>
          </div>

          <div class="product-gallery__thumbs" id="productGalleryThumbs">
            ${images
              .map(
                (imageClass, index) => `
                  <button
                    type="button"
                    class="thumbnail-btn ${index === 0 ? "is-active" : ""}"
                    data-thumb-image="${imageClass}"
                    aria-label="View product image ${index + 1}"
                  >
                    <div class="thumbnail-btn__img ${imageClass}"></div>
                  </button>
                `
              )
              .join("")}
          </div>
        </div>

        <div class="product-info reveal reveal-delay-1">
          <p class="eyebrow">Handmade Product Detail</p>
          <span class="product-category-badge">${product.category}</span>
          <h1 class="product-title">${product.name}</h1>
          <div class="product-meta-row">
            <span class="product-price">${formatCurrency(product.price)}</span>
            <span class="product-card__category">${product.category}</span>
          </div>

          <p class="product-description">${product.description}</p>

          <div class="product-meta-row">
            <div class="product-qty" id="productQtyControl">
              <button type="button" id="productQtyDecrease" aria-label="Decrease quantity">−</button>
              <span id="productQtyValue">1</span>
              <button type="button" id="productQtyIncrease" aria-label="Increase quantity">+</button>
            </div>
          </div>

          <div class="product-actions">
            <button type="button" class="btn btn--primary" id="productAddToCartButton">
              Add to Bag
            </button>
            <a href="contact-and-policies.html#custom-order-form" class="btn btn--secondary">
              Request a Custom Version
            </a>
          </div>

          <div class="product-support-grid">
            <article class="support-info-card">
              <span class="support-info-card__label">Premium Handmade</span>
              <h3>Crafted with elegant detail and layered visual warmth.</h3>
              <p>Designed to feel refined, giftable, and meaningful in real life.</p>
            </article>

            <article class="support-info-card">
              <span class="support-info-card__label">Multi-Angle Ready</span>
              <h3>Built with a multi-image product structure.</h3>
              <p>This layout supports multiple product views and future product photography upgrades.</p>
            </article>

            <article class="support-info-card">
              <span class="support-info-card__label">Custom Friendly</span>
              <h3>Need names, colors, or event-level personalization?</h3>
              <p>Use the custom order inquiry form to request an adapted version of this product.</p>
            </article>
          </div>
        </div>
      </div>
    `;

    let qty = 1;
    const qtyValue = $("#productQtyValue");
    const setQty = (value) => {
      qty = Math.max(1, value);
      if (qtyValue) qtyValue.textContent = qty;
    };

    $("#productQtyIncrease")?.addEventListener("click", () => setQty(qty + 1));
    $("#productQtyDecrease")?.addEventListener("click", () => setQty(qty - 1));

    $("#productAddToCartButton")?.addEventListener("click", () => {
      addToCart(product.id, qty);
    });

    const stage = $("#productGalleryStage");
    $$("#productGalleryThumbs .thumbnail-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const imageClass = button.dataset.thumbImage;
        if (stage) stage.className = `product-gallery__stage ${imageClass}`;
        $$("#productGalleryThumbs .thumbnail-btn").forEach((btn) => btn.classList.remove("is-active"));
        button.classList.add("is-active");
      });
    });

    const relatedGrid = $("#relatedProductsGrid");
    if (relatedGrid) {
      const related = safeGetProducts()
        .filter((item) => item.id !== product.id)
        .filter((item) => item.category === product.category || item.tags?.some((tag) => product.tags?.includes(tag)))
        .slice(0, 3);

      const fallback = safeGetProducts().filter((item) => item.id !== product.id).slice(0, 3);
      const itemsToRender = related.length ? related : fallback;

      relatedGrid.innerHTML = itemsToRender.map(createRelatedCard).join("");
      bindAddToCartButtons(relatedGrid);
      initProductCardSliders(relatedGrid);
    }
  };

  const renderCartPage = () => {
    const cartRoot = $("#cartPageItems");
    const emptyState = $("#cartEmptyState");
    const checkoutBtn = $("#cartCheckoutButton");
    if (!cartRoot) return;

    const { items, itemCount, subtotal, shipping, tax, total } = getCartTotals();
    const countNode = $("#cartSummaryCount");
    const subtotalNode = $("#cartSummarySubtotal");
    const shippingNode = $("#cartSummaryShipping");
    const taxNode = $("#cartSummaryTax");
    const totalNode = $("#cartSummaryTotal");

    if (countNode) countNode.textContent = itemCount;
    if (subtotalNode) subtotalNode.textContent = formatCurrency(subtotal);
    if (shippingNode) shippingNode.textContent = formatCurrency(shipping);
    if (taxNode) taxNode.textContent = formatCurrency(tax);
    if (totalNode) totalNode.textContent = formatCurrency(total);

    if (!items.length) {
      cartRoot.innerHTML = "";
      emptyState?.removeAttribute("hidden");
      if (checkoutBtn) {
        checkoutBtn.setAttribute("aria-disabled", "true");
        checkoutBtn.style.pointerEvents = "none";
        checkoutBtn.style.opacity = "0.5";
      }
      return;
    }

    emptyState?.setAttribute("hidden", "");
    if (checkoutBtn) {
      checkoutBtn.removeAttribute("aria-disabled");
      checkoutBtn.style.pointerEvents = "";
      checkoutBtn.style.opacity = "";
    }

    cartRoot.innerHTML = items
      .map((item) => {
        const imageClass = item.product.images?.[0] || "product-card__image--one";
        return `
          <article class="cart-item">
            <div class="cart-item__image ${imageClass}"></div>
            <div class="cart-item__content">
              <h3 class="cart-item__title">${item.product.name}</h3>
              <p class="cart-item__meta">${item.product.category} • ${formatCurrency(item.product.price)}</p>
              <p class="cart-item__meta">Line total: ${formatCurrency(item.lineTotal)}</p>

              <div class="cart-item__controls">
                <div class="qty-control">
                  <button type="button" data-qty-action="decrease" data-id="${item.product.id}" aria-label="Decrease quantity">−</button>
                  <span>${item.quantity}</span>
                  <button type="button" data-qty-action="increase" data-id="${item.product.id}" aria-label="Increase quantity">+</button>
                </div>

                <button type="button" class="remove-btn" data-remove-id="${item.product.id}">
                  Remove item
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    bindCartActionButtons(cartRoot);
  };

  const renderCheckoutSummary = () => {
    const root = $("#checkoutSummaryItems");
    if (!root) return;

    const { items, itemCount, subtotal, shipping, tax, total } = getCartTotals();

    const countNode = $("#checkoutSummaryCount");
    const subtotalNode = $("#checkoutSummarySubtotal");
    const shippingNode = $("#checkoutSummaryShipping");
    const taxNode = $("#checkoutSummaryTax");
    const totalNode = $("#checkoutSummaryTotal");
    const button = $("#placeOrderButton");

    if (countNode) countNode.textContent = itemCount;
    if (subtotalNode) subtotalNode.textContent = formatCurrency(subtotal);
    if (shippingNode) shippingNode.textContent = formatCurrency(shipping);
    if (taxNode) taxNode.textContent = formatCurrency(tax);
    if (totalNode) totalNode.textContent = formatCurrency(total);

    if (!items.length) {
      root.innerHTML = `
        <div class="cart-empty-state" style="padding:20px;">
          <h3>Your bag is empty.</h3>
          <p>Add products before checking out.</p>
        </div>
      `;
      if (button) {
        button.disabled = true;
        button.style.opacity = "0.5";
      }
      return;
    }

    if (button) {
      button.disabled = false;
      button.style.opacity = "";
    }

    root.innerHTML = items
      .map((item) => {
        const imageClass = item.product.images?.[0] || "product-card__image--one";
        return `
          <article class="cart-item">
            <div class="cart-item__image ${imageClass}"></div>
            <div class="cart-item__content">
              <h3 class="cart-item__title">${item.product.name}</h3>
              <p class="cart-item__meta">Qty ${item.quantity} • ${formatCurrency(item.product.price)}</p>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const bindCheckoutPreview = () => {
    const cardName = $("#cardName");
    const cardNumber = $("#cardNumber");
    const cardExpiry = $("#cardExpiry");

    const previewName = $("#cardPreviewName");
    const previewNumber = $("#cardPreviewNumber");
    const previewExpiry = $("#cardPreviewExpiry");

    if (!cardName || !cardNumber || !cardExpiry || !previewName || !previewNumber || !previewExpiry) return;

    cardName.addEventListener("input", () => {
      previewName.textContent = cardName.value.trim() || "Your Name";
    });

    cardNumber.addEventListener("input", () => {
      let value = cardNumber.value.replace(/\D/g, "").slice(0, 16);
      value = value.replace(/(.{4})/g, "$1 ").trim();
      cardNumber.value = value;
      previewNumber.textContent = value || "•••• •••• •••• 4242";
    });

    cardExpiry.addEventListener("input", () => {
      let value = cardExpiry.value.replace(/\D/g, "").slice(0, 4);
      if (value.length > 2) value = `${value.slice(0, 2)}/${value.slice(2)}`;
      cardExpiry.value = value;
      previewExpiry.textContent = value || "MM/YY";
    });

    const cardCvc = $("#cardCvc");
    if (cardCvc) {
      cardCvc.addEventListener("input", () => {
        cardCvc.value = cardCvc.value.replace(/\D/g, "").slice(0, 4);
      });
    }
  };

  const validateForm = (form) => {
    const requiredFields = $$("[required]", form);
    let valid = true;

    requiredFields.forEach((field) => {
      const isCheckbox = field.type === "checkbox";
      const valueValid = isCheckbox ? field.checked : String(field.value || "").trim() !== "";

      if (!valueValid) {
        valid = false;
        field.style.borderColor = "rgba(155, 77, 77, 0.5)";
      } else {
        field.style.borderColor = "";
      }
    });

    return valid;
  };

  const handleCheckoutForm = () => {
    const form = $("#checkoutForm");
    if (!form) return;

    bindCheckoutPreview();
    renderCheckoutSummary();

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const { items, subtotal, shipping, tax, total } = getCartTotals();
      if (!items.length) return;

      if (!validateForm(form)) return;

      const orderPayload = {
        orderNumber: `EG-${Date.now().toString().slice(-6)}`,
        customerEmail: $("#email")?.value?.trim() || "",
        subtotal,
        shipping,
        tax,
        total,
        items: items.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        })),
        createdAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(orderPayload));
      localStorage.setItem(
        STORAGE_KEYS.checkout,
        JSON.stringify({
          firstName: $("#firstName")?.value?.trim() || "",
          lastName: $("#lastName")?.value?.trim() || "",
          email: $("#email")?.value?.trim() || ""
        })
      );

      clearCart();
      window.location.href = "order-success.html";
    });
  };

  const handleContactForm = () => {
    const form = $("#customOrderForm");
    const successBox = $("#customFormSuccess");
    if (!form || !successBox) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!validateForm(form)) return;

      successBox.hidden = false;
      form.reset();
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const renderSuccessPage = () => {
    const orderNumberNode = $("#successOrderNumber");
    const orderEmailNode = $("#successCustomerEmail");
    const orderTotalNode = $("#successOrderTotal");

    if (!orderNumberNode || !orderEmailNode || !orderTotalNode) return;

    let order = null;
    try {
      order = JSON.parse(localStorage.getItem(STORAGE_KEYS.order));
    } catch (error) {
      order = null;
    }

    if (!order) {
      orderNumberNode.textContent = "EG-000000";
      orderEmailNode.textContent = "No recent order found";
      orderTotalNode.textContent = formatCurrency(0);
    } else {
      orderNumberNode.textContent = order.orderNumber || "EG-000000";
      orderEmailNode.textContent = order.customerEmail || "customer@example.com";
      orderTotalNode.textContent = formatCurrency(order.total || 0);
    }

    const relatedGrid = $("#successRelatedProducts");
    if (relatedGrid) {
      const products = safeGetProducts().slice(0, 3);
      relatedGrid.innerHTML = products.map(createRelatedCard).join("");
      bindAddToCartButtons(relatedGrid);
      initProductCardSliders(relatedGrid);
    }
  };

  const renderHomePreviewActions = () => {
    const featuredSection = $("#homeFeaturedProducts");
    if (!featuredSection) return;
    bindAddToCartButtons(document);
  };

  const init = () => {
    setCurrentYear();
    handleHeaderScroll();
    handleMobileMenu();
    handleRevealAnimations();
    handleTiltCards();
    handleCartDrawer();
    updateCartCount();
    renderCartDrawer();

    renderHomePreviewActions();
    renderGoodsPage();
    renderProductPage();
    renderCartPage();
    renderCheckoutSummary();
    handleCheckoutForm();
    handleContactForm();
    renderSuccessPage();

    bindAddToCartButtons(document);
    initProductCardSliders(document);
  };

  document.addEventListener("DOMContentLoaded", init);

  window.EsraaGalleryStore = {
    getCart,
    saveCart,
    addToCart,
    removeCartItem,
    updateCartItemQuantity,
    clearCart,
    getCartTotals,
    getProductById,
    formatCurrency,
    openCartDrawer,
    closeCartDrawer
  };
})();