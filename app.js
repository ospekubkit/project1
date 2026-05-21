// ==========================================================================
// JAVASCRIPT INTERACTIVE LOGIC - UB OSPEK PRE-ORDER WEBSITE (UPDATED)
// State Management, Local Dynamic Configs, LocalStorage Order Database,
// Fixed Cart Crash, Manual QRIS Checkout, and WhatsApp Admin Integration.
// ==========================================================================

// Global App State
let cart = [];
let packageGender = 'pria'; // 'pria' or 'wanita'
let qrisTimerInterval = null;

// ==========================================================================
// A. DYNAMIC PRODUCTS & BATCH LOCAL STORAGE CONFIGURATION
// ==========================================================================

// 1. Products Config (Prices)
let productsConfig = {
    kitActualPrice: 99000,
    kitOriginalPrice: 125000,
    clothingActualPrice: 189000,
    clothingOriginalPrice: 245000,
    singleItems: {
        'cat-buku': 15000,
        'cat-pulpen': 5000,
        'cat-lanyard': 18000,
        'cat-totebag': 25000,
        'cat-topi': 20000,
        'cat-tumbler': 35000,
        'cat-pin': 7000,
        'single-shirt': 55000,
        'single-tie': 12000,
        'single-pants': 75000,
        'single-skirt': 65000,
        'single-socks': 8000,
        'single-pantofel-pria': 95000,
        'single-pantofel-wanita': 85000
    }
};

// 2. Batch Config (Countdown & Stok Bar)
let batchConfig = {
    batchName: "Batch 1: Kuota Terbatas!",
    slotsFilled: 255,
    totalSlots: 300,
    deadlineDate: "" // Empty triggers dynamic generation below
};

// Initialize Configs from localStorage
function initLocalConfigs() {
    // Product Config
    if (localStorage.getItem('ub_products_config')) {
        productsConfig = JSON.parse(localStorage.getItem('ub_products_config'));
    } else {
        localStorage.setItem('ub_products_config', JSON.stringify(productsConfig));
    }

    // Batch Config
    if (localStorage.getItem('ub_batch_config')) {
        batchConfig = JSON.parse(localStorage.getItem('ub_batch_config'));
    } else {
        // Generate default deadline date (exactly 2 days, 14 hours, 45 minutes in the future)
        const defDate = new Date();
        defDate.setDate(defDate.getDate() + 2);
        defDate.setHours(defDate.getHours() + 14);
        defDate.setMinutes(defDate.getMinutes() + 45);
        batchConfig.deadlineDate = defDate.toISOString();
        localStorage.setItem('ub_batch_config', JSON.stringify(batchConfig));
    }
}

