'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const Listing = require('../models/Listing');
const User = require('../models/User');

const CONDITIONS = [
    { tier: 'like-new', label: 'Like New (Flawless / Barely Used)' },
    { tier: 'brand-new', label: 'Brand New (Unopened / In Box)' },
    { tier: 'good', label: 'Good (Fully Functional, Minor Wear)' }
];

async function syncListings() {
    try {
        console.log('[Sync] Starting MongoDB listings sync & deduplication...');

        // 1. Ensure verified provider user exists in MongoDB
        let providerUser = await User.findOne({ email: 'catalog.provider@rentflow.com' });
        if (!providerUser) {
            const passwordHash = await bcrypt.hash('ProviderSecurePass@2026', 10);
            providerUser = await User.create({
                name: 'RentFlow Verified Provider',
                email: 'catalog.provider@rentflow.com',
                passwordHash,
                role: 'user',
                isPro: true,
                avatar: ''
            });
            console.log('[Sync] Created verified catalog provider user:', providerUser._id);
        }

        // 2. Clean up existing duplicates in MongoDB
        const allDbListings = await Listing.find().sort({ createdAt: -1 });
        const seenSignatures = new Set();
        let removedDuplicates = 0;
        let removedBrokenImages = 0;

        for (const doc of allDbListings) {
            const titleNorm = (doc.title || '').trim().toLowerCase();
            const catNorm = (doc.category || '').trim().toLowerCase();
            const sig = `${titleNorm}|${catNorm}`;

            // Check if local upload image actually exists on disk
            let hasBrokenImage = false;
            if (doc.image && doc.image.startsWith('/uploads')) {
                const localPath = path.join(__dirname, '..', doc.image.replace(/^\//, ''));
                if (!fs.existsSync(localPath)) {
                    hasBrokenImage = true;
                }
            }

            if (hasBrokenImage) {
                await Listing.deleteOne({ _id: doc._id });
                removedBrokenImages++;
                continue;
            }

            if (seenSignatures.has(sig)) {
                // Duplicate of an already kept newer listing
                await Listing.deleteOne({ _id: doc._id });
                removedDuplicates++;
            } else {
                seenSignatures.add(sig);
            }
        }

        if (removedDuplicates > 0 || removedBrokenImages > 0) {
            console.log(`[Sync] Cleaned up ${removedDuplicates} duplicate listings and ${removedBrokenImages} broken image listings from MongoDB.`);
        }

        // 3. Load catalog products
        const catalogPath = path.resolve(__dirname, '../data/products.json');
        if (!fs.existsSync(catalogPath)) {
            console.warn('[Sync] Catalog file not found at:', catalogPath);
            return;
        }

        const raw = fs.readFileSync(catalogPath, 'utf8');
        const catalogData = JSON.parse(raw);

        let insertedCount = 0;
        let skippedExisting = 0;

        for (let i = 0; i < catalogData.length; i++) {
            const item = catalogData[i];
            let category = item.category;
            if (category === 'Real Estate' || category === 'Furniture') category = 'Property';
            if (category === 'Equipment') category = 'Tools';
            if (category === 'Party') category = 'Sports';

            const title = (item.title || '').trim();
            const titleNorm = title.toLowerCase();
            const sig = `${titleNorm}|${category.toLowerCase()}`;

            if (seenSignatures.has(sig)) {
                skippedExisting++;
                continue;
            }

            const condTier = CONDITIONS[i % CONDITIONS.length];
            const city = (item.seller && (item.seller.city || item.seller.address)) || 'Delhi NCR';
            const image = (Array.isArray(item.images) && item.images[0]) || item.image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80';

            const newDoc = new Listing({
                title: title.length >= 5 ? title : `${title} Rental`,
                category,
                condition: item.condition || condTier.tier,
                conditionLabel: item.conditionLabel || condTier.label,
                categorySpecs: item.categorySpecs || {},
                price: Number(item.price) >= 10 ? Number(item.price) : 500,
                period: item.period || 'day',
                description: item.description || '',
                amenities: [],
                owner: providerUser._id,
                city,
                status: 'Active',
                image,
                viewsCount: item.viewsCount || 0,
                isCatalog: true
            });

            await newDoc.save();
            seenSignatures.add(sig);
            insertedCount++;
        }

        const totalActive = await Listing.countDocuments({ status: 'Active' });
        console.log(`[Sync] Finished: Inserted ${insertedCount} catalog items into MongoDB (Skipped ${skippedExisting} existing). Total Active listings in MongoDB: ${totalActive}`);
        return { insertedCount, totalActive };
    } catch (err) {
        console.error('[Sync] Error syncing catalog listings:', err);
    }
}

module.exports = { syncListings };

if (require.main === module) {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
    const connectDB = require('../config/db');
    (async () => {
        await connectDB();
        await syncListings();
        process.exit(0);
    })();
}
