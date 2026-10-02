'use strict';

/**
 * Builds a receipt email object from a Booking document.
 * 
 * @param {Object} booking - The populated Booking document.
 * @returns {Object|null} - { to, subject, text } or null if no email is found.
 */
exports.buildReceipt = (booking) => {
    if (!booking || !booking.renter) return null;

    const toEmail = booking.renter.email || booking.renter.useremail;
    if (!toEmail) return null;

    const renterName = booking.renter.name || booking.renter.username || 'Valued Renter';
    const lenderName = booking.lender ? (booking.lender.name || booking.lender.username || 'Valued Lender') : 'Lender';
    
    // Listing title might be available if listing is populated
    const listingTitle = booking.listing && booking.listing.title 
        ? booking.listing.title 
        : 'Rental Item';

    // Format subject safely (remove newlines to prevent header injection)
    const rawSubject = `RentFlow Receipt: ${listingTitle} (Booking #${booking._id})`;
    const safeSubject = rawSubject.replace(/[\r\n]+/g, ' ').trim();

    // Format dates to Asia/Kolkata
    const formatDate = (dateInput) => {
        if (!dateInput) return 'N/A';
        try {
            return new Intl.DateTimeFormat('en-IN', {
                timeZone: 'Asia/Kolkata',
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(new Date(dateInput));
        } catch (e) {
            return new Date(dateInput).toISOString();
        }
    };

    const startFmt = formatDate(booking.startDate);
    const endFmt = formatDate(booking.endDate);

    // Build plain text body
    const text = 
`Hi ${renterName},

Thank you for booking with RentFlow! Here is the receipt for your upcoming rental.

--- BOOKING DETAILS ---
Booking ID: ${booking._id}
Item: ${listingTitle}
Lender: ${lenderName}
Status: ${booking.status || 'Active'}

--- RENTAL PERIOD ---
Start: ${startFmt}
End:   ${endFmt}
Duration: ${booking.totalDays} day(s)

--- FINANCIAL SUMMARY ---
Price per Day: ₹${booking.pricePerDay}
Subtotal:      ₹${booking.subtotal}
Security Dep:  ₹${booking.securityDeposit}
-----------------------
TOTAL PAID:    ₹${booking.total}

If you have any questions, please contact the lender directly or reach out to RentFlow support.

Thank you,
The RentFlow Team
`;

    return {
        to: toEmail,
        subject: safeSubject,
        text: text
    };
};