// Apply Prices to main website elements dynamically
async function applyProductsConfigToDOM() {
    // Paket A Prices
    const packKitActual = document.querySelector('#pack-kit-card .actual-price');
    if (packKitActual) packKitActual.textContent = formatRupiah(productsConfig.kitActualPrice);
    
    const packKitOrig = document.querySelector('#pack-kit-card .original-price');
    if (packKitOrig) packKitOrig.textContent = formatRupiah(productsConfig.kitOriginalPrice);
    
    // Paket B Prices
    const packClothActual = document.getElementById('pack-clothing-price');
    if (packClothActual) packClothActual.textContent = formatRupiah(productsConfig.clothingActualPrice);
    
    const packClothOrig = document.querySelector('#pack-clothing-card .original-price');
    if (packClothOrig) packClothOrig.textContent = formatRupiah(productsConfig.clothingOriginalPrice);
    
    // Single Items - Fetch from Supabase dynamically
    try {
        const merchGrid = document.getElementById('category-merch-grid');
        const clothingGrid = document.getElementById('category-clothing-grid');
        if (!merchGrid || !clothingGrid) return;
        
        const { data, error } = await db.from('products').select('*').order('name');
        if (error) throw error;
        
        merchGrid.innerHTML = '';
        clothingGrid.innerHTML = '';
        
        if (!data || data.length === 0) {
            merchGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Katalog kosong.</div>';
            clothingGrid.innerHTML = '<div style="color:var(--text-muted); padding:20px;">Katalog kosong.</div>';
            return;
        }

        data.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.setAttribute('data-id', prod.id);
            
            // Check if clothing needs size selector
            let hasSize = ['single-shirt', 'single-pants', 'single-skirt', 'single-pantofel-pria', 'single-pantofel-wanita'].includes(prod.id);
            
            let sizeOptions = '';
            if (hasSize) {
                if (prod.id.includes('pantofel')) {
                    if (prod.id.includes('wanita')) {
                        sizeOptions = `<option value="36">36</option><option value="37" selected>37</option><option value="38">38</option><option value="39">39</option><option value="40">40</option>`;
                    } else {
                        sizeOptions = `<option value="38">38</option><option value="39">39</option><option value="40" selected>40</option><option value="41">41</option><option value="42">42</option><option value="43">43</option><option value="44">44</option><option value="45">45</option>`;
                    }
                } else {
                    sizeOptions = `<option value="S">S</option><option value="M" selected>M</option><option value="L">L</option><option value="XL">XL</option><option value="XXL">XXL (+Rp 5rb)</option>`;
                }
            }
            
            let rightSide = '';
            if (hasSize) {
                rightSide = `
                    <select class="item-size-select" id="size-${prod.id}">
                        ${sizeOptions}
                    </select>
                    <button class="add-single-item-btn" onclick="addSingleClothingToCart('${prod.id}', '${prod.name.replace(/'/g, "\\'")}', ${prod.price}, 'size-${prod.id}')">Tambah</button>
                `;
            } else {
                rightSide = `
                    <button class="add-single-item-btn" onclick="addSingleToCart('${prod.id}', '${prod.name.replace(/'/g, "\\'")}', ${prod.price}, '-')">Tambah</button>
                `;
            }

            card.innerHTML = `
                <div class="item-card-left">
                    <div class="item-icon-box"><i class="fa-solid ${prod.icon}"></i></div>
                    <div class="item-info">
                        <h4>${prod.name}</h4>
                        <span class="item-price">${formatRupiah(prod.price)}</span>
                    </div>
                </div>
                <div class="item-card-right">
                    ${rightSide}
                </div>
            `;
            
            if (prod.category === 'merch') {
                merchGrid.appendChild(card);
            } else {
                clothingGrid.appendChild(card);
            }
        });
    } catch (err) {
        console.error('Failed fetching products:', err);
    }
}

// Apply Batch Info (Slots and Names) to DOM
function applyBatchConfigToDOM() {
    const batchNameEl = document.querySelector('.urgency-card h3');
    if (batchNameEl) {
        batchNameEl.innerHTML = `<i class="fa-solid fa-fire" style="color: #e74c3c;"></i> ${batchConfig.batchName}`;
    }

    const filledEl = document.getElementById('slots-filled');
    const leftEl = document.getElementById('slots-left');
    const bar = document.getElementById('progress-bar');

    if (filledEl && leftEl && bar) {
        filledEl.textContent = batchConfig.slotsFilled;
        leftEl.textContent = batchConfig.totalSlots - batchConfig.slotsFilled;
        bar.style.width = ((batchConfig.slotsFilled / batchConfig.totalSlots) * 100) + '%';
    }
}

// Initialize on Document Ready
document.addEventListener('DOMContentLoaded', () => {
    initLocalConfigs();
    applyProductsConfigToDOM();
    applyBatchConfigToDOM();
    initCountdown();
    initUrgencyProgress();
    updateCartUI();
    
    // Smooth scrolling for hero CTA link
    const btnLearn = document.getElementById('btn-learn-more');
    if (btnLearn) {
        btnLearn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('items');
            document.getElementById('produk').scrollIntoView({ behavior: 'smooth' });
        });
    }
});

// ==========================================================================
// 1. COUNTDOWN TIMER & PROGRESS BAR
// ==========================================================================

