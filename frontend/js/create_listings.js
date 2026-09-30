document.addEventListener('DOMContentLoaded', () => {

    // Redirect if not logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = "login.html";
        return;
    }

    let uploadedImages = [];
    let editingListingId = null;
    let detectedCoords = null; // { lat, lon } — set when user clicks "Current Location"

    const listingForm = document.getElementById('listing-form');
    const titleInput = document.getElementById('item-title');
    const categorySelect = document.getElementById('item-category');
    const priceInput = document.getElementById('item-price');
    const pricePeriodSelect = document.getElementById('item-period');
    const descInput = document.getElementById('item-desc');
    const sellerNameInput = document.getElementById('seller-name');
    const sellerPhoneInput = document.getElementById('seller-phone');
    const sellerCityInput = document.getElementById('seller-city');
    const autoRenewCheck = document.getElementById('auto-renew');

    const previewTitle = document.getElementById('prev-title');
    const previewCategory = document.getElementById('prev-category');
    const previewPrice = document.getElementById('prev-price');
    const previewPeriod = document.getElementById('prev-period');
    const previewDesc = document.getElementById('prev-desc');
    const previewSellerName = document.getElementById('prev-seller-name');
    const previewSellerCity = document.getElementById('prev-seller-city');
    const previewAvatar = document.getElementById('prev-avatar');
    const previewImg = document.getElementById('prev-img');
    const previewSecurity = document.getElementById('prev-security');

    const calcUserPrice = document.getElementById('calc-user-price');
    const calcCommission = document.getElementById('calc-commission');
    const calcSecurity = document.getElementById('calc-security');
    const calcNet = document.getElementById('calc-net');

    const dropzone = document.getElementById('dropzone');
    const imageInput = document.getElementById('image-input');
    const previewGrid = document.getElementById('image-preview-grid');

    const duplicateWarning = document.getElementById('duplicate-warning');

    initSellerDetails();

    [titleInput, categorySelect, priceInput, pricePeriodSelect, descInput, sellerNameInput, sellerCityInput].forEach(el => {
        if (el) {
            el.addEventListener('input', updateLivePreviewAndCalculator);
            el.addEventListener('change', updateLivePreviewAndCalculator);
        }
    });

    if (titleInput) {
        titleInput.addEventListener('blur', checkForDuplicateListing);
    }

    // Wire up the "Current Location" button in the City / Location field
    const cityAutoLocateBtn = document.getElementById('city-auto-locate-btn');
    if (cityAutoLocateBtn) {
        cityAutoLocateBtn.addEventListener('click', handleCityAutoLocate);
    }

    // If the user manually edits the city field, drop the GPS fix so we don't attach stale coords
    if (sellerCityInput) {
        sellerCityInput.addEventListener('input', () => {
            // Only clear when coming from keyboard (button is not mid-locate i.e. not disabled)
            if (!cityAutoLocateBtn || !cityAutoLocateBtn.disabled) {
                detectedCoords = null;
            }
        });
    }


    setupImageUpload();

    if (listingForm) {
        listingForm.addEventListener('submit', handleFormSubmit);
    }

    updateLivePreviewAndCalculator();
    renderMyListingsDashboard();
    renderPendingRequests();
    renderCompletedSettlements();

    /**
     * Uses the Geolocation API to detect coordinates, then reverse-geocodes via
     * OpenStreetMap Nominatim to fill in the seller-city field with a human-readable address.
     */
    async function handleCityAutoLocate() {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser.', 'error');
            return;
        }

        cityAutoLocateBtn.textContent = 'Locating…';
        cityAutoLocateBtn.disabled = true;

        try {
            // Promisify geolocation so we can use async/await
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });

            const { latitude, longitude } = position.coords;
            detectedCoords = { lat: latitude, lon: longitude }; // persist for form submit


            // Reverse-geocode with OpenStreetMap Nominatim — same zoom & parsing as Browse Rentals
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );
            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();

            // Use the same slice(0,3) logic as booking.js so both pages show identical text
            const detectedLocation = data.display_name
                ? data.display_name.split(',').slice(0, 3).join(',').trim()
                : 'Unknown Location';

            // Populate the input and trigger the live preview to refresh
            sellerCityInput.value = detectedLocation;
            sellerCityInput.dispatchEvent(new Event('input'));

            showToast(`📍 Location detected: ${detectedLocation}`);

        } catch (error) {
            console.error('Location error:', error);
            showToast('Failed to detect location. Please enter it manually.', 'error');
        } finally {
            cityAutoLocateBtn.textContent = '📍 Current Location';
            cityAutoLocateBtn.disabled = false;
        }
    }



    function updateLivePreviewAndCalculator() {
        const title = titleInput.value.trim() || 'Your Product Name';
        const category = categorySelect.value || 'General';
        const rawPrice = parseFloat(priceInput.value) || 0;
        const period = pricePeriodSelect.value || 'day';
        const desc = descInput.value.trim() || 'Provide a detailed description of your item to attract potential lenders/renters.';
        const sellerName = sellerNameInput.value.trim() || 'John Doe (Seller)';
        const sellerCity = sellerCityInput.value.trim() || 'Mumbai, IN';

        previewTitle.textContent = title;
        previewCategory.textContent = category.toUpperCase();
        previewPrice.textContent = '₹' + rawPrice.toLocaleString('en-IN');
        previewPeriod.textContent = period;
        previewDesc.textContent = desc;
        previewSellerName.textContent = sellerName;
        previewSellerCity.textContent = sellerCity;

        const initial = sellerName.charAt(0).toUpperCase() || 'S';
        previewAvatar.textContent = initial;

        const commission = Math.round(rawPrice * 0.02);
        const security = Math.round(rawPrice * 0.10);
        const netEarnings = Math.max(0, rawPrice - commission);

        calcUserPrice.textContent = '₹' + rawPrice.toLocaleString('en-IN');
        calcCommission.textContent = '- ₹' + commission.toLocaleString('en-IN');
        calcSecurity.textContent = '₹' + security.toLocaleString('en-IN');
        calcNet.textContent = '₹' + netEarnings.toLocaleString('en-IN');
        previewSecurity.textContent = 'Deposit: ₹' + security.toLocaleString('en-IN');
    }

    function setupImageUpload() {
        if (!dropzone || !imageInput) return;

        dropzone.addEventListener('click', () => imageInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('drag-over');
        });

        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
            }
        });
    }

    function handleFiles(files) {
        const remainingSlots = 4 - uploadedImages.length;
        if (remainingSlots <= 0) {
            alert('Maximum 4 images allowed per listing.');
            return;
        }

        const filesToProcess = Array.from(files).slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('Please upload valid image files (PNG, JPG, WEBP).');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImages.push(e.target.result);
                renderImagePreviews();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderImagePreviews() {
        previewGrid.innerHTML = '';

        if (uploadedImages.length > 0) {
            previewImg.src = uploadedImages[0];
        } else {
            previewImg.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80';
        }

        uploadedImages.forEach((imgSrc, index) => {
            const thumb = document.createElement('div');
            thumb.className = 'image-preview-thumb';
            thumb.innerHTML = `
                <img src="${imgSrc}" alt="Preview ${index + 1}" />
                <button type="button" class="remove-img-btn" data-index="${index}">&times;</button>
                ${index === 0 ? '<span class="primary-badge-tag">Cover</span>' : ''}
            `;

            thumb.querySelector('.remove-img-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                uploadedImages.splice(index, 1);
                renderImagePreviews();
            });

            previewGrid.appendChild(thumb);
        });
    }

    function checkForDuplicateListing() {
        const title = titleInput.value.trim().toLowerCase();
        if (!title) {
            duplicateWarning.style.display = 'none';
            duplicateWarning.classList.remove('show');
            return;
        }

        const existingListings = getStoredListings();
        const isDuplicate = existingListings.some(item => 
            item.title.toLowerCase() === title && item.id !== editingListingId
        );

        if (isDuplicate) {
            duplicateWarning.style.display = 'flex';
            duplicateWarning.classList.add('show');
        } else {
            duplicateWarning.style.display = 'none';
            duplicateWarning.classList.remove('show');
        }
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const title = titleInput.value.trim();
        const category = categorySelect.value;
        const price = parseFloat(priceInput.value);
        const period = pricePeriodSelect.value;
        const desc = descInput.value.trim();
        const sellerName = sellerNameInput.value.trim();
        const sellerPhone = sellerPhoneInput.value.trim();
        const sellerCity = sellerCityInput.value.trim();
        const autoRenew = autoRenewCheck.checked;

        if (!title || !price || !sellerName || !sellerPhone) {
            alert('Please fill out all required fields marked with *');
            return;
        }

        const commission = Math.round(price * 0.02);
        const securityDeposit = Math.round(price * 0.10);
        const netPayout = Math.max(0, price - commission);

        const defaultCover = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80';
        const imagesList = uploadedImages.length > 0 ? uploadedImages : [defaultCover];

        const existingListings = getStoredListings();

        if (editingListingId) {
            const index = existingListings.findIndex(l => l.id === editingListingId);
            if (index !== -1) {
                existingListings[index] = {
                    ...existingListings[index],
                    title,
                    category,
                    price,
                    period,
                    description: desc,
                    seller: {
                        name: sellerName,
                        phone: sellerPhone,
                        city: sellerCity,
                        address: sellerCity, // shown in the address line on listing cards
                        email: JSON.parse(localStorage.getItem('current_user'))?.useremail || 'aryanharit14@gmail.com'
                    },
                    images: imagesList,
                    securityDeposit,
                    commission,
                    netPayout,
                    autoRenew,
                    updatedAt: new Date().toISOString()
                };
                // Carry coords forward if the GPS fix is still active for this edit
                if (detectedCoords) {
                    existingListings[index].lat = detectedCoords.lat;
                    existingListings[index].lon = detectedCoords.lon;
                }
            }
            editingListingId = null;
        } else {
            const newListing = {
                id: 'LIST-' + Date.now(),
                title,
                category,
                price,
                period,
                description: desc,
                seller: {
                    name: sellerName,
                    phone: sellerPhone,
                    city: sellerCity,
                    address: sellerCity, // shown in the address line on listing cards
                    email: JSON.parse(localStorage.getItem('current_user'))?.useremail || 'aryanharit14@gmail.com'
                },
                // lat/lon are set when the user clicked "Current Location"; null otherwise
                lat: detectedCoords ? detectedCoords.lat : null,
                lon: detectedCoords ? detectedCoords.lon : null,
                images: imagesList,
                securityDeposit,
                commission,
                netPayout,
                status: 'Active',
                isBooked: false,
                viewsCount: 0,
                inquiriesCount: 0,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'), // 30 days valid
                autoRenew
            };


            existingListings.unshift(newListing);
        }

        localStorage.setItem('RentFlow_listings', JSON.stringify(existingListings));

        localStorage.setItem('RentFlow_sellerProfile', JSON.stringify({
            name: sellerName,
            phone: sellerPhone,
            city: sellerCity
        }));

        listingForm.reset();
        uploadedImages = [];
        renderImagePreviews();
        updateLivePreviewAndCalculator();
        renderMyListingsDashboard();
        renderPendingRequests();

        triggerSuccessModal();
    }

    function renderMyListingsDashboard() {
        const grid = document.getElementById('my-listings-grid');
        const countSpan = document.getElementById('total-listings-count');
        if (!grid) return;

        let listings = getStoredListings();
        
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const userEmail = currentUser ? currentUser.useremail : '';
        
        listings = listings.filter(item => {
            const sellerEmail = (item.seller && item.seller.email) ? item.seller.email : 'aryanharit14@gmail.com';
            return sellerEmail === userEmail;
        });

        if (countSpan) countSpan.textContent = listings.length;

        if (listings.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p style="font-size: 16px;">You haven't listed any items yet.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = listings.map(item => `
            <div class="listing-card-dash" id="card-${item.id}">
                <div class="dash-img-wrap">
                    <img src="${item.images[0]}" alt="${item.title}" />
                    <span class="dash-badge-status ${item.status === 'Active' ? 'dash-badge-active' : 'dash-badge-paused'}">
                        ${item.status} ${item.isBooked ? '• Booked' : ''}
                    </span>
                </div>
                <div class="dash-content">
                    <h4 class="dash-title">${item.title}</h4>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                        ₹${item.price.toLocaleString('en-IN')}/${item.period}
                    </div>
                    <div class="dash-meta-stats">
                        <span>${item.viewsCount || 0} views</span>
                        <span>Expires: ${item.expiresAt || '30 days'}</span>
                    </div>
                    <div class="dash-actions">
                        <button type="button" class="btn-sm" onclick="editListing('${item.id}')">Edit</button>
                        <button type="button" class="btn-sm" onclick="toggleListingStatus('${item.id}')">
                            ${item.status === 'Active' ? 'Pause' : 'Activate'}
                        </button>
                        <button type="button" class="btn-sm btn-sm-danger" onclick="deleteListing('${item.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.editListing = function(id) {
        const listings = getStoredListings();
        const item = listings.find(l => l.id === id);
        if (!item) return;

        editingListingId = item.id;
        titleInput.value = item.title;
        categorySelect.value = item.category;
        priceInput.value = item.price;
        pricePeriodSelect.value = item.period;
        descInput.value = item.description;
        sellerNameInput.value = item.seller.name;
        sellerPhoneInput.value = item.seller.phone;
        sellerCityInput.value = item.seller.city;
        autoRenewCheck.checked = item.autoRenew || false;

        uploadedImages = [...item.images];
        renderImagePreviews();
        updateLivePreviewAndCalculator();

        window.scrollTo({ top: 100, behavior: 'smooth' });
    };

    window.toggleListingStatus = function(id) {
        const listings = getStoredListings();
        const item = listings.find(l => l.id === id);
        if (item) {
            item.status = item.status === 'Active' ? 'Paused' : 'Active';
            localStorage.setItem('RentFlow_listings', JSON.stringify(listings));
            renderMyListingsDashboard();
        }
    };

    window.deleteListing = function(id) {
        if (confirm('Are you sure you want to delete this listing?')) {
            let listings = getStoredListings();
            listings = listings.filter(l => l.id !== id);
            localStorage.setItem('RentFlow_listings', JSON.stringify(listings));
            renderMyListingsDashboard();
        }
    };

    function renderPendingRequests() {
        const grid = document.getElementById('pending-requests-grid');
        const countSpan = document.getElementById('pending-requests-count');
        if (!grid) return;

        let listings = getStoredListings();
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const userEmail = currentUser ? currentUser.useremail : '';
        
        const myListingIds = listings.filter(item => {
            const sellerEmail = (item.seller && item.seller.email) ? item.seller.email : 'aryanharit14@gmail.com';
            return sellerEmail === userEmail;
        }).map(l => l.id);

        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}

        const pendingReqs = bookings.filter(b => b.status === 'Pending' && myListingIds.includes(b.listingId));

        if (countSpan) countSpan.textContent = pendingReqs.length;

        if (pendingReqs.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p style="font-size: 16px;">No pending requests at the moment.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = pendingReqs.map(req => `
            <div class="listing-card-dash" style="border: 1px solid #eab308;">
                <div class="dash-img-wrap">
                    <img src="${req.itemImage}" alt="${req.itemTitle}" />
                    <span class="dash-badge-status" style="background: #ca8a04;">Pending</span>
                </div>
                <div class="dash-content">
                    <h4 class="dash-title">${req.itemTitle}</h4>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                        Dates: ${req.startDate} to ${req.endDate} (${req.duration} days)
                    </div>
                    <div class="dash-meta-stats">
                        <span>Rate: ₹${req.rate}/day</span>
                        <span>Total: ₹${req.grandTotal}</span>
                    </div>
                    <div class="dash-actions" style="margin-top: 10px;">
                        <button type="button" class="btn-sm" style="background: #10b981; color: white; border: none;" onclick="approveRequest('${req.id}')">Approve</button>
                        <button type="button" class="btn-sm btn-sm-danger" onclick="rejectRequest('${req.id}')">Reject</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.approveRequest = function(reqId) {
        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}
        const bIndex = bookings.findIndex(b => b.id === reqId);
        if (bIndex !== -1) {
            bookings[bIndex].status = 'Approved';
            localStorage.setItem('rentflow_bookings', JSON.stringify(bookings));
            renderPendingRequests();
            alert('Request Approved! The buyer can now make the payment.');
        }
    };

    window.rejectRequest = function(reqId) {
        if (!confirm('Are you sure you want to reject this request?')) return;
        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}
        const bIndex = bookings.findIndex(b => b.id === reqId);
        if (bIndex !== -1) {
            bookings[bIndex].status = 'Cancelled';
            localStorage.setItem('rentflow_bookings', JSON.stringify(bookings));
            renderPendingRequests();
            renderCompletedSettlements();
        }
    };

    function renderCompletedSettlements() {
        const grid = document.getElementById('completed-settlements-grid');
        const countSpan = document.getElementById('completed-settlements-count');
        if (!grid) return;

        let listings = getStoredListings();
        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const userEmail = currentUser ? currentUser.useremail : '';
        
        // Find user owned listing IDs
        const myListingIds = listings.filter(item => {
            const sellerEmail = (item.seller && item.seller.email) ? item.seller.email : 'aryanharit14@gmail.com';
            return sellerEmail === userEmail;
        }).map(l => l.id);

        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}

        // Filter bookings of status 'Completed' (which means period ended and needs settlement)
        const completedBookings = bookings.filter(b => b.status === 'Completed' && myListingIds.includes(b.listingId));

        if (countSpan) countSpan.textContent = completedBookings.length;

        if (completedBookings.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                    <p style="font-size: 16px;">No completed rentals pending settlement.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = completedBookings.map(req => `
            <div class="listing-card-dash" style="border: 1px solid #10b981;">
                <div class="dash-img-wrap">
                    <img src="${req.itemImage}" alt="${req.itemTitle}" />
                    <span class="dash-badge-status" style="background: #10b981;">Completed</span>
                </div>
                <div class="dash-content">
                    <h4 class="dash-title">${req.itemTitle}</h4>
                    <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                        Renter: ${req.renterEmail || 'Guest'}
                    </div>
                    <div class="dash-meta-stats">
                        <span>Deposit: ₹${req.deposit}</span>
                        <span>Rent: ₹${req.subtotal}</span>
                    </div>
                    <div class="dash-actions" style="margin-top: 10px;">
                        <button type="button" class="btn-sm" style="background: #10b981; color: white; border: none; width: 100%; font-weight: 700;" onclick="settleRentalReturn('${req.id}', true)">Item Returned (Refund Deposit & Pay Out)</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    window.settleRentalReturn = function(bookingId, isReturned) {
        if (!confirm('Confirm return and process payments? This will refund security deposit to buyer and credit payout to your wallet.')) return;
        
        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}
        
        const bIndex = bookings.findIndex(b => b.id === bookingId);
        if (bIndex === -1) return;
        const booking = bookings[bIndex];

        if (isReturned) {
            const buyerEmail = booking.renterEmail || 'guest@example.com';
            const securityAmount = booking.deposit;
            
            // Refund security deposit to buyer's wallet
            updateWalletBalance(buyerEmail, securityAmount);
            
            // Save transaction for buyer
            let buyerTx = [];
            try {
                buyerTx = JSON.parse(localStorage.getItem(`wallet_tx_${buyerEmail}`)) || [];
            } catch(e) {}
            buyerTx.push({
                type: 'Credit',
                amount: securityAmount,
                desc: `Refund: Security Deposit (${booking.itemTitle})`,
                date: new Date().toLocaleDateString('en-IN')
            });
            localStorage.setItem(`wallet_tx_${buyerEmail}`, JSON.stringify(buyerTx));

            // Get seller email
            const currentUser = JSON.parse(localStorage.getItem('current_user'));
            const sellerEmail = currentUser ? currentUser.useremail : 'aryanharit14@gmail.com';
            
            // Transfer rental payment (minus 2% commission) to seller's wallet
            const rentAmount = booking.subtotal;
            const commission = Math.round(rentAmount * 0.02);
            const sellerEarnings = rentAmount - commission;
            
            updateWalletBalance(sellerEmail, sellerEarnings);
            
            // Save transaction for seller
            let sellerTx = [];
            try {
                sellerTx = JSON.parse(localStorage.getItem(`wallet_tx_${sellerEmail}`)) || [];
            } catch(e) {}
            sellerTx.push({
                type: 'Credit',
                amount: sellerEarnings,
                desc: `Rent Earning: ${booking.itemTitle} (2% commission cut)`,
                date: new Date().toLocaleDateString('en-IN')
            });
            localStorage.setItem(`wallet_tx_${sellerEmail}`, JSON.stringify(sellerTx));

            // Update booking status to 'Returned'
            bookings[bIndex].status = 'Returned';
            localStorage.setItem('rentflow_bookings', JSON.stringify(bookings));
            
            alert(`Settle Successful!\n- Security Deposit of ₹${securityAmount} refunded to buyer (${buyerEmail}).\n- Rent payout of ₹${sellerEarnings} (after 2% commission of ₹${commission}) transferred to your wallet.`);
            
            // Re-render dashboards
            renderCompletedSettlements();
        }
    };

    function initSellerDetails() {
        const savedSeller = localStorage.getItem('RentFlow_sellerProfile');
        let profile = null;
        if (savedSeller) {
            try {
                profile = JSON.parse(savedSeller);
            } catch (e) {
                console.error('Error loading seller profile', e);
            }
        }
        
        // Fallback to logged-in user details if no custom seller profile has been saved
        if (!profile || !profile.name) {
            const currentUser = JSON.parse(localStorage.getItem('current_user'));
            if (currentUser) {
                profile = {
                    name: currentUser.name || currentUser.username || '',
                    phone: currentUser.userphone || '',
                    city: currentUser.address || ''
                };
            }
        }

        if (profile) {
            if (sellerNameInput && profile.name) sellerNameInput.value = profile.name;
            if (sellerPhoneInput && profile.phone) sellerPhoneInput.value = profile.phone;
            if (sellerCityInput && profile.city) sellerCityInput.value = profile.city;
        }
    }

    // Set up API Product Sync functionality
    const apiSyncBtn = document.getElementById('api-sync-btn');
    if (apiSyncBtn) {
        apiSyncBtn.addEventListener('click', async () => {
            const originalHTML = apiSyncBtn.innerHTML;
            apiSyncBtn.disabled = true;
            apiSyncBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 1s linear infinite;"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                <span>Syncing API...</span>
            `;
            
            // Add style for spinning animation inline to avoid editing index.css unnecessarily
            if (!document.getElementById('api-spin-style')) {
                const style = document.createElement('style');
                style.id = 'api-spin-style';
                style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
                document.head.appendChild(style);
            }

            try {
                const response = await fetch('../js/products.json');
                if (!response.ok) {
                    throw new Error('API request failed');
                }
                const apiListings = await response.json();
                
                let existingListings = getStoredListings();
                const existingIds = new Set(existingListings.map(item => item.id));
                const newItems = apiListings.filter(item => !existingIds.has(item.id));
                
                if (newItems.length > 0) {
                    // Prepend new listings
                    existingListings = [...newItems, ...existingListings];
                    localStorage.setItem('RentFlow_listings', JSON.stringify(existingListings));
                    
                    renderMyListingsDashboard();
                    updateLivePreviewAndCalculator();
                    alert(`Successfully fetched and added ${newItems.length} products from the central inventory API!`);
                } else {
                    alert('All central API products are already synchronized with your local listings.');
                }
                
                apiSyncBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Synced!</span>
                `;
                apiSyncBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                
                setTimeout(() => {
                    apiSyncBtn.innerHTML = originalHTML;
                    apiSyncBtn.style.background = '';
                    apiSyncBtn.disabled = false;
                }, 3000);
            } catch (error) {
                console.error('API Sync Error:', error);
                alert('Error syncing products from local API server: ' + error.message);
                apiSyncBtn.innerHTML = originalHTML;
                apiSyncBtn.disabled = false;
            }
        });
    }

    function getStoredListings() {
        const data = localStorage.getItem('RentFlow_listings');
        if (!data) return getInitialDemoListings();
        try {
            return JSON.parse(data);
        } catch (e) {
            return getInitialDemoListings();
        }
    }

    function getInitialDemoListings() {
        return [
            {
                id: 'LIST-101',
                title: 'Sony Alpha A7 III Camera with 24-70mm Lens',
                category: 'Electronics',
                price: 1500,
                period: 'day',
                description: 'Professional full-frame mirrorless camera in pristine condition. Includes 2 batteries and 64GB SD card.',
                seller: { name: 'Rahul Sharma', phone: '+91 98765 43210', city: 'Mumbai' },
                images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 150,
                commission: 30,
                netPayout: 1470,
                status: 'Active',
                isBooked: false,
                viewsCount: 42,
                inquiriesCount: 5,
                createdAt: new Date().toISOString(),
                expiresAt: '28 Aug 2026',
                autoRenew: true
            },
            {
                id: 'LIST-102',
                title: 'Mountain Electric Bike (30km Range)',
                category: 'Vehicles',
                price: 500,
                period: 'day',
                description: 'Fast e-bike suitable for daily commuting and weekend rides. Helmet provided.',
                seller: { name: 'Ananya Verma', phone: '+91 91234 56789', city: 'Bengaluru' },
                images: ['https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 50,
                commission: 10,
                netPayout: 490,
                status: 'Active',
                isBooked: true,
                viewsCount: 88,
                inquiriesCount: 12,
                createdAt: new Date().toISOString(),
                expiresAt: '15 Sep 2026',
                autoRenew: false
            }
        ];
    }

    function triggerSuccessModal() {
        const modal = document.getElementById('success-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    window.closeSuccessModal = function() {
        const modal = document.getElementById('success-modal');
        if (modal) modal.classList.remove('active');
    };
});
