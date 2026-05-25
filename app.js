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
    clothingNoShoesActualPrice: 129000,
    clothingNoShoesOriginalPrice: 150000,
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

// 3. Sizes Config
let sizesConfig = {
    kemeja: ['S', 'M', 'L', 'XL', 'XXL'],
    celana: ['S', 'M', 'L', 'XL', 'XXL'],
    rok: ['S', 'M', 'L', 'XL', 'XXL'],
    pantofelPria: ['38', '39', '40', '41', '42', '43', '44', '45'],
    pantofelWanita: ['36', '37', '38', '39', '40']
};

// 4. Size Chart Data (Tabel Panduan Ukuran dengan CM - bisa diedit di Admin)
let sizeChartData = {
    kemeja: {
        headers: ['Ukuran', 'Lebar Dada (cm)', 'Panjang Badan (cm)', 'Panjang Lengan (cm)'],
        rows: [
            ['S', '49', '68', '55'],
            ['M', '52', '70', '57'],
            ['L', '55', '72', '59'],
            ['XL', '58', '74', '61'],
            ['XXL', '62', '76', '63']
        ]
    },
    celana: {
        headers: ['Ukuran', 'Lingkar Pinggang (cm)', 'Panjang Celana (cm)', 'Lingkar Paha (cm)'],
        rows: [
            ['S', '68-72', '98', '52'],
            ['M', '72-76', '100', '54'],
            ['L', '76-82', '102', '56'],
            ['XL', '82-88', '104', '58'],
            ['XXL', '88-94', '106', '62']
        ]
    },
    rok: {
        headers: ['Ukuran', 'Lingkar Pinggang (cm)', 'Panjang Rok (cm)', 'Lingkar Pinggul (cm)'],
        rows: [
            ['S', '62-66', '90', '86'],
            ['M', '66-70', '92', '90'],
            ['L', '70-76', '94', '94'],
            ['XL', '76-82', '96', '98'],
            ['XXL', '82-88', '98', '102']
        ]
    },
    pantofel: {
        headers: ['Ukuran', 'Panjang Kaki (cm)', 'Keterangan'],
        rows: [
            ['36', '23.0', 'Wanita'],
            ['37', '23.5', 'Wanita'],
            ['38', '24.0', 'Pria / Wanita'],
            ['39', '24.5', 'Pria / Wanita'],
            ['40', '25.0', 'Pria / Wanita'],
            ['41', '25.5', 'Pria'],
            ['42', '26.0', 'Pria'],
            ['43', '26.5', 'Pria'],
            ['44', '27.0', 'Pria'],
            ['45', '27.5', 'Pria']
        ]
    }
};

let referralDiscount = 0; // Added for task 3

// ==========================================================================
// SIZE CHART TOGGLE & TAB FUNCTIONS
// ==========================================================================

function toggleSizeChart(location) {
    const panel = document.getElementById(`size-chart-${location}`);
    const arrow = document.getElementById(`size-chart-arrow-${location}`);
    if (!panel) return;

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        if (arrow) arrow.style.transform = 'rotate(180deg)';
        // Render default tab (kemeja)
        renderSizeChart(location, 'kemeja');
    } else {
        panel.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    }
}

function switchSizeTab(location, tabName) {
    // Update active tab button
    const panel = document.getElementById(`size-chart-${location}`);
    if (!panel) return;
    const tabs = panel.querySelectorAll('.size-tab');
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
    });
    renderSizeChart(location, tabName);
}

