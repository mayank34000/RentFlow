/**
 * ============================================================================
 * RENTFLOW - BOOKING & RENTALS MODULE
 * ============================================================================
 * This script handles the core functionality of the Explore Rentals page.
 * It demonstrates proficiency in DOM Manipulation, Event Handling, Local Storage,
 * Array Higher-Order Functions (map, filter), Promises, Async/Await, and the
 * Fetch API (used for reverse geocoding via OpenStreetMap Nominatim).
 */

document.addEventListener("DOMContentLoaded", () => {
    // ========================================
    // 0. AUTH UI UPDATE
    // ========================================
    function updateAuthUI() {
        const authContainer = document.getElementById("auth-buttons");
        if (!authContainer) return;
        
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        if (isLoggedIn) {
            let user = { userfname: "User" };
            try { user = JSON.parse(localStorage.getItem("current_user")) || user; } catch(e) {}
            const nameToDisplay = user.name || user.username || user.userfname || 'User';
            const firstName = nameToDisplay.split(' ')[0];
            const savedImage = localStorage.getItem('profileImage') || '../assets/profile.png';
            
            authContainer.style.display = 'flex';
            authContainer.style.alignItems = 'center';
            authContainer.style.gap = '15px';
            authContainer.style.position = 'relative';
            const premiumText = user.isPremium ? "Extend Premium" : "Get Premium";
            
            authContainer.innerHTML = `
                <div class="profile-dropdown-trigger" id="profile-dropdown-trigger" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                    <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(255,255,255,0.2);">
                        <img src="${savedImage}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <span id="profile-name" style="font-weight: 600; color: #fff;">${firstName}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                
                <div class="profile-dropdown-menu" id="profile-dropdown-menu" style="display: none; position: absolute; top: 40px; right: 0; background: #12172b; border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; width: 180px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 1000; padding: 6px 0; flex-direction: column;">
                    <a href="profile.html" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Profile</a>
                    <a href="#" id="nav-my-wallet" style="padding: 10px 16px; color: #b0b8c6; text-decoration: none; font-size: 14px; font-weight: 500; transition: background 0.2s, color 0.2s; display: block;">My Wallet</a>
                    <a href="premium.html" style="padding: 10px 16px; color: #eab308; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s, color 0.2s; display: block; white-space: nowrap;">👑 ${premiumText}</a>
                    <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 6px 0;"></div>
                    <a href="#" id="dropdown-logout" style="padding: 10px 16px; color: #ef4444; text-decoration: none; font-size: 14px; font-weight: 600; transition: background 0.2s; display: block;">Logout</a>
                </div>
            `;
            
            const trigger = document.getElementById("profile-dropdown-trigger");
            const menu = document.getElementById("profile-dropdown-menu");
            
            trigger.addEventListener("click", (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === "flex" ? "none" : "flex";
            });
            
            document.addEventListener("click", () => {
                menu.style.display = "none";
            });
            
            document.getElementById("nav-my-wallet").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                menu.style.display = "none";
                openWalletModal();
            });
            
            document.getElementById("dropdown-logout").addEventListener("click", (e) => {
                e.preventDefault();
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("current_user");
                window.location.reload();
            });
        }
    }
    updateAuthUI();

    // ========================================
    // 1. STATE MANAGEMENT & VARIABLES
    // ========================================
    let allListings = [];
    let currentCategory = "All";
    let userLocation = null; // { lat, lon, city }
    let filteredListings = [];
    let visibleCount = 20;
    let searchQuery = ''; // tracks what the user actually typed — kept separate from locationInput.value
    
    // DOM Elements
    const listingsGrid = document.getElementById("listings-grid");
    const categoryFilters = document.getElementById("category-filters");
    const autoLocateBtn = document.getElementById("auto-locate-btn");
    const locationInput = document.getElementById("location-input");
    const toastContainer = document.getElementById("toast-container");

    // Modal Elements
    const bookingModal = document.getElementById("booking-modal");
    const proModal = document.getElementById("pro-modal");
    
    // Booking Form Elements
    const bookingForm = document.getElementById("booking-form");
    const bookingStart = document.getElementById("booking-start");
    const bookingEnd = document.getElementById("booking-end");

    // Currently active interaction contexts
    let activeBookingListingId = null;

    // ========================================
    // 2. INITIALIZATION (IIFE-like start)
    // ========================================
    init();

    async function init() {
        // Load data from Local Storage (using JSON parsing)
        await fetchListings();
        
        // Render initial UI state
        renderListings(allListings);

        // Setup Event Listeners
        setupEventListeners();
        
        // Set minimum datetime for booking form
        const now = new Date();
        const formatForDatetimeLocal = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${y}-${m}-${d}T${hh}:${mm}`;
        };
        bookingStart.min = formatForDatetimeLocal(now);
        bookingEnd.min = formatForDatetimeLocal(now);
    }

    // ========================================
    // 3. DATA FETCHING & MOCKING
    // ========================================
    /**
     * Fetches listings from localStorage.
     * If empty, injects some default mock data to demonstrate the UI.
     */
    async function fetchListings() {
        const stored = localStorage.getItem('RentFlow_listings');
        if (stored) {
            try {
                allListings = JSON.parse(stored);
                // If local storage has fewer than 200 items, auto-seed them from central API (products.json)
                if (allListings.length < 200) {
                    const response = await fetch('../js/products.json');
                    if (response.ok) {
                        const apiListings = await response.json();
                        const existingIds = new Set(allListings.map(item => item.id));
                        const newItems = apiListings.filter(item => !existingIds.has(item.id));
                        if (newItems.length > 0) {
                            allListings = [...newItems, ...allListings];
                            localStorage.setItem('RentFlow_listings', JSON.stringify(allListings));
                        }
                    }
                }

                // Data Migration: Add mock addresses for cached listings that don't have them
                let migrationNeeded = false;
                const colonies = {
                  'Delhi NCR': ['Connaught Place', 'Defense Colony', 'Vasant Vihar', 'Saket', 'Cyber City, Gurugram', 'Sector 62, Noida'],
                  'Pune': ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Baner', 'Hinjewadi', 'Magarpatta'],
                  'Hyderabad': ['Banjara Hills', 'Jubilee Hills', 'HITEC City', 'Gachibowli', 'Kondapur', 'Madhapur'],
                  'Ahmedabad': ['Vastrapur', 'Satellite', 'Bodakdev', 'Prahlad Nagar', 'Navrangpura', 'Thaltej'],
                  'Chandigarh': ['Sector 17', 'Sector 8', 'Sector 9', 'Sector 35', 'Sector 43', 'IT Park'],
                  'Goa': ['Panaji', 'Calangute', 'Baga', 'Anjuna', 'Vagator', 'Margao'],
                  'Indore': ['Vijay Nagar', 'Palasia', 'Bhawarkua', 'Rajendra Nagar', 'LIG Colony', 'Saket Nagar'],
                  'Mumbai': ['Bandra West', 'Andheri West', 'Juhu', 'Powai', 'Colaba', 'Lower Parel'],
                  'Bangalore': ['Koramangala', 'Indiranagar', 'Whitefield', 'HSR Layout', 'Jayanagar', 'Malleswaram'],
                  'Chennai': ['Adyar', 'Besant Nagar', 'T. Nagar', 'Anna Nagar', 'Velachery', 'OMR'],
                  'Kolkata': ['Salt Lake', 'New Town', 'Ballygunge', 'Alipore', 'Park Street', 'Jodhpur Park'],
                  'Jaipur': ['Malviya Nagar', 'Vaishali Nagar', 'C-Scheme', 'Mansarovar', 'Bapu Nagar', 'Raja Park'],
                  'Kochi': ['Marine Drive', 'Kakkanad', 'Edappally', 'Panampilly Nagar', 'Fort Kochi', 'Vyttila'],
                  'Lucknow': ['Gomti Nagar', 'Aliganj', 'Hazratganj', 'Indira Nagar', 'Mahanagar', 'Ashiyana'],
                  'Surat': ['Vesu', 'Adajan', 'Piplod', 'City Light', 'Athwa', 'Varachha']
                };

                allListings.forEach(item => {
                    if (item.seller && !item.seller.address) {
                        const city = item.seller.city;
                        if (colonies[city]) {
                            const randomColony = colonies[city][Math.floor(Math.random() * colonies[city].length)];
                            item.seller.address = `${randomColony}, ${city}`;
                        } else {
                            item.seller.address = `Main Market, ${city || 'Unknown'}`;
                        }
                        migrationNeeded = true;
                    }
                });

                if (migrationNeeded) {
                    localStorage.setItem('RentFlow_listings', JSON.stringify(allListings));
                }

            } catch (e) {
                console.error("Error parsing listings", e);
                allListings = getMockListings();
            }
        } else {
            try {
                const response = await fetch('../js/products.json');
                if (response.ok) {
                    allListings = await response.json();
                } else {
                    allListings = getMockListings();
                }
            } catch (e) {
                allListings = getMockListings();
            }
            // Save mock data back to local storage for persistence
            localStorage.setItem('RentFlow_listings', JSON.stringify(allListings));
        }

        // Ensure every listing has mock coordinates for distance calculation
        allListings = allListings.map(listing => {
            if (!listing.lat || !listing.lon) {
                // Mock random coordinates around India
                return {
                    ...listing,
                    lat: 19.0760 + (Math.random() - 0.5) * 5,
                    lon: 72.8777 + (Math.random() - 0.5) * 5
                };
            }
            return listing;
        });
    }

    // ========================================
    // 4. DOM RENDER & HIGHER-ORDER FUNCTIONS
    // ========================================
    /**
     * Renders listing cards to the grid.
     * Uses Array.prototype.map() to generate HTML strings dynamically.
     * @param {Array} listings - The array of listing objects to render
     */
    function renderListings(listings) {
        if (listings.length === 0) {
            listingsGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #8b93a1;">
                    <p>No rentals found matching your criteria.</p>
                </div>
            `;
            return;
        }

        const isPro = checkProStatus();

        const visibleListings = listings.slice(0, visibleCount);

        // Using map() to transform object data into DOM HTML
        listingsGrid.innerHTML = visibleListings.map(item => {
            const initial = item.seller?.name?.charAt(0).toUpperCase() || 'S';
            let distanceHtml = '';
            
            // If user location is known, calculate distance
            if (userLocation && item.lat && item.lon) {
                const dist = calculateDistance(userLocation.lat, userLocation.lon, item.lat, item.lon);
                distanceHtml = `
                    <div class="card-distance-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${dist.toFixed(1)} km
                    </div>
                `;
            }

            // Construct contact display based on PRO status
            const contactDisplay = isPro 
                ? (item.seller?.phone || 'Contact Available')
                : 'Unlock Contact (Pro)';
            
            const contactClass = isPro ? 'text-green-500' : 'text-blue-400 cursor-pointer unlock-trigger';

            return `
                <div class="listing-card" data-id="${item.id}">
                    <div class="card-image-wrapper">
                        <img src="${item.images?.[0] || 'https://via.placeholder.com/400x300'}" alt="${item.title}" class="card-image" style="cursor: pointer;" onclick="window.openDetailsModal('${item.id}')" />
                        <div class="card-category-badge">${item.category}</div>
                        ${distanceHtml}
                    </div>
                    <div class="card-body">
                        <h3 class="card-title" style="cursor: pointer;" onclick="window.openDetailsModal('${item.id}')">${item.title}</h3>
                        <p class="card-desc">${item.description || 'No description provided.'}</p>
                        <p class="card-address" style="color: #8b93a1; font-size: 0.85rem; margin-top: 5px;">
                            📍 ${item.seller?.address || 'Location unavailable'}
                        </p>
                        
                        <div class="card-lender-info">
                            <div class="lender-avatar">${initial}</div>
                            <div class="lender-details">
                                <h5>${item.seller?.name || 'Verified Owner'}</h5>
                                <p class="${contactClass}">${contactDisplay}</p>
                            </div>
                        </div>

                        <div class="card-footer">
                            <div class="card-price">
                                ₹${item.price.toLocaleString('en-IN')}<span>/${item.period}</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn-book" onclick="window.openBookingModal('${item.id}')" style="width: 100%;">Book</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (listings.length > visibleCount) {
            listingsGrid.innerHTML += `
                <div style="grid-column: 1 / -1; text-align: center; margin-top: 20px;">
                    <button id="show-more-btn" class="btn-secondary" style="padding: 10px 20px; cursor: pointer;">Show More</button>
                </div>
            `;
            document.getElementById('show-more-btn').addEventListener('click', () => {
                visibleCount += 20;
                renderListings(listings);
            });
        }

        // Attach event listeners to unlock triggers (Pro gate)
        document.querySelectorAll('.unlock-trigger').forEach(el => {
            el.addEventListener('click', () => {
                proModal.classList.add('show');
            });
        });
    }

    // ========================================
    // 5. EVENT DELEGATION & HANDLING
    // ========================================
    function setupEventListeners() {
        // Category Filtering
        categoryFilters.addEventListener("click", (e) => {
            if (e.target.classList.contains("category-pill")) {
                // Update active class styling
                document.querySelectorAll(".category-pill").forEach(p => p.classList.remove("active"));
                e.target.classList.add("active");
                
                // Update state and re-render
                currentCategory = e.target.getAttribute("data-category");
                filterAndSortListings();
            }
        });

        // Location Search Input Filtering
        if (locationInput) {
            locationInput.addEventListener("input", () => {
                searchQuery = locationInput.value.toLowerCase().trim();
                filterAndSortListings();
            });
        }

        // Location Auto-Detect (Promises, Async/Await, Fetch API)
        autoLocateBtn.addEventListener("click", handleAutoLocate);

        // Modal Close Buttons
        document.getElementById("close-booking-modal").addEventListener("click", () => bookingModal.classList.remove("show"));
        document.getElementById("close-pro-modal").addEventListener("click", () => proModal.classList.remove("show"));
        
        // Close modals on outside click
        document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop) {
                    backdrop.classList.remove("show");
                }
            });
        });

        // Booking Form Logic
        bookingStart.addEventListener("change", updateBookingCalculations);
        bookingEnd.addEventListener("change", updateBookingCalculations);
        bookingForm.addEventListener("submit", handleBookingSubmit);
    }

    // ========================================
    // 6. ASYNC/AWAIT & FETCH API (GEOCODING)
    // ========================================
    /**
     * Handles the "Locate Me" button click.
     * Uses Geolocation API to get coordinates, then Fetch API to reverse geocode via Nominatim.
     */
    async function handleAutoLocate() {
        if (!navigator.geolocation) {
            showToast("Geolocation is not supported by your browser.", "error");
            return;
        }

        autoLocateBtn.textContent = "Locating...";
        autoLocateBtn.disabled = true;

        try {
            // Promisify geolocation to use with async/await
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
            });

            const { latitude, longitude } = position.coords;
            userLocation = { lat: latitude, lon: longitude };

            // Fetch API call to OpenStreetMap Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
            
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            const preciseLocation = data.display_name ? data.display_name.split(",").slice(0, 3).join(",").trim() : "Unknown Location";
            
            // Show the detected location as placeholder text only.
            // Do NOT put it in .value — that would make filterAndSortListings treat
            // it as a text search query and exclude all listings whose address doesn't
            // contain the exact geocoded string.  Instead, keep the input empty so the
            // text filter is skipped and only the distance sort (below) takes effect,
            // showing the nearest available listings even if none are in the exact area.
            locationInput.value = "";
            locationInput.placeholder = `📍 ${preciseLocation}`;
            showToast(`Location detected: ${preciseLocation}`);
            
            // Re-render sorted by nearest distance (userLocation is already set above)
            filterAndSortListings();

        } catch (error) {
            console.error("Location error:", error);
            showToast("Failed to detect location.", "error");
        } finally {
            autoLocateBtn.textContent = "Locate Me";
            autoLocateBtn.disabled = false;
        }
    }

    /**
     * Filters listings by category and sorts them by distance if location is known.
     * Uses Array.prototype.filter() and Array.prototype.sort().
     *
     * searchQuery — set only when the user types in the input — determines WHAT listings appear.
     * userLocation — set only by Locate Me — determines HOW matching listings are ranked by distance.
     * These two concerns are fully independent:
     *   • Search with no location  → matching listings in default order
     *   • Location with no search  → all listings sorted nearest-first
     *   • Search + location        → matching listings sorted nearest-first
     */
    function filterAndSortListings() {
        // Use the tracked typed query, NOT locationInput.value.
        // locationInput.value may contain a geocoded place label written by Locate Me,
        // which must never be treated as a text search filter.
        const query = searchQuery;

        filteredListings = allListings.filter(item => {
            if ((item.status || '').toLowerCase() === 'blocked') return false;
            const matchesCategory = currentCategory === "All" || item.category === currentCategory;
            const matchesLocation = !query ||
                (item.title || '').toLowerCase().includes(query) ||
                (item.description || '').toLowerCase().includes(query) ||
                (item.seller?.address || '').toLowerCase().includes(query) ||
                (item.seller?.city || '').toLowerCase().includes(query);
            return matchesCategory && matchesLocation;
        });

        visibleCount = 20;

        if (userLocation) {
            // Sort by distance (closest first).
            // This only re-orders whatever the text filter already passed through —
            // it never adds listings that were excluded by the search query.
            filteredListings.sort((a, b) => {
                const distA = calculateDistance(userLocation.lat, userLocation.lon, a.lat, a.lon);
                const distB = calculateDistance(userLocation.lat, userLocation.lon, b.lat, b.lon);
                return distA - distB;
            });
        }

        renderListings(filteredListings);
    }

    // ========================================
    // 7. MATHEMATICAL UTILITIES
    // ========================================
    /**
     * Haversine formula to calculate distance between two coordinates in kilometers.
     */
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1); 
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    // ========================================
    // 8. MODAL LOGIC & FORM HANDLING
    // ========================================
    
    // Make functions globally accessible for inline onclick handlers
    window.openDetailsModal = function(listingId) {
        const listing = allListings.find(l => l.id === listingId);
        if (!listing || (listing.status || '').toLowerCase() === 'blocked') {
            showToast("This listing is unavailable.", "error");
            return;
        }

        const isPro = checkProStatus();
        const contactDisplay = isPro 
            ? (listing.seller?.phone || 'Contact Available')
            : 'Unlock Contact (Pro)';
        const contactClass = isPro ? 'text-green-500' : 'text-blue-400 cursor-pointer unlock-trigger';
        const initial = listing.seller?.name?.charAt(0).toUpperCase() || 'S';

        // Build valid images array (filter out null/empty/invalid entries)
        const rawImages = Array.isArray(listing.images) ? listing.images : [];
        const validImages = rawImages.filter(img => img && typeof img === 'string' && img.trim() !== '');
        const images = validImages.length > 0 ? validImages : ['https://via.placeholder.com/400x300'];

        // Build carousel slides HTML
        const slidesHtml = images.map((img, idx) => `
            <div class="rdl-carousel-slide" data-index="${idx}">
                <img src="${img}" alt="${listing.title} - image ${idx + 1}" class="rdl-carousel-img" />
            </div>
        `).join('');

        // Build pagination dots HTML
        const dotsHtml = images.map((_, idx) => `
            <button class="rdl-dot${idx === 0 ? ' rdl-dot-active' : ''}" data-dot="${idx}" aria-label="Go to image ${idx + 1}"></button>
        `).join('');

        // Build nav arrows (only shown if more than 1 image)
        const navHtml = images.length > 1 ? `
            <button class="rdl-nav rdl-nav-prev" id="rdl-prev" aria-label="Previous image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="rdl-nav rdl-nav-next" id="rdl-next" aria-label="Next image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        ` : '';

        const content = `
            <div class="rdl-carousel-wrapper">
                <div class="rdl-carousel-track" id="rdl-track">
                    ${slidesHtml}
                </div>
                ${navHtml}
                ${images.length > 1 ? `<div class="rdl-dots-row" id="rdl-dots">${dotsHtml}</div>` : ''}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px;">
                <h2 style="font-size: 1.25rem; font-weight: 700;">${listing.title}</h2>
                <div style="background:var(--blue); color:#fff; padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:600;">${listing.category}</div>
            </div>
            <p style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 16px;">₹${listing.price.toLocaleString('en-IN')}<span style="color: #8b93a1; font-size: 0.9rem; font-weight: 500;">/${listing.period}</span></p>
            <p style="color: #8b93a1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 20px;">${listing.description || 'No description provided.'}</p>
            
            <p style="color: #8b93a1; font-size: 0.95rem; margin-bottom: 20px;">📍 ${listing.seller?.address || 'Location unavailable'}</p>
            
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; display:flex; align-items:center; gap: 12px; margin-bottom: 20px;">
                <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff;">${initial}</div>
                <div>
                    <h5 style="margin:0; font-size: 0.95rem;">${listing.seller?.name || 'Verified Owner'}</h5>
                    <p style="margin:4px 0 0; font-size:0.85rem;" class="${contactClass}">${contactDisplay}</p>
                </div>
            </div>
            
            <button class="btn-primary-full" onclick="document.getElementById('product-details-modal').classList.remove('show'); window.openBookingModal('${listing.id}');">Book Now</button>
        `;

        document.getElementById("details-modal-content").innerHTML = content;
        
        // Re-attach unlock-trigger logic for modal
        document.querySelectorAll('#details-modal-content .unlock-trigger').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('pro-modal').classList.add('show');
            });
        });

        // Initialize carousel
        initDetailsCarousel(images.length);

        document.getElementById("product-details-modal").classList.add("show");
    };

    /**
     * Initializes the image carousel inside the product details modal.
     * Handles click/drag (mouse + trackpad) navigation, arrow buttons, and dot indicators.
     * @param {number} total - Total number of valid images
     */
    function initDetailsCarousel(total) {
        if (total <= 1) return; // Nothing to do for single image

        const track = document.getElementById('rdl-track');
        const prevBtn = document.getElementById('rdl-prev');
        const nextBtn = document.getElementById('rdl-next');
        const dotsContainer = document.getElementById('rdl-dots');
        let current = 0;

        function goTo(index) {
            // Clamp to valid range
            if (index < 0) index = 0;
            if (index >= total) index = total - 1;
            current = index;
            track.style.transform = `translateX(-${current * 100}%)`;

            // Update dots
            if (dotsContainer) {
                dotsContainer.querySelectorAll('.rdl-dot').forEach((dot, i) => {
                    dot.classList.toggle('rdl-dot-active', i === current);
                });
            }
        }

        // Arrow button listeners
        if (prevBtn) prevBtn.addEventListener('click', () => goTo(current - 1));
        if (nextBtn) nextBtn.addEventListener('click', () => goTo(current + 1));

        // Dot click listeners
        if (dotsContainer) {
            dotsContainer.querySelectorAll('.rdl-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    goTo(parseInt(dot.getAttribute('data-dot'), 10));
                });
            });
        }

        // Mouse drag / trackpad swipe support
        let dragStartX = 0;
        let isDragging = false;

        track.addEventListener('mousedown', (e) => {
            dragStartX = e.clientX;
            isDragging = true;
            track.style.cursor = 'grabbing';
        });

        track.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            // Prevent text selection while dragging
            e.preventDefault();
        });

        track.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            track.style.cursor = 'grab';
            const delta = e.clientX - dragStartX;
            if (Math.abs(delta) > 40) {
                goTo(delta < 0 ? current + 1 : current - 1);
            }
        });

        track.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                track.style.cursor = 'grab';
            }
        });

        // Touch / trackpad swipe support
        let touchStartX = 0;
        track.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        track.addEventListener('touchend', (e) => {
            const delta = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(delta) > 40) {
                goTo(delta < 0 ? current + 1 : current - 1);
            }
        }, { passive: true });
    }

    window.openBookingModal = function(listingId) {
        const listing = allListings.find(l => l.id === listingId);
        if (!listing || (listing.status || '').toLowerCase() === 'blocked') {
            showToast("This listing is blocked and cannot be booked.", "error");
            return;
        }

        activeBookingListingId = listingId;
        
        document.getElementById("booking-item-title").textContent = listing.title;
        document.getElementById("booking-item-id").value = listing.id;
        document.getElementById("booking-item-price").value = listing.price;
        document.getElementById("booking-item-deposit").value = listing.securityDeposit || Math.round(listing.price * 0.1);
        
        // Reset form & set defaults
        bookingForm.reset();
        
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0); // round to next 30 mins
        
        const formatForDatetimeLocal = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            return `${y}-${m}-${d}T${hh}:${mm}`;
        };
        
        bookingStart.value = formatForDatetimeLocal(now);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        bookingEnd.value = formatForDatetimeLocal(tomorrow);
        
        document.getElementById("calc-rate-display").textContent = "₹" + listing.price;
        updateBookingCalculations();

        bookingModal.classList.add("show");
    };

    function calculateRentalDuration(start, end) {
        if (!start || !end || start >= end) {
            return { hours: 0, days: 0, chargedDays: 0, description: '' };
        }
        const diffMs = end - start;
        const totalHours = diffMs / (1000 * 60 * 60);
        const fullDays = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;
        
        let chargedDays = 0;
        if (fullDays === 0) {
            chargedDays = remainingHours < 12 ? 0.5 : 1.0;
        } else {
            if (remainingHours === 0) {
                chargedDays = fullDays;
            } else if (remainingHours < 12) {
                chargedDays = fullDays + 0.5;
            } else {
                chargedDays = fullDays + 1.0;
            }
        }
        
        // Create user-friendly description
        let desc = '';
        if (fullDays > 0) {
            desc += `${fullDays} day${fullDays > 1 ? 's' : ''}`;
            if (remainingHours > 0) {
                const roundedHours = Math.round(remainingHours * 10) / 10;
                desc += `, ${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
            }
        } else {
            const roundedHours = Math.round(totalHours * 10) / 10;
            desc = `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
        }
        
        return {
            hours: totalHours,
            days: fullDays,
            chargedDays: chargedDays,
            description: desc
        };
    }

    function updateBookingCalculations() {
        const start = new Date(bookingStart.value);
        const end = new Date(bookingEnd.value);
        const now = new Date();
        const price = parseFloat(document.getElementById("booking-item-price").value);
        const deposit = parseFloat(document.getElementById("booking-item-deposit").value);
        const errorEl = document.getElementById("booking-validation-error");
        const submitBtn = bookingForm.querySelector("button[type='submit']");

        // Reset state
        if (errorEl) {
            errorEl.style.display = "none";
            errorEl.textContent = "";
        }
        if (submitBtn) {
            submitBtn.disabled = false;
        }

        let isValid = true;

        if (bookingStart.value && bookingEnd.value) {
            // Check if start time is in the past (allow 1 minute buffer)
            if (start.getTime() < now.getTime() - 60000) {
                if (errorEl) {
                    errorEl.style.display = "block";
                    errorEl.textContent = "⚠️ Start time cannot be in the past.";
                }
                if (submitBtn) submitBtn.disabled = true;
                isValid = false;
            }
            // Check if end time is in the past
            else if (end.getTime() < now.getTime()) {
                if (errorEl) {
                    errorEl.style.display = "block";
                    errorEl.textContent = "⚠️ End time cannot be earlier than actual (current) time.";
                }
                if (submitBtn) submitBtn.disabled = true;
                isValid = false;
            }
            // Check if end time is earlier than or equal to start time
            else if (end.getTime() <= start.getTime()) {
                if (errorEl) {
                    errorEl.style.display = "block";
                    errorEl.textContent = "⚠️ End time must be after the start time.";
                }
                if (submitBtn) submitBtn.disabled = true;
                isValid = false;
            }
        } else {
            isValid = false;
        }

        if (isValid) {
            const durationObj = calculateRentalDuration(start, end);
            const chargedDays = durationObj.chargedDays;
            const subtotal = chargedDays * price;
            const total = subtotal + deposit;

            const descRow = document.getElementById("duration-desc-row");
            const descEl = document.getElementById("calc-duration-desc");
            if (descRow && descEl) {
                descRow.style.display = "flex";
                descEl.textContent = `${durationObj.description} (Charged as ${chargedDays} day${chargedDays !== 1 ? 's' : ''})`;
            }

            document.getElementById("calc-days").textContent = chargedDays;
            document.getElementById("calc-subtotal").textContent = "₹" + subtotal.toLocaleString('en-IN');
            document.getElementById("calc-deposit").textContent = "₹" + deposit.toLocaleString('en-IN');
            document.getElementById("calc-total").textContent = "₹" + total.toLocaleString('en-IN');
        } else {
            const descRow = document.getElementById("duration-desc-row");
            if (descRow) descRow.style.display = "none";
            
            document.getElementById("calc-days").textContent = "0";
            document.getElementById("calc-subtotal").textContent = "₹0";
            document.getElementById("calc-total").textContent = "₹0";
        }
    }

    function handleBookingSubmit(e) {
        e.preventDefault();
        
        const start = bookingStart.value;
        const end = bookingEnd.value;
        const days = parseFloat(document.getElementById("calc-days").textContent);
        
        if (days <= 0 || isNaN(days)) {
            showToast("Invalid date range selected.", "error");
            return;
        }

        const listing = allListings.find(l => l.id === activeBookingListingId);
        if (!listing || (listing.status || '').toLowerCase() === 'blocked') {
            showToast("This listing is blocked and cannot be booked.", "error");
            return;
        }

        // Construct Booking Object
        const deposit = listing.securityDeposit || Math.round(listing.price * 0.1);
        const subtotal = listing.price * days;
        const grandTotal = subtotal + deposit;

        const currentUser = JSON.parse(localStorage.getItem('current_user'));
        const renterEmail = currentUser ? currentUser.useremail : 'guest@example.com';

        const bookingRecord = {
            id: 'BKG-' + Date.now(),
            listingId: listing.id,
            itemTitle: listing.title,
            itemImage: listing.images?.[0] || 'https://via.placeholder.com/400x300',
            lenderName: listing.seller?.name || 'Verified Owner',
            renterEmail: renterEmail,
            startDate: start,
            endDate: end,
            duration: days,
            rate: listing.price,
            subtotal: subtotal,
            deposit: deposit,
            platformFee: 0,
            grandTotal: grandTotal,
            status: 'Pending', // Default status upon creation
            createdAt: new Date().toISOString()
        };

        // Save to Local Storage (Array manipulation)
        let bookings = [];
        try {
            bookings = JSON.parse(localStorage.getItem('rentflow_bookings')) || [];
        } catch(e) {}
        
        bookings.unshift(bookingRecord); // Add to beginning of array
        localStorage.setItem('rentflow_bookings', JSON.stringify(bookings));

        bookingModal.classList.remove("show");
        showToast("Booking request sent successfully! Check My Rentals.");
    }



    // ========================================
    // 10. UTILITIES
    // ========================================
    function checkProStatus() {
        try {
            const user = JSON.parse(localStorage.getItem('current_user'));
            if (!user) return false;
            if (user.isPremium || user.isPro) {
                if (user.premiumExpiryDate) {
                    const expiry = new Date(user.premiumExpiryDate);
                    const now = new Date();
                    if (now > expiry) {
                        user.isPremium = false;
                        user.isPro = false;
                        localStorage.setItem('current_user', JSON.stringify(user));
                        let allUsers = JSON.parse(localStorage.getItem('user')) || [];
                        const userIndex = allUsers.findIndex(u => u.useremail === user.useremail);
                        if (userIndex !== -1) {
                            allUsers[userIndex].isPremium = false;
                            allUsers[userIndex].isPro = false;
                            localStorage.setItem('user', JSON.stringify(allUsers));
                        }
                        showToast("Your Premium subscription has expired. Phone numbers are hidden.", "error");
                        return false;
                    }
                }
                return true;
            }
            return false;
        } catch(e) {
            return false;
        }
    }

    function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = "toast";
        
        const iconHtml = type === "success" 
            ? `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

        toast.innerHTML = `${iconHtml} <span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add("show"), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 400); // wait for transition
        }, 3000);
    }

    function getMockListings() {
        return [
            {
                id: 'LIST-MOCK-1',
                title: 'Apple MacBook Pro M3 (16-inch)',
                category: 'Electronics',
                price: 500,
                period: 'day',
                description: 'Perfect for heavy video editing. Comes with charger and carrying case.',
                seller: { name: 'Aryan Tyagi', phone: '+91 99999 88888', city: 'Delhi NCR' },
                images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 2000,
                lat: 28.6139, lon: 77.2090
            },
            {
                id: 'LIST-MOCK-2',
                title: 'Sony A7S III Mirrorless Camera',
                category: 'Electronics',
                price: 350,
                period: 'day',
                description: 'Low light monster. Includes 3 batteries and a 64GB fast SD card.',
                seller: { name: 'Priya Sharma', phone: '+91 91234 56789', city: 'Mumbai' },
                images: ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 1500,
                lat: 19.0760, lon: 72.8777
            },
            {
                id: 'LIST-MOCK-3',
                title: 'DJI Mavic 3 Pro Drone',
                category: 'Electronics',
                price: 600,
                period: 'day',
                description: 'Triple camera system. Fly More Combo. Only renting to experienced pilots.',
                seller: { name: 'Kabir Singh', phone: '+91 98765 12345', city: 'Bangalore' },
                images: ['https://images.unsplash.com/photo-1579829366248-204fe8413f31?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 3000,
                lat: 12.9716, lon: 77.5946
            },
            {
                id: 'LIST-MOCK-4',
                title: 'Bosch Power Drill Set',
                category: 'Tools',
                price: 150,
                period: 'day',
                description: 'Complete set with all drill bits. Ideal for DIY home projects.',
                seller: { name: 'Ravi Kumar', phone: '+91 99887 77665', city: 'Pune' },
                images: ['https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80'],
                securityDeposit: 500,
                lat: 18.5204, lon: 73.8567
            }
        ];
    }
});