function initCountdown() {
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    
    const targetDate = new Date(batchConfig.deadlineDate);

    function updateClock() {
        const now = new Date().getTime();
        const difference = targetDate.getTime() - now;

        if (difference <= 0 || isNaN(difference)) {
            if (daysEl) daysEl.textContent = '00';
            if (hoursEl) hoursEl.textContent = '00';
            if (minutesEl) minutesEl.textContent = '00';
            if (secondsEl) secondsEl.textContent = '00';
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function initUrgencyProgress() {
    const bar = document.getElementById('progress-bar');
    const filledEl = document.getElementById('slots-filled');
    const leftEl = document.getElementById('slots-left');
    
    // Simulate someone buying every 75 seconds, increasing slot filled slightly
    setInterval(() => {
        if (batchConfig.slotsFilled < batchConfig.totalSlots - 5) {
            batchConfig.slotsFilled += Math.floor(Math.random() * 2) + 1;
            
            // Save updated value back to localStorage
            localStorage.setItem('ub_batch_config', JSON.stringify(batchConfig));
            
            if (filledEl) filledEl.textContent = batchConfig.slotsFilled;
            if (leftEl) leftEl.textContent = batchConfig.totalSlots - batchConfig.slotsFilled;
            if (bar) bar.style.width = ((batchConfig.slotsFilled / batchConfig.totalSlots) * 100) + '%';
        }
    }, 75000);
}

// ==========================================================================
// 2. TAB SWITCHING
// ==========================================================================

function switchTab(tabType) {
    const packagesBtn = document.getElementById('tab-packages-btn');
    const itemsBtn = document.getElementById('tab-items-btn');
    const packagesContent = document.getElementById('tab-packages-content');
    const itemsContent = document.getElementById('tab-items-content');

    if (tabType === 'packages') {
        if (packagesBtn) packagesBtn.classList.add('active');
        if (itemsBtn) itemsBtn.classList.remove('active');
        if (packagesContent) packagesContent.style.display = 'grid';
        if (itemsContent) itemsContent.style.display = 'none';
    } else {
        if (packagesBtn) packagesBtn.classList.remove('active');
        if (itemsBtn) itemsBtn.classList.add('active');
        if (packagesContent) packagesContent.style.display = 'none';
        if (itemsContent) itemsContent.style.display = 'block';
        
        window.dispatchEvent(new Event('resize'));
    }
}

// ==========================================================================
// 3. SET CLOTHING GENDER CONFIGURATION
// ==========================================================================

function setPackageGender(gender) {
    packageGender = gender;
    const btnPria = document.getElementById('gender-pria-btn');
    const btnWanita = document.getElementById('gender-wanita-btn');
    
    const bottomsLabel = document.getElementById('label-bottoms-size');
    const bottomsSelect = document.getElementById('pack-bottoms-size');
    const shoesSelect = document.getElementById('pack-shoes-size');
    
    const includeBottoms = document.getElementById('include-bottoms');
    const includeShoes = document.getElementById('include-shoes');

    if (gender === 'pria') {
        if (btnPria) btnPria.classList.add('active');
        if (btnWanita) btnWanita.classList.remove('active');
        
        if (bottomsLabel) bottomsLabel.textContent = 'Celana Hitam';
        if (includeBottoms) includeBottoms.innerHTML = `<i class="fa-solid fa-circle-check"></i> Celana Panjang Hitam Bahan Kerja`;
        if (includeShoes) includeShoes.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sepatu Pantofel Pria (Kulit Sintetis Premium)`;
        
        if (bottomsSelect) {
            bottomsSelect.options[0].text = 'Ukuran S';
            bottomsSelect.options[1].text = 'Ukuran M';
            bottomsSelect.options[2].text = 'Ukuran L';
            bottomsSelect.options[3].text = 'Ukuran XL';
            bottomsSelect.options[4].text = 'Ukuran XXL (+Rp 5.000)';
        }
        
        if (shoesSelect) shoesSelect.value = '40';
    } else {
        if (btnPria) btnPria.classList.remove('active');
        if (btnWanita) btnWanita.classList.add('active');
        
        if (bottomsLabel) bottomsLabel.textContent = 'Rok Panjang Hitam';
        if (includeBottoms) includeBottoms.innerHTML = `<i class="fa-solid fa-circle-check"></i> Rok Panjang Span/A-Line Hitam`;
        if (includeShoes) includeShoes.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sepatu Pantofel Wanita Hak 3cm`;
        
        if (bottomsSelect) {
            bottomsSelect.options[0].text = 'Ukuran S';
            bottomsSelect.options[1].text = 'Ukuran M';
            bottomsSelect.options[2].text = 'Ukuran L';
            bottomsSelect.options[3].text = 'Ukuran XL';
            bottomsSelect.options[4].text = 'Ukuran XXL (+Rp 5.000)';
        }
        
        if (shoesSelect) shoesSelect.value = '37';
    }
}

// ==========================================================================
// 4. CART & STATE OPERATIONS (BUG FIXED)
// ==========================================================================

// Add Package A or B
function addPackageToCart(packType) {
    if (packType === 'kit') {
        const id = 'package-kit';
        const name = 'Paket A: UB Ospek 1 Kit Atribut';
        const price = productsConfig.kitActualPrice;
        const size = 'Standard';
        
        addToCart(id, name, price, size, 'package');
        showToast('Sukses memasukkan Paket A ke keranjang!');
    } 
    else if (packType === 'clothing') {
        const id = `package-clothing-${packageGender}`;
        const genderLabel = packageGender === 'pria' ? 'Pria' : 'Wanita';
        const name = `Paket B: 1 Set Pakaian Formal (${genderLabel})`;
        
        const shirtSize = document.getElementById('pack-shirt-size').value;
        const bottomsSize = document.getElementById('pack-bottoms-size').value;
        const shoesSize = document.getElementById('pack-shoes-size').value;
        
        // Extra cost for XXL sizes
        let extraCost = 0;
        if (shirtSize === 'XXL') extraCost += 5000;
        if (bottomsSize === 'XXL') extraCost += 5000;
        
        const price = productsConfig.clothingActualPrice + extraCost;
        const size = `Kemeja: ${shirtSize}, Rok/Celana: ${bottomsSize}, Sepatu: ${shoesSize}`;
        
        addToCart(id, name, price, size, 'package');
        showToast('Sukses memasukkan Paket B ke keranjang!');
    }
}

// Add Single Merchandise Items (No Sizes)
function addSingleToCart(id, name, fallbackPrice, size) {
    const finalPrice = productsConfig.singleItems[id] !== undefined ? productsConfig.singleItems[id] : fallbackPrice;
    addToCart(id, name, finalPrice, size, 'single');
    showToast(`Sukses menambah ${name} ke keranjang!`);
}

// Add Single Clothing Items (Includes Sizes)
function addSingleClothingToCart(id, name, fallbackPrice, sizeSelectId) {
    const sizeSelect = document.getElementById(sizeSelectId);
    const sizeVal = sizeSelect.value;
    
    let extraCost = 0;
    if (sizeVal === 'XXL') extraCost = 5000;
    
    const basePrice = productsConfig.singleItems[id] !== undefined ? productsConfig.singleItems[id] : fallbackPrice;
    const finalPrice = basePrice + extraCost;
    const finalId = `${id}-${sizeVal}`;
    const finalName = `${name} (${sizeVal})`;
    
    addToCart(finalId, finalName, finalPrice, sizeVal, 'single');
    showToast(`Sukses menambah ${name} ukuran ${sizeVal} ke keranjang!`);
}

// Internal Add to Cart logic
function addToCart(id, name, price, size, type) {
    // Check if item already in cart with same size
    const existingIndex = cart.findIndex(item => item.id === id && item.size === size);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            id,
            name,
            price,
            size,
            type,
            quantity: 1
        });
    }
    
    updateCartUI();
    animateCartCount();
}