function renderSizeChart(location, tabName) {
    const wrap = document.getElementById(`size-chart-table-${location}`);
    if (!wrap) return;

    // Load from localStorage if available
    if (localStorage.getItem('ub_size_chart_data')) {
        sizeChartData = JSON.parse(localStorage.getItem('ub_size_chart_data'));
    }

    const chart = sizeChartData[tabName];
    if (!chart) {
        wrap.innerHTML = '<p style="color: var(--text-muted); padding: 10px;">Data belum tersedia.</p>';
        return;
    }

    let html = '<table class="size-chart-table"><thead><tr>';
    chart.headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    chart.rows.forEach(row => {
        html += '<tr>';
        row.forEach((cell, i) => {
            html += i === 0 ? `<td class="size-label">${cell}</td>` : `<td>${cell}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
}

// Initialize Configs from localStorage
function initLocalConfigs() {
    // Product Config
    if (localStorage.getItem('ub_products_config')) {
        let savedConfig = JSON.parse(localStorage.getItem('ub_products_config'));
        // Migrasi properti baru (misal: clothingNoShoesActualPrice) jika belum ada di localStorage
        productsConfig = { ...productsConfig, ...savedConfig };
    }
    localStorage.setItem('ub_products_config', JSON.stringify(productsConfig));

    // Sizes Config
    if (localStorage.getItem('ub_sizes_config')) {
        sizesConfig = JSON.parse(localStorage.getItem('ub_sizes_config'));
    } else {
        localStorage.setItem('ub_sizes_config', JSON.stringify(sizesConfig));
    }

    // Size Chart Data (Tabel Panduan Ukuran)
    if (localStorage.getItem('ub_size_chart_data')) {
        sizeChartData = JSON.parse(localStorage.getItem('ub_size_chart_data'));
    } else {
        localStorage.setItem('ub_size_chart_data', JSON.stringify(sizeChartData));
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
    
    // Paket C Prices (No Shoes)
    const packClothNoShoesActual = document.getElementById('pack-clothing-no-shoes-price');
    if (packClothNoShoesActual) packClothNoShoesActual.textContent = formatRupiah(productsConfig.clothingNoShoesActualPrice);
    
    const packClothNoShoesOrig = document.getElementById('pack-clothing-ns-orig-price');
    if (packClothNoShoesOrig) packClothNoShoesOrig.textContent = formatRupiah(productsConfig.clothingNoShoesOriginalPrice);
    
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
            const prodName = prod.name.toLowerCase();
            let hasSize = prodName.includes('kemeja') || prodName.includes('celana') || prodName.includes('rok') || prodName.includes('pantofel') || prodName.includes('baju');
            
            let sizeOptions = '';
            if (hasSize) {
                if (prodName.includes('pantofel')) {
                    if (prodName.includes('wanita')) {
                        sizeOptions = sizesConfig.pantofelWanita.map(s => `<option value="${s}">${s}</option>`).join('');
                    } else if (prodName.includes('pria')) {
                        sizeOptions = sizesConfig.pantofelPria.map(s => `<option value="${s}">${s}</option>`).join('');
                    } else {
                        // Jika tidak spesifik pria/wanita, gabungkan size atau default ke pria
                        sizeOptions = sizesConfig.pantofelPria.map(s => `<option value="${s}">${s}</option>`).join('');
                    }
                } else if (prodName.includes('rok')) {
                    sizeOptions = sizesConfig.rok.map(s => `<option value="${s}">${s}</option>`).join('');
                } else if (prodName.includes('celana') || prodName.includes('pants')) {
                    sizeOptions = sizesConfig.celana.map(s => `<option value="${s}">${s}</option>`).join('');
                } else {
                    sizeOptions = sizesConfig.kemeja.map(s => `<option value="${s}">${s}</option>`).join('');
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
    updateCartUI();
    setPackageGender('pria');
    
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
    
    // Package B elements
    const btnPria = document.getElementById('gender-pria-btn');
    const btnWanita = document.getElementById('gender-wanita-btn');
    const bottomsLabel = document.getElementById('label-bottoms-size-b');
    const bottomsSelect = document.getElementById('pack-bottoms-size');
    const shoesSelect = document.getElementById('pack-shoes-size');
    const shirtSelect = document.getElementById('pack-shirt-size');
    const includeBottoms = document.getElementById('include-bottoms-b');
    const includeShoes = document.getElementById('include-shoes-b');

    // Package C elements
    const btnPriaC = document.getElementById('gender-pria-btn-c');
    const btnWanitaC = document.getElementById('gender-wanita-btn-c');
    const bottomsLabelC = document.getElementById('label-bottoms-size-c');
    const bottomsSelectC = document.getElementById('pack-bottoms-size-c');
    const shirtSelectC = document.getElementById('pack-shirt-size-c');
    const includeBottomsC = document.getElementById('include-bottoms-c');

    if (gender === 'pria') {
        // Toggle Buttons
        if (btnPria) btnPria.classList.add('active');
        if (btnWanita) btnWanita.classList.remove('active');
        if (btnPriaC) btnPriaC.classList.add('active');
        if (btnWanitaC) btnWanitaC.classList.remove('active');
        
        // Package B text & lists
        if (bottomsLabel) bottomsLabel.textContent = 'Celana Hitam';
        if (includeBottoms) includeBottoms.innerHTML = `<i class="fa-solid fa-circle-check"></i> Celana Hitam Formal`;
        if (includeShoes) includeShoes.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sepatu Pantofel Pria`;
        
        // Package C text & lists
        if (bottomsLabelC) bottomsLabelC.textContent = 'Celana Hitam';
        if (includeBottomsC) includeBottomsC.innerHTML = `<i class="fa-solid fa-circle-check"></i> Celana Hitam Formal`;
        
        // Options updating
        if (shirtSelect) shirtSelect.innerHTML = sizesConfig.kemeja.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (shirtSelectC) shirtSelectC.innerHTML = sizesConfig.kemeja.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (bottomsSelect) bottomsSelect.innerHTML = sizesConfig.celana.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (bottomsSelectC) bottomsSelectC.innerHTML = sizesConfig.celana.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        
        if (shoesSelect) {
            shoesSelect.innerHTML = sizesConfig.pantofelPria.map(s => `<option value="${s}">Size ${s}</option>`).join('');
            shoesSelect.value = sizesConfig.pantofelPria.includes('40') ? '40' : sizesConfig.pantofelPria[0];
        }
    } else {
        // Toggle Buttons
        if (btnPria) btnPria.classList.remove('active');
        if (btnWanita) btnWanita.classList.add('active');
        if (btnPriaC) btnPriaC.classList.remove('active');
        if (btnWanitaC) btnWanitaC.classList.add('active');
        
        // Package B text & lists
        if (bottomsLabel) bottomsLabel.textContent = 'Rok Wiru Hitam';
        if (includeBottoms) includeBottoms.innerHTML = `<i class="fa-solid fa-circle-check"></i> Rok Wiru Hitam`;
        if (includeShoes) includeShoes.innerHTML = `<i class="fa-solid fa-circle-check"></i> Sepatu Pantofel Wanita`;
        
        // Package C text & lists
        if (bottomsLabelC) bottomsLabelC.textContent = 'Rok Wiru Hitam';
        if (includeBottomsC) includeBottomsC.innerHTML = `<i class="fa-solid fa-circle-check"></i> Rok Wiru Hitam`;
        
        // Options updating
        if (shirtSelect) shirtSelect.innerHTML = sizesConfig.kemeja.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (shirtSelectC) shirtSelectC.innerHTML = sizesConfig.kemeja.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (bottomsSelect) bottomsSelect.innerHTML = sizesConfig.rok.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        if (bottomsSelectC) bottomsSelectC.innerHTML = sizesConfig.rok.map(s => `<option value="${s}">Ukuran ${s}</option>`).join('');
        
        if (shoesSelect) {
            shoesSelect.innerHTML = sizesConfig.pantofelWanita.map(s => `<option value="${s}">Size ${s}</option>`).join('');
            shoesSelect.value = sizesConfig.pantofelWanita.includes('37') ? '37' : sizesConfig.pantofelWanita[0];
        }
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
    else if (packType === 'clothing-no-shoes') {
        const id = `package-clothing-ns-${packageGender}`;
        const genderLabel = packageGender === 'pria' ? 'Pria' : 'Wanita';
        const name = `Paket C: 1 Set Pakaian Tanpa Pantofel (${genderLabel})`;
        
        const shirtSize = document.getElementById('pack-shirt-size-c').value;
        const bottomsSize = document.getElementById('pack-bottoms-size-c').value;
        
        // Extra cost for XXL sizes
        let extraCost = 0;
        if (shirtSize === 'XXL') extraCost += 5000;
        if (bottomsSize === 'XXL') extraCost += 5000;
        
        const price = productsConfig.clothingNoShoesActualPrice + extraCost;
        const size = `Kemeja: ${shirtSize}, Rok/Celana: ${bottomsSize}`;
        
        addToCart(id, name, price, size, 'package');
        showToast('Sukses memasukkan Paket C ke keranjang!');
    }
}

// Add Single Merchandise Items (No Sizes)
function addSingleToCart(id, name, fallbackPrice, size) {
    const finalPrice = fallbackPrice; // Gunakan harga langsung dari Supabase
    addToCart(id, name, finalPrice, size, 'single');
    showToast(`Sukses menambah ${name} ke keranjang!`);
}

// Add Single Clothing Items (Includes Sizes)
function addSingleClothingToCart(id, name, fallbackPrice, sizeSelectId) {
    const sizeSelect = document.getElementById(sizeSelectId);
    const sizeVal = sizeSelect.value;
    
    let extraCost = 0;
    if (sizeVal === 'XXL') extraCost = 5000;
    
    const basePrice = fallbackPrice; // Gunakan harga langsung dari Supabase
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

    const grandTotalAmount = subtotalAmount + 2500 - referralDiscount; // +2500 admin fee, -discount if valid
    const virtualSubtotal = grandTotalAmount + discountAmount;
    
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
// 5. DOKU PAYMENT GATEWAY INTEGRATION (PRODUCTION)
// ==========================================================================

function triggerCheckout(event) {
    event.preventDefault();
    
    if (cart.length === 0) {
        alert('Keranjang pesanan kamu masih kosong! Silakan tambahkan paket atau item satuan terlebih dahulu.');
        return;
    }
    
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
    
    referralDiscount = 0;

    if (refCode) {
        if (refStatus) {
            refStatus.textContent = 'Memvalidasi kode...';
            refStatus.style.color = 'var(--text-muted)';
        }
        
        try {
            const { data, error } = await db.from('affiliates').select('code').eq('code', refCode).single();
            if (error || !data) {
                if (refStatus) {
                    refStatus.textContent = 'Kode referral tidak valid. Melanjutkan tanpa diskon...';
                    refStatus.style.color = '#e67e22';
                }
                // Lanjutkan tanpa diskon, jangan return
            } else {
                if (refStatus) {
                    refStatus.textContent = 'Kode referral valid! (Diskon Rp 10.000)';
                    refStatus.style.color = '#2ecc71';
                }
                referralDiscount = 10000;
            }
        } catch (err) {
            if (refStatus) {
                refStatus.textContent = 'Gagal validasi kode. Melanjutkan tanpa diskon...';
                refStatus.style.color = '#e67e22';
            }
            // Lanjutkan tanpa diskon, jangan return
        }
    }
    
    updateCartUI();
    showQrisPayment();
}

// Global variables for QRIS
let qrisSelectedFile = null;
let currentQrisTotal = 0;
let currentOrderId = '';

function showQrisPayment() {
    // Remove old overlay if exists
    const oldOverlay = document.getElementById('qris-dynamic-overlay');
    if (oldOverlay) oldOverlay.remove();
    clearInterval(qrisTimerInterval);

    // Calculate total
    let total = 0;
    cart.forEach(item => total += (item.price * item.quantity));
    total = total + 2500 - referralDiscount;
    currentQrisTotal = total;
    currentOrderId = 'UB-' + Math.floor(100000 + Math.random() * 900000);
    qrisSelectedFile = null;

    // Build overlay fully via JS (no CSS class dependency)
    const overlay = document.createElement('div');
    overlay.id = 'qris-dynamic-overlay';
    overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:rgba(0,0,0,0.88)', 'backdrop-filter:blur(10px)',
        'z-index:99999', 'display:flex', 'align-items:flex-start',
        'justify-content:center', 'padding:20px', 'box-sizing:border-box',
        'overflow-y:auto'
    ].join(';');

    overlay.innerHTML = `
        <div style="background:linear-gradient(135deg,#021618,#0a2628);border:1px solid rgba(212,175,55,0.4);border-radius:20px;padding:28px 24px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.6);font-family:'Poppins',sans-serif;position:relative;margin:auto;">
            <button onclick="closeManualQris()" style="position:absolute;top:14px;right:16px;background:transparent;border:none;color:rgba(255,255,255,0.5);font-size:1.6rem;cursor:pointer;line-height:1;">&times;</button>
            <div style="text-align:center;margin-bottom:18px;">
                <h3 style="color:#D4AF37;font-size:1.25rem;margin:0 0 6px;font-family:'Montserrat',sans-serif;"><i class="fa-solid fa-qrcode"></i> Pembayaran QRIS</h3>
                <p style="color:rgba(255,255,255,0.6);font-size:0.82rem;margin:0;">Scan QR di bawah dengan M-Banking atau E-Wallet kamu</p>
            </div>
            <div style="background:white;border-radius:12px;padding:12px;display:flex;justify-content:center;margin-bottom:16px;">
                <img src="/assets/qris.jpeg" alt="QRIS" style="max-width:100%;height:auto;max-height:280px;border-radius:8px;display:block;"
                    onerror="this.src='assets/qris.jpeg'">
            </div>
            <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px;margin-bottom:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <span style="color:rgba(255,255,255,0.7);font-size:0.9rem;">Total Tagihan:</span>
                    <strong style="color:#D4AF37;font-size:1.15rem;">${formatRupiah(total)}</strong>
                </div>
                <div style="display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(231,76,60,0.12);border:1px solid rgba(231,76,60,0.25);border-radius:8px;padding:8px 12px;">
                    <i class="fa-solid fa-clock" style="color:#e74c3c;"></i>
                    <span style="color:rgba(255,255,255,0.8);font-size:0.85rem;">Sisa waktu:</span>
                    <strong id="qris-countdown-dyn" style="color:#e74c3c;font-size:1rem;font-family:monospace;">30:00</strong>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <label for="qris-file-input-dyn" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;background:rgba(212,175,55,0.08);border:1.5px dashed rgba(212,175,55,0.6);border-radius:10px;color:#D4AF37;cursor:pointer;font-size:0.9rem;font-weight:500;">
                    <i class="fa-solid fa-cloud-arrow-up" style="font-size:1.1rem;"></i> Upload Bukti Transfer (JPG, max 1MB)
                </label>
                <input type="file" id="qris-file-input-dyn" accept="image/jpeg,image/jpg" style="display:none;" onchange="handleProofUpload(event)">
                <div id="qris-filename-dyn" style="text-align:center;font-size:0.78rem;color:rgba(255,255,255,0.45);margin-top:6px;">Belum ada file dipilih</div>
            </div>
            <button id="btn-submit-qris" onclick="submitQrisPayment()" disabled style="width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(135deg,#D4AF37,#b08d1a);color:#021618;font-size:1rem;font-weight:700;cursor:not-allowed;opacity:0.5;font-family:'Poppins',sans-serif;">
                <i class="fa-solid fa-paper-plane"></i> Kirim Bukti Pembayaran
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Start countdown
    let timeLeft = 30 * 60;
    qrisTimerInterval = setInterval(() => {
        timeLeft--;
        const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const s = (timeLeft % 60).toString().padStart(2, '0');
        const el = document.getElementById('qris-countdown-dyn');
        if (el) el.textContent = m + ':' + s;
        if (timeLeft <= 0) {
            clearInterval(qrisTimerInterval);
            closeManualQris();
            alert('Waktu pembayaran habis. Silakan ulangi proses checkout.');
        }
    }, 1000);
}

function closeManualQris() {
    const overlay = document.getElementById('qris-dynamic-overlay');
    if (overlay) overlay.remove();
    clearInterval(qrisTimerInterval);
}

function handleProofUpload(event) {
    const file = event.target.files[0];
    const filenameEl = document.getElementById('qris-filename-dyn');
    const btnSubmit = document.getElementById('btn-submit-qris');

    if (!file) {
        qrisSelectedFile = null;
        if (filenameEl) filenameEl.textContent = 'Belum ada file dipilih';
        if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.style.opacity = '0.5'; btnSubmit.style.cursor = 'not-allowed'; }
        return;
    }
    if (file.size > 1 * 1024 * 1024) {
        alert('Ukuran file terlalu besar! Maksimal 1MB. Kompres foto terlebih dahulu.');
        event.target.value = '';
        return;
    }
    qrisSelectedFile = file;
    if (filenameEl) filenameEl.textContent = '\u2705 ' + file.name;
    if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.style.opacity = '1'; btnSubmit.style.cursor = 'pointer'; }
}

async function submitQrisPayment() {
    if (!qrisSelectedFile) return;

    const btnSubmit = document.getElementById('btn-submit-qris');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.style.opacity = '0.7';
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim data...';
    }

    const nameVal = document.getElementById('full-name').value;
    const waVal = document.getElementById('whatsapp-number').value;
    const emailVal = document.getElementById('email-address').value;

    const urlParams = new URLSearchParams(window.location.search);
    const affiliateCode = urlParams.get('ref') || (document.getElementById('referral-code')?.value.trim().toUpperCase() || null);

    let proofUrl = null;

    try {
        // 1. Coba upload bukti ke Supabase Storage (opsional - tidak blokir jika gagal)
        try {
            const fileExt = qrisSelectedFile.name.split('.').pop();
            const fileName = `${currentOrderId}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await db.storage
                .from('payment-proofs')
                .upload(fileName, qrisSelectedFile);
            if (!uploadError) {
                const { data: pub } = db.storage.from('payment-proofs').getPublicUrl(fileName);
                proofUrl = pub.publicUrl;
            }
        } catch (uploadErr) {
            // Upload gagal tidak memblokir pengiriman pesanan
            console.warn('Upload bukti gagal (bucket mungkin belum dibuat):', uploadErr);
        }

        // 2. Insert Order ke Supabase
        const { error: dbError } = await db.from('orders').insert([{
            id: currentOrderId,
            name: nameVal,
            whatsapp: waVal,
            email: emailVal,
            nim: '-',
            faculty: '-',
            department: '-',
            items: cart.map(item => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size
            })),
            total: currentQrisTotal,
            status: 'Menunggu Verifikasi',
            affiliate_code: affiliateCode || null,
            proof_url: proofUrl
        }]);

        if (dbError) throw new Error('Gagal menyimpan pesanan: ' + dbError.message);

        // 3. Simpan ke localStorage
        const orderData = {
            id: currentOrderId,
            date: new Date().toLocaleString('id-ID'),
            name: nameVal,
            whatsapp: waVal,
            email: emailVal,
            items: [...cart],
            total: currentQrisTotal,
            status: 'Menunggu Verifikasi'
        };
        let orders = JSON.parse(localStorage.getItem('ub_orders') || '[]');
        orders.unshift(orderData);
        localStorage.setItem('ub_orders', JSON.stringify(orders));

        // 4. Sukses!
        cart = [];
        updateCartUI();
        closeManualQris();
        showSuccessPopup();

    } catch (err) {
        alert('Terjadi kesalahan saat mengirim pesanan:\n' + err.message);
        const btn = document.getElementById('btn-submit-qris');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Kirim Bukti Pembayaran';
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    }
}

