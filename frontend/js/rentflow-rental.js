(function () {
  const LISTING_KEY = 'RentFlow_listings';
  const BOOKING_KEY = 'rentflow_bookings';
  const CHAT_KEY = 'rentflow_chats';
  const PRO_KEY = 'rentflow_pro';
  const GEO_CACHE_KEY = 'rentflow_geo_cache';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (_) { return fallback; }
  }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function getListings() { return read(LISTING_KEY, []).filter(l => (l.status || 'Active').toLowerCase() === 'active'); }
  function getAllListings() { return read(LISTING_KEY, []); }
  function getBookings() { return read(BOOKING_KEY, []); }
  function saveBookings(items) { write(BOOKING_KEY, items); }
  function getChats() { return read(CHAT_KEY, {}); }
  function saveChats(items) { write(CHAT_KEY, items); }
  function getCurrentUser() {
    const current = read('current_user', null);
    if (current) return current;
    const users = read('user', []);
    return Array.isArray(users) ? users[0] || null : users;
  }
  function isPro() {
    const user = getCurrentUser();
    return !!(read(PRO_KEY, false) || user?.isPro || localStorage.getItem(PRO_KEY) === 'true');
  }
  function setPro() {
    write(PRO_KEY, true);
    const current = getCurrentUser();
    if (current) {
      current.isPro = true;
      localStorage.setItem('current_user', JSON.stringify(current));
      const users = read('user', []);
      if (Array.isArray(users)) {
        const i = users.findIndex(u => u.useremail === current.useremail);
        if (i >= 0) { users[i] = { ...users[i], isPro: true }; write('user', users); }
      }
    }
  }
  function normalizeListing(l) {
    const seller = typeof l.seller === 'object' && l.seller ? l.seller : { name: l.seller || 'Lender', phone: '', city: l.city || l.location || '' };
    return {
      ...l,
      title: l.title || l.name || 'Rental Item',
      category: l.category || 'Other',
      price: Number(l.price ?? l.basePrice ?? 0),
      period: l.period || 'day',
      description: l.description || l.desc || 'No description provided.',
      images: Array.isArray(l.images) ? l.images : (l.imageUrl ? [l.imageUrl] : []),
      seller: { name: seller.name || 'Lender', phone: seller.phone || '', city: seller.city || seller.location || '', latitude: seller.latitude ?? l.latitude ?? null, longitude: seller.longitude ?? l.longitude ?? null }
    };
  }
  function currency(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
  function daysBetween(start, end) { return Math.max(0, Math.ceil((new Date(end) - new Date(start)) / 86400000)); }
  function calculateBill(listing, start, end) {
    const days = daysBetween(start, end);
    const base = listing.price * days;
    const deposit = Math.round(base * 0.10 * 100) / 100;
    const commission = Math.round(base * 0.02 * 100) / 100;
    return { days, base, deposit, commission, platformFee: 0, grandTotal: base + deposit, lenderPayout: base - commission };
  }
  function overlaps(aStart, aEnd, bStart, bEnd) { return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd); }
  function listingAvailable(listingId, start, end) {
    return !getBookings().some(b => b.listingId === listingId && !['Cancelled', 'Rejected'].includes(b.status) && overlaps(start, end, b.startDate, b.endDate));
  }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function showToast(message, type='success') {
    let el = document.getElementById('rentflow-toast');
    if (!el) { el = document.createElement('div'); el.id = 'rentflow-toast'; el.className = 'toast'; document.body.appendChild(el); }
    el.className = `toast ${type}`; el.textContent = message; requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => el.classList.remove('show'), 3400);
  }
  async function nominatim(query, reverse=false) {
    const url = reverse
      ? `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${encodeURIComponent(query.lat)}&lon=${encodeURIComponent(query.lon)}`
      : `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Location service unavailable');
    const data = await res.json();
    return reverse ? data : data[0];
  }
  function locationLabel(data) {
    if (!data) return '';
    const a = data.address || {};
    return [a.suburb || a.neighbourhood, a.city || a.town || a.village || a.county, a.state].filter(Boolean).slice(0, 2).join(', ') || data.display_name?.split(',').slice(0,2).join(', ') || '';
  }
  function getGeoCache() { return read(GEO_CACHE_KEY, {}); }
  function saveGeo(key, value) { const c = getGeoCache(); c[key.toLowerCase()] = value; write(GEO_CACHE_KEY, c); }
  async function geocodeListing(listing) {
    const l = normalizeListing(listing);
    if (l.seller.latitude != null && l.seller.longitude != null) return { lat: Number(l.seller.latitude), lon: Number(l.seller.longitude) };
    const key = l.seller.city || '';
    if (!key) return null;
    const cached = getGeoCache()[key.toLowerCase()];
    if (cached) return cached;
    try {
      const result = await nominatim(key);
      if (!result) return null;
      const geo = { lat: Number(result.lat), lon: Number(result.lon) };
      saveGeo(key, geo);
      return geo;
    } catch (_) { return null; }
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const r = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  async function enrichDistances(listings, userGeo) {
    const out = [];
    for (const raw of listings) {
      const listing = normalizeListing(raw);
      let distance = null;
      if (userGeo) {
        const geo = await geocodeListing(listing);
        if (geo) distance = haversine(userGeo.lat, userGeo.lon, geo.lat, geo.lon);
      }
      out.push({ ...listing, distanceKm: distance });
    }
    return out.sort((a,b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }
  function distanceText(km) { return km == null ? 'Distance unavailable' : (km < 1 ? `${Math.round(km*1000)} m away` : `${km.toFixed(1)} km away`); }
  function createBooking(listing, startDate, endDate, bill) {
    if ((listing.status || '').toLowerCase() === 'blocked') {
      showToast('This listing is blocked and cannot be booked.', 'error');
      return null;
    }
    const user = getCurrentUser();
    const booking = {
      bookingId: 'RF-' + Date.now(), listingId: listing.id, renterId: user?.useremail || 'guest', renterName: user?.username || user?.name || 'Guest',
      lenderId: listing.seller?.name || 'lender', lenderName: listing.seller?.name || 'Lender', itemTitle: listing.title, image: listing.images?.[0] || '',
      startDate, endDate, totalDays: bill.days, baseRate: listing.price, subtotal: bill.base, securityDeposit: bill.deposit,
      platformFee: 0, siteCommission: bill.commission, grandTotal: bill.grandTotal, lenderPayout: bill.lenderPayout,
      status: 'Pending', adminStatus: 'Pending', lenderStatus: 'Pending', bookedAt: new Date().toISOString()
    };
    const bookings = getBookings(); bookings.unshift(booking); saveBookings(bookings);
    return booking;
  }
  window.RentFlowRental = { read, write, getListings, getAllListings, getBookings, saveBookings, getChats, saveChats, getCurrentUser, isPro, setPro, normalizeListing, currency, daysBetween, calculateBill, listingAvailable, escapeHtml, showToast, nominatim, locationLabel, getGeoCache, saveGeo, geocodeListing, haversine, enrichDistances, distanceText, createBooking };
})();