// Remove Item from Cart
function removeCartItem(id, size) {
    cart = cart.filter(item => !(item.id === id && item.size === size));
    updateCartUI();
}

// Change Quantity
function changeQuantity(id, size, change) {
    const itemIndex = cart.findIndex(item => item.id === id && item.size === size);
    if (itemIndex > -1) {
        cart[itemIndex].quantity += change;
        if (cart[itemIndex].quantity <= 0) {
            cart = cart.filter(item => !(item.id === id && item.size === size));
        }
        updateCartUI();
    }
}

// Animate Cart Count Bubble
function animateCartCount() {
    const bubble = document.getElementById('global-cart-count');
    if (bubble) {
        bubble.style.transform = 'scale(1.4)';
        setTimeout(() => {
            bubble.style.transform = 'scale(1)';
        }, 200);
    }
}

// Update UI (BUG RESOLVED: Prevent emptyState deletion by utilizing #cart-items-container)
function updateCartUI() {
    const cartCountEl = document.getElementById('global-cart-count');
    const itemsContainer = document.getElementById('cart-items-container');
    const emptyState = document.getElementById('cart-empty-state');
    
    // Totals Elements
    const subtotalEl = document.getElementById('cart-subtotal');
    const discountEl = document.getElementById('cart-discount');
    const grandTotalEl = document.getElementById('cart-grand-total');
    
    const customSubtotal = document.getElementById('custom-subtotal');
    const customDiscount = document.getElementById('custom-discount');
    const customGrandTotal = document.getElementById('custom-grand-total');
    const customSummaryList = document.getElementById('custom-summary-list');
    const summaryEmptyText = document.getElementById('summary-empty-text');
    
    const finalSubtotal = document.getElementById('final-subtotal');
    const finalDiscount = document.getElementById('final-discount');
    const finalGrandTotal = document.getElementById('final-grand-total');
    const checkoutSummaryList = document.getElementById('checkout-summary-list');

    let totalItems = 0;
    let subtotalAmount = 0;
    let discountAmount = 0;
    
    // Calculate total quantities
    cart.forEach(item => {
        totalItems += item.quantity;
        subtotalAmount += (item.price * item.quantity);
        
        // Calculate dynamic package discount showing to Maba
        if (item.id === 'package-kit') {
            discountAmount += ((productsConfig.kitOriginalPrice - productsConfig.kitActualPrice) * item.quantity);
        } else if (item.id.includes('package-clothing')) {
            discountAmount += ((productsConfig.clothingOriginalPrice - productsConfig.clothingActualPrice) * item.quantity);
        }
    });

    const grandTotalAmount = subtotalAmount; // Cart list price is already discounted
    
    // Display global count bubble
    if (cartCountEl) cartCountEl.textContent = totalItems;

    // A. RENDER DRAWER CART USING SUB-CONTAINER (DO NOT DESTROY emptyState reference!)
    if (itemsContainer && emptyState) {
        if (cart.length === 0) {
            emptyState.style.display = 'block';
            itemsContainer.innerHTML = '';
        } else {
            emptyState.style.display = 'none';
            itemsContainer.innerHTML = '';
            
            cart.forEach(item => {
                const itemRow = document.createElement('div');
                itemRow.className = 'cart-item';
                itemRow.innerHTML = `
                    <div class="cart-item-img">
                        <i class="${item.type === 'package' ? 'fa-solid fa-boxes-packing' : 'fa-solid fa-circle-notch'}"></i>
                    </div>
                    <div class="cart-item-details">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-meta">Size/Info: ${item.size}</div>
                        <div class="cart-item-price">${formatRupiah(item.price)}</div>
                    </div>
                    <div class="cart-item-actions">
                        <button class="remove-cart-item" onclick="removeCartItem('${item.id}', '${item.size}')">
                            <i class="fa-solid fa-trash-can"></i> Hapus
                        </button>
                        <div class="quantity-control">
                            <button class="qty-btn" onclick="changeQuantity('${item.id}', '${item.size}', -1)">-</button>
                            <span class="qty-number">${item.quantity}</span>
                            <button class="qty-btn" onclick="changeQuantity('${item.id}', '${item.size}', 1)">+</button>
                        </div>
                    </div>
                `;
                itemsContainer.appendChild(itemRow);
            });
        }
    }

    // B. RENDER SIDEBAR CUSTOMIZER SUMMARY WIDGET
    if (customSummaryList && summaryEmptyText) {
        if (cart.length === 0) {
            summaryEmptyText.style.display = 'block';
            customSummaryList.innerHTML = '';
            customSummaryList.appendChild(summaryEmptyText);
        } else {
            summaryEmptyText.style.display = 'none';
            customSummaryList.innerHTML = '';
            
            cart.forEach(item => {
                const row = document.createElement('div');
                row.className = 'summary-item-row';
                row.innerHTML = `
                    <div class="summary-item-details">
                        <span class="summary-item-name">${item.name} x${item.quantity}</span>
                        <span class="summary-item-meta">${item.size}</span>
                    </div>
                    <span class="summary-item-price">${formatRupiah(item.price * item.quantity)}</span>
                `;
                customSummaryList.appendChild(row);
            });
        }
    }

    // C. RENDER STICKY CHECKOUT SUMMARY WIDGET
    if (checkoutSummaryList) {
        checkoutSummaryList.innerHTML = '';
        if (cart.length === 0) {
            checkoutSummaryList.innerHTML = `
                <div class="empty-summary-text" style="padding: 10px 0;">
                    Keranjang pesanan kosong
                </div>
            `;
        } else {
            cart.forEach(item => {
                const row = document.createElement('div');
                row.className = 'summary-item-row';
                row.innerHTML = `
                    <div class="summary-item-details">
                        <span class="summary-item-name">${item.name} x${item.quantity}</span>
                        <span class="summary-item-meta">${item.size}</span>
                    </div>
                    <span class="summary-item-price">${formatRupiah(item.price * item.quantity)}</span>
                `;
                checkoutSummaryList.appendChild(row);
            });
        }
    }

    // Update monetary values across elements
    const virtualSubtotal = grandTotalAmount + discountAmount;
    
    // Cart Drawer Values
    if (subtotalEl) subtotalEl.textContent = formatRupiah(virtualSubtotal);
    if (discountEl) discountEl.textContent = `- ${formatRupiah(discountAmount)}`;
    if (grandTotalEl) grandTotalEl.textContent = formatRupiah(grandTotalAmount);
    
    // Custom Tab Widget Values
    if (customSubtotal) customSubtotal.textContent = formatRupiah(virtualSubtotal);
    if (customDiscount) customDiscount.textContent = `- ${formatRupiah(discountAmount)}`;
    if (customGrandTotal) customGrandTotal.textContent = formatRupiah(grandTotalAmount);
    
    // Final Checkout Widget Values
    if (finalSubtotal) finalSubtotal.textContent = formatRupiah(virtualSubtotal);
    if (finalDiscount) finalDiscount.textContent = `- ${formatRupiah(discountAmount)}`;
    if (finalGrandTotal) finalGrandTotal.textContent = formatRupiah(grandTotalAmount);
}

