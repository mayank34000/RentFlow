/* ============================================================
   RentFlow – Edit Listing JS
   Loads a listing by ?id= from URL, lets admin edit safe
   fields only, and preserves status/id/seller on save.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const listingId = params.get('id');

    if (!listingId) {
        showEditStatus('No listing ID provided.', 'error');
        disableForm();
        return;
    }

    const listings = getListings();
    const listing = listings.find(l => l.id === listingId);

    if (!listing) {
        showEditStatus('Listing not found.', 'error');
        disableForm();
        return;
    }

    populateForm(listing);

    document.getElementById('edit-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveChanges(listingId);
    });
});

function populateForm(listing) {
    const idEl = document.getElementById('edit-listing-id');
    const sellerEl = document.getElementById('edit-seller-name');
    const statusBadge = document.getElementById('edit-current-status-badge');
    const blockedNotice = document.getElementById('edit-blocked-notice');

    if (idEl) idEl.textContent = listing.id;
    if (sellerEl) sellerEl.textContent = listing.seller?.name || '—';

    const status = listing.status || 'Unknown';
    if (statusBadge) {
        statusBadge.textContent = status.toUpperCase();
        if (status === 'Blocked') {
            statusBadge.className = 'badge badge-blocked';
            if (blockedNotice) blockedNotice.style.display = 'block';
        } else if (status === 'Active') {
            statusBadge.className = 'badge badge-low';
        } else {
            statusBadge.className = 'badge badge-orange';
        }
    }

    document.getElementById('edit-title').value = listing.title || '';
    document.getElementById('edit-category').value = listing.category || '';
    document.getElementById('edit-price').value = listing.price || '';
    document.getElementById('edit-period').value = listing.period || 'day';
    document.getElementById('edit-description').value = listing.description || '';
    document.getElementById('edit-city').value = listing.seller?.city || '';
}

function saveChanges(listingId) {
    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const price = parseFloat(document.getElementById('edit-price').value);
    const period = document.getElementById('edit-period').value;
    const description = document.getElementById('edit-description').value.trim();
    const city = document.getElementById('edit-city').value.trim();

    if (!title) {
        showEditStatus('Title is required.', 'error');
        return;
    }
    if (!price || price <= 0) {
        showEditStatus('A valid price is required.', 'error');
        return;
    }

    const allListings = getListings();
    const index = allListings.findIndex(l => l.id === listingId);

    if (index === -1) {
        showEditStatus('Listing no longer exists.', 'error');
        return;
    }

    // Spread existing listing first so id, status, seller email/phone,
    // previousStatus, and all metadata are preserved.
    allListings[index] = {
        ...allListings[index],
        title,
        category,
        price,
        period,
        description,
        seller: {
            ...allListings[index].seller,
            city
        },
        updatedAt: new Date().toISOString()
    };

    saveListings(allListings);
    dispatchStorageUpdate(STORAGE_KEYS.LISTINGS);

    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) saveBtn.disabled = true;

    showEditStatus('Listing updated successfully!', 'success');

    setTimeout(() => {
        window.history.back();
    }, 1400);
}

function showEditStatus(message, type) {
    const el = document.getElementById('edit-status-message');
    if (!el) return;
    el.textContent = message;
    el.className = type; // 'success' or 'error'
    el.style.display = 'block';
}

function disableForm() {
    const form = document.getElementById('edit-form');
    if (form) {
        form.querySelectorAll('input, select, textarea, button').forEach(el => {
            el.disabled = true;
        });
    }
}