function showSuccessPopup() {
    closeManualQris();
    const old = document.getElementById('qris-success-overlay-dyn');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.id = 'qris-success-overlay-dyn';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);backdrop-filter:blur(10px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    overlay.innerHTML = `
        <div style="background:linear-gradient(135deg,#021618,#0a2628);border:1px solid rgba(212,175,55,0.4);border-radius:20px;padding:40px 32px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.6);font-family:'Poppins',sans-serif;">
            <div style="font-size:4.5rem;color:#2ecc71;margin-bottom:16px;text-shadow:0 0 30px rgba(46,204,113,0.5);"><i class="fa-solid fa-circle-check"></i></div>
            <h3 style="color:#D4AF37;font-size:1.4rem;margin:0 0 12px;font-family:'Montserrat',sans-serif;">Pesanan Berhasil Dikirim! \uD83C\uDF89</h3>
            <p style="color:rgba(255,255,255,0.9);font-size:0.95rem;margin-bottom:16px;line-height:1.6;">Selamat, kamu sudah mengamankan perlengkapan OSPEK-mu!</p>
            <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:14px;margin-bottom:24px;">
                <p style="color:rgba(255,255,255,0.7);font-size:0.82rem;margin:0;line-height:1.6;">\uD83D\uDCE7 <strong style="color:rgba(255,255,255,0.9);">Invoice lunas</strong> akan dikirimkan ke email kamu setelah pembayaran dikonfirmasi oleh Admin.</p>
            </div>
            <button onclick="document.getElementById('qris-success-overlay-dyn').remove();window.scrollTo({top:0,behavior:'smooth'});" style="background:linear-gradient(135deg,#D4AF37,#b08d1a);color:#021618;border:none;border-radius:12px;padding:14px 32px;font-size:1rem;font-weight:700;cursor:pointer;width:100%;font-family:'Poppins',sans-serif;">Kembali ke Beranda</button>
        </div>
    `;
    document.body.appendChild(overlay);
}

function closeSuccessPopup() {
    const el = document.getElementById('qris-success-overlay-dyn');
    if (el) el.remove();
    const el2 = document.getElementById('qris-success-overlay');
    if (el2) el2.remove();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
-----------------------------------------
Daftar Pesanan:
${itemsSummary}
-----------------------------------------
TOTAL BAYAR  : ${total}
=========================================
Terima kasih telah memesan.
Tunggu invoice dikirimkan ke email Anda.
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