// Slide-out Drawer Actions
const cartTrigger = document.getElementById('cart-trigger');
if (cartTrigger) {
    cartTrigger.addEventListener('click', () => {
        document.getElementById('cart-drawer').classList.add('active');
        document.getElementById('cart-overlay').classList.add('active');
    });
}

function closeCartDrawer() {
    document.getElementById('cart-drawer').classList.remove('active');
    document.getElementById('cart-overlay').classList.remove('active');
}

// Helper Format Currency
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(number);
}

// Simple Toast Alert Notification
function showToast(message) {
    let toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.backgroundColor = 'var(--primary)';
    toast.style.color = 'var(--text-light)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.zIndex = '999';
    toast.style.fontSize = '0.9rem';
    toast.style.fontFamily = 'Poppins, sans-serif';
    toast.style.border = '1px solid var(--accent)';
    toast.style.animation = 'fadeIn 0.3s ease-out';
    toast.innerHTML = `<i class="fa-solid fa-bell" style="color: var(--accent); margin-right: 10px;"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==========================================================================
// 5. MANUAL QRIS CONVERTER & WEBHOOK DISABLED
// ==========================================================================

function triggerCheckout(event) {
    event.preventDefault();
    
    // Check if cart is empty
    if (cart.length === 0) {
        alert('Keranjang pesanan kamu masih kosong! Silakan tambahkan paket atau item satuan terlebih dahulu.');
        return;
    }
    
    // Konfirmasi Email
    const emailVal = document.getElementById('email-address').value;
    if (!confirm(`Apakah alamat email ini sudah benar?\n\n${emailVal}\n\nInvoice pesanan dan tanda bukti lunas akan dikirimkan secara otomatis ke email ini. Jika salah ketik, mohon perbaiki terlebih dahulu.`)) {
        return;
    }

    validateReferralAndProceed();
}

async function validateReferralAndProceed() {
    const refInput = document.getElementById('referral-code');
    const refStatus = document.getElementById('referral-status');
    const refCode = refInput ? refInput.value.trim().toUpperCase() : '';
    
    if (refCode) {
        if (refStatus) {
            refStatus.textContent = 'Memvalidasi kode...';
            refStatus.style.color = 'var(--text-muted)';
        }
        
        try {
            const { data, error } = await db.from('affiliates').select('code').eq('code', refCode).single();
            if (error || !data) {
                if (refStatus) {
                    refStatus.textContent = 'Kode referral tidak valid atau tidak tersedia.';
                    refStatus.style.color = '#e74c3c';
                }
                alert('Checkout ditolak: Kode referral yang Anda masukkan salah atau tidak terdaftar di sistem kami.');
                return; // Stop checkout
            }
            if (refStatus) {
                refStatus.textContent = 'Kode referral valid!';
                refStatus.style.color = '#2ecc71';
            }
        } catch (err) {
            alert('Terjadi kesalahan jaringan saat memvalidasi kode. Silakan coba lagi.');
            return;
        }
    }
    
    openQrisModal();
}

function openQrisModal() {
    const overlay = document.getElementById('qris-modal-overlay');
    const modalScan = document.getElementById('modal-qris-scan');
    const modalSuccess = document.getElementById('modal-qris-success');
    
    overlay.classList.add('active');
    modalScan.style.display = 'block';
    modalSuccess.style.display = 'none';
    
    // Get final grand total
    let total = 0;
    cart.forEach(item => {
        total += (item.price * item.quantity);
    });
    
    document.getElementById('qris-amount-display').textContent = formatRupiah(total);
    
    // Start countdown timer for QRIS modal (15 minutes)
    startQrisTimer(15 * 60);
    
    // NO MORE AUTOMATIC SUCCESS TIMEOUT!
    // Status is purely manual QRIS flow as requested by USER.
}

function closeQrisModal() {
    document.getElementById('qris-modal-overlay').classList.remove('active');
    clearInterval(qrisTimerInterval);
}

function startQrisTimer(durationSeconds) {
    const timerDisplay = document.getElementById('qris-timer');
    let timer = durationSeconds;
    
    clearInterval(qrisTimerInterval);
    
    qrisTimerInterval = setInterval(() => {
        let minutes = Math.floor(timer / 60);
        let seconds = timer % 60;
        
        minutes = minutes.toString().padStart(2, '0');
        seconds = seconds.toString().padStart(2, '0');
        
        if (timerDisplay) timerDisplay.textContent = `${minutes}:${seconds}`;
        
        if (--timer < 0) {
            clearInterval(qrisTimerInterval);
            if (timerDisplay) timerDisplay.textContent = 'EXPIRED';
            alert('Waktu pembayaran QRIS telah habis. Silakan checkout ulang.');
            closeQrisModal();
        }
    }, 1000);
}

// User manually clicks "Saya Sudah Transfer" to prompt Invoice Generation & Pending WA State
async function simulatePaymentSuccess() {
    clearInterval(qrisTimerInterval);
    
    // Tampilkan state loading
    const btnSubmit = document.querySelector('button[onclick="simulatePaymentSuccess()"]');
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan pesanan...';
    btnSubmit.disabled = true;
    
    // Generate simulated unique order ID
    const randomOrderId = 'UB-' + Math.floor(100000 + Math.random() * 900000);
    
    // Populate Data
    const nameVal = document.getElementById('full-name').value;
    const nimVal = document.getElementById('nim-number').value;
    const facultyVal = document.getElementById('student-faculty').value;
    const waVal = document.getElementById('whatsapp-number').value;
    const emailVal = document.getElementById('email-address').value;
    const departmentVal = document.getElementById('student-department').value;
    
    let total = 0;
    cart.forEach(item => total += (item.price * item.quantity));

    // Deteksi Affiliate Code dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('ref') || null;

    // PERSIST ORDER TO SUPABASE
    try {
        const { error } = await db.from('orders').insert([{
            id: randomOrderId,
            name: nameVal,
            nim: nimVal,
            whatsapp: waVal,
            email: emailVal,
            faculty: facultyVal,
            department: departmentVal,
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                size: item.size,
                price: item.price
            })),
            total: total,
            status: 'Menunggu Verifikasi WA',
            affiliate_code: affiliateCode
        }]);

        if (error) throw error;
        
        // Catat klik/konversi sukses di tabel affiliate jika ada
        if (affiliateCode) {
            // (Note: Supabase client-side update rls bisa direstrict, 
            // idealnya menggunakan Vercel function, 
            // tapi ini untuk contoh awal yg diizinkan update public)
            // Di sini kita tidak melakukan count increment agar aman sementara,
            // nanti dihitung otomatis via dashboard admin.
        }

    } catch (err) {
        alert('Gagal menyimpan pesanan ke server: ' + err.message);
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
        return; // Stop eksekusi
    }
    
    // Switch modal screens
    document.getElementById('modal-qris-scan').style.display = 'none';
    const modalSuccess = document.getElementById('modal-qris-success');
    if (modalSuccess) {
        modalSuccess.style.display = 'block';
        const successScreen = modalSuccess.querySelector('.success-screen');
        if (successScreen) successScreen.classList.add('active');
    }
    
    document.getElementById('receipt-order-id').textContent = randomOrderId;
    document.getElementById('receipt-name').textContent = nameVal;
    document.getElementById('receipt-nim').textContent = nimVal;
    
    let facultyShort = facultyVal.split('(')[1] ? facultyVal.split('(')[1].replace(')', '') : facultyVal;
    document.getElementById('receipt-faculty').textContent = facultyShort;
    document.getElementById('receipt-total').textContent = formatRupiah(total);

    // Tetap simpan ke local storage hanya untuk reference browser saat itu
    const orderData = {
        id: randomOrderId,
        date: new Date().toLocaleString('id-ID'),
        name: nameVal,
        nim: nimVal,
        whatsapp: waVal,
        email: emailVal,
        faculty: facultyVal,
        department: departmentVal,
        items: cart,
        total: total,
        status: 'Menunggu Verifikasi WA'
    };
    let orders = [];
    if (localStorage.getItem('ub_orders')) {
        orders = JSON.parse(localStorage.getItem('ub_orders'));
    }
    orders.unshift(orderData);
    localStorage.setItem('ub_orders', JSON.stringify(orders));

    // Reset shopping cart locally upon registration
    cart = [];
    updateCartUI();
}

// ==========================================================================
// 6. WHATSAPP CONFIRMATION (RE-ROUTE TO NEW NUMBER: 085111225515)
// ==========================================================================

function sendWhatsAppConfirmation() {
    const orderId = document.getElementById('receipt-order-id').textContent;
    const name = document.getElementById('full-name').value;
    const nim = document.getElementById('nim-number').value;
    const wa = document.getElementById('whatsapp-number').value;
    const faculty = document.getElementById('student-faculty').value;
    const department = document.getElementById('student-department').value;
    
    // Retrieve order details from localStorage based on orderId
    let orders = [];
    if (localStorage.getItem('ub_orders')) {
        orders = JSON.parse(localStorage.getItem('ub_orders'));
    }
    const order = orders.find(o => o.id === orderId);
    
    let itemsText = '';
    if (order) {
        order.items.forEach((item, index) => {
            itemsText += `\n${index + 1}. *${item.name}* (x${item.quantity})\n   └ _Info/Ukuran: ${item.size}_`;
        });
    }

    let total = order ? order.total : 0;
    
    // Preformatted WhatsApp order template
    const textMessage = `*KONFIRMASI PRE-ORDER PERLENGKAPAN OSPEK UB 2026*

*Status:* MENUNGGU VERIFIKASI BUKTI TRANSFER
*Order ID:* #${orderId}
------------------------------------------
*DATA MAHASISWA BARU:*
- *Nama:* ${name}
- *NIM/No. Peserta:* ${nim}
- *WhatsApp:* ${wa}
- *Fakultas:* ${faculty}
- *Jurusan:* ${department}

*RINCIAN PESANAN:*${itemsText}

*TOTAL PEMBAYARAN:* ${formatRupiah(total)}
------------------------------------------
*LANGKAH BERIKUTNYA:*
_Mohon lampirkan screenshoot bukti transfer pembayaran QRIS di bawah ini untuk divalidasi admin secara manual._ Terima kasih!`;

    // Admin Phone Number updated to 085111225515 (International format: 6285111225515)
    const adminPhone = '6285111225515'; 
    const waUrl = `https://api.whatsapp.com/send?phone=${adminPhone}&text=${encodeURIComponent(textMessage)}`;
    
    // Open in a new tab
    window.open(waUrl, '_blank');
}

function downloadReceipt() {
    const orderId = document.getElementById('receipt-order-id').textContent;
    const name = document.getElementById('receipt-name').textContent;
    const nim = document.getElementById('receipt-nim').textContent;
    const faculty = document.getElementById('receipt-faculty').textContent;
    const total = document.getElementById('receipt-total').textContent;
    
    let orders = [];
    if (localStorage.getItem('ub_orders')) {
        orders = JSON.parse(localStorage.getItem('ub_orders'));
    }
    const order = orders.find(o => o.id === orderId);
    
    let itemsSummary = '';
    if (order) {
        order.items.forEach(item => {
            itemsSummary += `- ${item.name} (x${item.quantity}) - Size: ${item.size}\r\n`;
        });
    }

    const receiptContent = `=========================================
      RECEIPT PRE-ORDER OSPEK UB 2026
            OspekUB.kit Official
=========================================
Order ID     : #${orderId}
Status       : MENUNGGU VERIFIKASI TRANSFER
Tanggal      : ${new Date().toLocaleDateString('id-ID')}
-----------------------------------------
Nama Maba    : ${name}
NIM/Peserta  : ${nim}
Fakultas     : ${faculty}
-----------------------------------------
Daftar Pesanan:
${itemsSummary}
-----------------------------------------
TOTAL BAYAR  : ${total}
=========================================
Silakan kirimkan berkas tanda terima ini
dan foto bukti transfer Anda ke WhatsApp:
0851-1122-5515 untuk pemrosesan order.
=========================================`;

    // Dynamic file download trigger
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PendingInvoice-OspekUB-${orderId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Tanda terima pending berhasil diunduh!');
}
