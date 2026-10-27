import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getListings, saveListing, deleteListing, getBookings, updateBookingStatus, processWalletSettlement } from './services/api';
import './styles/create-listing.css';
import Navbar from './components/Navbar';

export const CANONICAL_CATEGORIES = [
    { id: 'Electronics', label: 'Electronics & Gadgets' },
    { id: 'Vehicles', label: 'Vehicles & Transport' },
    { id: 'Fashion', label: 'Fashion & Wearables' },
    { id: 'Property', label: 'Property & Spaces' },
    { id: 'Sports', label: 'Sports & Adventure' },
    { id: 'Tools', label: 'Tools & Equipment' }
];

export const CATEGORY_CONDITIONS = {
    Electronics: [
        { tier: 'brand-new', label: 'Brand New (Unopened / In Box)' },
        { tier: 'like-new', label: 'Like New (Flawless / Barely Used)' },
        { tier: 'good', label: 'Good (Fully Functional, Minor Wear)' },
        { tier: 'fair', label: 'Fair (Working with Cosmetic Wear)' }
    ],
    Vehicles: [
        { tier: 'brand-new', label: 'Showroom Condition (< 1000 km)' },
        { tier: 'like-new', label: 'Excellent (Clean History & Interior)' },
        { tier: 'good', label: 'Good (Road-Ready, Maintained)' },
        { tier: 'fair', label: 'Fair (High Mileage / Daily Driver)' }
    ],
    Fashion: [
        { tier: 'brand-new', label: 'New with Tags' },
        { tier: 'like-new', label: 'Pristine (Worn Once or Twice)' },
        { tier: 'good', label: 'Great (Gently Worn, Clean)' },
        { tier: 'fair', label: 'Good (Minor Signs of Wear)' }
    ],
    Property: [
        { tier: 'brand-new', label: 'Newly Built / Renovated' },
        { tier: 'like-new', label: 'Excellent (Recently Upgraded)' },
        { tier: 'good', label: 'Well-Maintained (Standard Living)' },
        { tier: 'fair', label: 'Functional / Budget-Friendly' }
    ],
    Sports: [
        { tier: 'brand-new', label: 'Brand New Equipment' },
        { tier: 'like-new', label: 'Barely Used / Like New' },
        { tier: 'good', label: 'Good (Field & Match Ready)' },
        { tier: 'fair', label: 'Fair (Practice Grade)' }
    ],
    Tools: [
        { tier: 'brand-new', label: 'Brand New in Box' },
        { tier: 'like-new', label: 'Lightly Used / Clean & Sharp' },
        { tier: 'good', label: 'Heavy-Duty / Jobsite Ready' },
        { tier: 'fair', label: 'Fair (Well-Used, Fully Functional)' }
    ]
};

export const CATEGORY_FIELDS_CONFIG = {
    Electronics: [
        { key: 'brand', label: 'Brand', placeholder: 'e.g. Sony, Apple, Canon', type: 'text', required: true },
        { key: 'model', label: 'Model', placeholder: 'e.g. A7 IV, M2 Pro', type: 'text' },
        { key: 'accessories', label: 'Included Accessories', placeholder: 'e.g. Charger, 2 Batteries, Case', type: 'text' }
    ],
    Vehicles: [
        { key: 'fuelType', label: 'Fuel Type', type: 'select', options: ['Petrol', 'Diesel', 'Electric', 'Hybrid'], required: true },
        { key: 'transmission', label: 'Transmission', type: 'select', options: ['Automatic', 'Manual'], required: true },
        { key: 'mileage', label: 'Odometer / Mileage', placeholder: 'e.g. 15,000 km', type: 'text' }
    ],
    Fashion: [
        { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'], required: true },
        { key: 'gender', label: 'Gender / Department', type: 'select', options: ['Men', 'Women', 'Unisex', 'Kids'], required: true },
        { key: 'material', label: 'Material / Designer', placeholder: 'e.g. 100% Silk, Sabyasachi', type: 'text' }
    ],
    Property: [
        { key: 'propertyType', label: 'Property Type', type: 'select', options: ['Apartment', 'Studio', 'Villa', 'Commercial Space', 'Office'], required: true },
        { key: 'bedrooms', label: 'Bedrooms / Configuration', type: 'select', options: ['1 RK / Studio', '1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Commercial'], required: true },
        { key: 'furnishing', label: 'Furnishing Status', type: 'select', options: ['Fully Furnished', 'Semi-Furnished', 'Unfurnished'], required: true }
    ],
    Sports: [
        { key: 'gearType', label: 'Sport / Gear Category', type: 'select', options: ['Fitness & Gym', 'Cycling', 'Water Sports', 'Trekking & Camping', 'Cricket / Team Sports'], required: true },
        { key: 'skillLevel', label: 'Skill Level', type: 'select', options: ['Beginner', 'Intermediate', 'Professional', 'All Levels'] },
        { key: 'safetyGear', label: 'Safety Equipment Included', placeholder: 'e.g. Helmet, Knee Pads, Life Jacket', type: 'text' }
    ],
    Tools: [
        { key: 'powerSource', label: 'Power Source', type: 'select', options: ['Cordless Battery', 'Corded Electric', 'Gas-Powered', 'Manual Hand Tool'], required: true },
        { key: 'brand', label: 'Brand / Make', placeholder: 'e.g. Bosch, DeWalt, Makita', type: 'text' },
        { key: 'safetyGear', label: 'Protective Gear Included', type: 'select', options: ['Yes (Gloves / Goggles included)', 'No (Tool only)'] }
    ]
};

export default function CreateListing() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('Electronics');
    const [condition, setCondition] = useState('like-new');
    const [conditionLabel, setConditionLabel] = useState('Like New (Flawless / Barely Used)');
    const [categorySpecs, setCategorySpecs] = useState({});
    const [price, setPrice] = useState(1500);
    const [pricePeriod, setPricePeriod] = useState('month');
    const [autoRenew, setAutoRenew] = useState(true);
    const [description, setDescription] = useState('');
    const [sellerName, setSellerName] = useState('');
    const [sellerPhone, setSellerPhone] = useState('');
    const [sellerCity, setSellerCity] = useState('');
    const [imagePreview, setImagePreview] = useState('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80');
    const [imageFile, setImageFile] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const imagePreviewRef = useRef(null);
    const videoPreviewRef = useRef(null);

    // Keep refs in sync for unmount cleanup
    imagePreviewRef.current = imagePreview;
    videoPreviewRef.current = videoPreviewUrl;

    useEffect(() => {
        return () => {
            if (imagePreviewRef.current && imagePreviewRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreviewRef.current);
            }
            if (videoPreviewRef.current) {
                URL.revokeObjectURL(videoPreviewRef.current);
            }
        };
    }, []);
    
    // Amenities
    const [amenities, setAmenities] = useState({
        delivery: false,
        setup: false,
        protection: false,
        sanitized: false
    });
    
    // Modals & Feedback
    const [showSuccess, setShowSuccess] = useState(false);
    const [formError, setFormError] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    useEffect(() => {
        const currentUser = getAuthUser();
        if (!currentUser) {
            navigate('/login?redirect=/create-listing');
            return;
        }
        setUser(currentUser);
        setSellerName(currentUser.name || currentUser.username || '');
        const initialPhone = (currentUser.userphone || currentUser.phone || '').replace(/\D/g, '').slice(-10);
        setSellerPhone(initialPhone);
        setSellerCity(currentUser.address || currentUser.city || 'Delhi NCR');

    }, [navigate]);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                setFormError('Please select a valid image file (JPEG, PNG, or WebP).');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                setFormError('Item photo size cannot exceed 5 MB.');
                return;
            }
            if (imagePreview && imagePreview.startsWith('blob:')) {
                URL.revokeObjectURL(imagePreview);
            }
            const blobUrl = URL.createObjectURL(file);
            setImageFile(file);
            setImagePreview(blobUrl);
            setFormError('');
        }
    };

    const handleRemoveImage = () => {
        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImageFile(null);
        setImagePreview('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80');
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    const handleVideoUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['video/mp4', 'video/quicktime'];
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
            const allowedExts = ['.mp4', '.mov'];
            if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
                setFormError('Condition video must be an MP4 or MOV file.');
                return;
            }
            if (file.size > 100 * 1024 * 1024) {
                setFormError('Condition video cannot exceed 100 MB.');
                return;
            }
            if (videoPreviewUrl) {
                URL.revokeObjectURL(videoPreviewUrl);
            }
            const blobUrl = URL.createObjectURL(file);
            setVideoFile(file);
            setVideoPreviewUrl(blobUrl);
            setFormError('');
        }
    };

    const handleRemoveVideo = () => {
        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
        }
        setVideoFile(null);
        setVideoPreviewUrl(null);
        if (videoInputRef.current) {
            videoInputRef.current.value = '';
        }
    };

    const detectLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                const data = await response.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.state_district || 'Unknown Location';
                setSellerCity(city);
                setFormError('');
            } catch (e) {
                alert('Could not fetch location details.');
            }
        });
    };

    const handleCategoryChange = (newCat) => {
        setCategory(newCat);
        const condOptions = CATEGORY_CONDITIONS[newCat] || CATEGORY_CONDITIONS['Electronics'];
        setCondition(condOptions[1]?.tier || 'like-new');
        setConditionLabel(condOptions[1]?.label || 'Like New');
        setCategorySpecs({});
    };

    const handleConditionChange = (tier) => {
        setCondition(tier);
        const condOptions = CATEGORY_CONDITIONS[category] || CATEGORY_CONDITIONS['Electronics'];
        const match = condOptions.find(c => c.tier === tier);
        setConditionLabel(match ? match.label : tier);
    };

    const handleSpecChange = (key, value) => {
        setCategorySpecs(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        // Client-side validations with clear messages
        if (!title.trim() || title.trim().length < 5) {
            setFormError('Title must be at least 5 characters long.');
            return;
        }

        if (!price || parseFloat(price) < 10) {
            setFormError('Rental rate must be at least ₹10.');
            return;
        }

        if (!sellerName.trim()) {
            setFormError('Please provide your name.');
            return;
        }

        const cleanPhone = (sellerPhone || '').replace(/\D/g, '');
        if (!cleanPhone) {
            setFormError('Please provide a contact phone number.');
            return;
        }

        if (cleanPhone.length !== 10) {
            setFormError('Contact number must be of exactly 10 digits, not more or less than that.');
            return;
        }

        if (!imageFile) {
            setFormError('Please upload an item photo (JPEG, PNG, or WebP up to 5MB).');
            return;
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('category', category || 'Electronics');
        formData.append('condition', condition || 'like-new');
        formData.append('conditionLabel', conditionLabel || '');
        formData.append('categorySpecs', JSON.stringify(categorySpecs));
        formData.append('price', parseFloat(price));
        formData.append('period', pricePeriod);
        formData.append('description', description.trim());
        formData.append('city', (sellerCity && sellerCity.trim()) || 'Delhi NCR');
        formData.append('phone', cleanPhone);
        // Serialize amenities as JSON array per the controller's expectation
        formData.append('amenities', JSON.stringify(Object.keys(amenities).filter(k => amenities[k])));
        formData.append('image', imageFile);
        if (videoFile) {
            formData.append('video', videoFile);
        }

        setIsPublishing(true);
        setUploadProgress(0);
        try {
            await saveListing(formData, (percent) => {
                setUploadProgress(percent);
            });
            setShowSuccess(true);
            setFormError('');
        } catch (error) {
            console.error("Error creating listing", error);
            const message = error.message || error.data?.message || "Unable to create listing. Please check your details and try again.";
            setFormError(message);
        } finally {
            setIsPublishing(false);
            setUploadProgress(0);
        }
    };

    const calcPrice = parseFloat(price) || 0;
    const commission = Math.round(calcPrice * 0.02);
    const securityDeposit = Math.round(calcPrice * 0.10);
    const totalRenterRate = calcPrice + commission;
    const netPayout = calcPrice;

    return (
        <div className="create-listing-page">
            <Navbar />

            <div className="create-listing-container">
                <div className="page-header-block">
                    <h1 className="page-title">Post a New Rental</h1>
                    <p className="page-subtitle">Turn your idle assets into passive income. Fill out the details below to list your item on RentFlow's active marketplace.</p>
                </div>

                <div className="two-panel-grid">
                    {/* Left Form Panel */}
                    <div className="glass-panel">
                        {showSuccess && (
                            <div style={{
                                padding: '16px 20px',
                                borderRadius: '10px',
                                background: 'rgba(34, 197, 94, 0.12)',
                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                color: '#16a34a',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '18px' }}>✓</span>
                                    <span style={{ fontWeight: 600 }}>Listing Published! Your rental is now live on RentFlow.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/booking')}
                                    style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    View in Rentals →
                                </button>
                            </div>
                        )}

                        {formError && (
                            <div style={{
                                padding: '14px 18px',
                                borderRadius: '10px',
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#ef4444',
                                marginBottom: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '14px',
                                fontWeight: 500
                            }}>
                                <span style={{ fontSize: '18px' }}>⚠️</span>
                                <span>{formError}</span>
                            </div>
                        )}

                        <form id="create-listing-form" onSubmit={handleFormSubmit}>
                            
                            <div className="form-section-title">Item Details</div>
                            
                            <div className="form-group">
                                <label>Listing Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={title}
                                    onChange={e => { setTitle(e.target.value); if (formError) setFormError(''); }}
                                    placeholder="e.g. Sony Alpha A7 III Camera (min 5 chars)"
                                    minLength={5}
                                    maxLength={100}
                                    required
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                    Minimum 5 characters
                                </span>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select
                                        className="form-input"
                                        value={category}
                                        onChange={e => handleCategoryChange(e.target.value)}
                                        required
                                    >
                                        {CANONICAL_CATEGORIES.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Condition</label>
                                    <select
                                        className="form-input"
                                        value={condition}
                                        onChange={e => handleConditionChange(e.target.value)}
                                    >
                                        {(CATEGORY_CONDITIONS[category] || CATEGORY_CONDITIONS.Electronics).map(cond => (
                                            <option key={cond.tier} value={cond.tier}>{cond.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Dynamic Category Specifications */}
                            {CATEGORY_FIELDS_CONFIG[category] && (
                                <div className="category-specs-block" style={{
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'var(--bg-card)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-orange)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {category} Details &amp; Specifications
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                                        {CATEGORY_FIELDS_CONFIG[category].map(field => (
                                            <div className="form-group" key={field.key} style={{ marginBottom: 0 }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600 }}>{field.label} {field.required ? '*' : ''}</label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        className="form-input"
                                                        value={categorySpecs[field.key] || ''}
                                                        onChange={e => handleSpecChange(field.key, e.target.value)}
                                                        required={field.required}
                                                    >
                                                        <option value="">Select {field.label}</option>
                                                        {field.options.map(opt => (
                                                            <option key={opt} value={opt}>{opt}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        placeholder={field.placeholder}
                                                        value={categorySpecs[field.key] || ''}
                                                        onChange={e => handleSpecChange(field.key, e.target.value)}
                                                        required={field.required}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-section-title">Product Photos and Condition Video</div>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '-2px', marginBottom: '14px' }}>
                                Add a required item photo and an optional condition video to demonstrate authenticity and quality.
                            </p>

                            <div className="media-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                                {/* Main Photo Box */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ margin: 0, fontWeight: 600 }}>Item Photo *</label>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPEG, PNG, WebP ≤ 5MB</span>
                                    </div>
                                    <div className="upload-box" style={{ position: 'relative', overflow: 'hidden', minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                                        <input
                                            ref={imageInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleImageUpload}
                                            style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 1 }}
                                        />
                                        {imageFile ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, width: '100%' }}>
                                                <img
                                                    src={imagePreview}
                                                    alt="Photo preview"
                                                    style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                                                />
                                                <div style={{ color: 'var(--primary-orange)', fontWeight: 600, fontSize: '13px', textAlign: 'center', wordBreak: 'break-all' }}>
                                                    {imageFile.name}
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click to replace</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveImage();
                                                        }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '4px',
                                                            padding: '2px 8px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="upload-icon">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                </div>
                                                <div className="upload-text" style={{ fontSize: '13px' }}>Click or drag photo to upload</div>
                                                <div className="upload-hint" style={{ fontSize: '11px' }}>Required for all listings</div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Optional Condition Video Box */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ margin: 0, fontWeight: 600 }}>Condition Video (Optional)</label>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MP4, MOV ≤ 100MB</span>
                                    </div>
                                    <div className="upload-box" style={{ position: 'relative', overflow: 'hidden', minHeight: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                                        <input
                                            ref={videoInputRef}
                                            type="file"
                                            accept="video/mp4,video/quicktime"
                                            onChange={handleVideoUpload}
                                            style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0, cursor: 'pointer', zIndex: 1 }}
                                        />
                                        {videoFile ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2, width: '100%' }}>
                                                <video
                                                    controls
                                                    preload="metadata"
                                                    src={videoPreviewUrl}
                                                    style={{ width: '100%', maxHeight: '110px', borderRadius: '6px', background: '#000' }}
                                                />
                                                <div style={{ color: 'var(--primary-orange)', fontWeight: 600, fontSize: '13px', textAlign: 'center', wordBreak: 'break-all' }}>
                                                    {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Click to replace</span>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveVideo();
                                                        }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            borderRadius: '4px',
                                                            padding: '2px 8px',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="upload-icon">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                                                </div>
                                                <div className="upload-text" style={{ fontSize: '13px' }}>Click or drag video to upload</div>
                                                <div className="upload-hint" style={{ fontSize: '11px' }}>Showcase working condition & details</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Upload Progress Indicator */}
                            {isPublishing && uploadProgress > 0 && (
                                <div style={{ marginBottom: '16px', background: 'var(--bg-subtle, rgba(0,0,0,0.05))', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                                        <span>Uploading Media...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-orange), #2563eb)', transition: 'width 0.2s ease' }}></div>
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea className="form-input" rows="4" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the item, rules of usage, etc."></textarea>
                            </div>

                            <div className="form-section-title">Seller Information</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Your Name *</label>
                                    <input type="text" className="form-input" value={sellerName} onChange={e => setSellerName(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Contact Phone (10 Digits) *</label>
                                    <input
                                        type="tel"
                                        className="form-input"
                                        value={sellerPhone}
                                        onChange={e => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setSellerPhone(val);
                                        }}
                                        placeholder="10-digit mobile number"
                                        maxLength={10}
                                        pattern="[0-9]{10}"
                                        required
                                    />
                                    {sellerPhone && sellerPhone.length !== 10 && (
                                        <span style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
                                            Must be exactly 10 digits ({sellerPhone.length}/10 entered)
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>City / Location *</label>
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <input type="text" className="form-input" value={sellerCity} onChange={e => setSellerCity(e.target.value)} required style={{flex: 1}} />
                                    <button type="button" onClick={detectLocation} className="btn-secondary">Detect</button>
                                </div>
                            </div>

                            <div className="form-section-title">Pricing & Payout Summary</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Rental Rate (₹) *</label>
                                    <input type="number" className="form-input" value={price} onChange={e => setPrice(e.target.value)} min="10" required />
                                </div>
                                <div className="form-group">
                                    <label>Per</label>
                                    <select className="form-input" value={pricePeriod} onChange={e => setPricePeriod(e.target.value)}>
                                        <option value="day">Day</option>
                                        <option value="week">Week</option>
                                        <option value="month">Month</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pricing-breakdown-card">
                                <div className="price-row">
                                    <span>Your Rental Rate (Net Payout):</span>
                                    <strong style={{color: 'var(--primary-orange)', fontSize: '16px'}}>₹{netPayout}</strong>
                                </div>
                                <div className="price-row">
                                    <span>Platform Service Fee (2% added):</span>
                                    <span style={{color: '#10b981'}}>+ ₹{commission}</span>
                                </div>
                                <div className="price-row">
                                    <span>Refundable Deposit:</span>
                                    <strong>₹{securityDeposit}</strong>
                                </div>
                                <div className="price-row total-payout">
                                    <span>Total Rate Paid by Renter:</span>
                                    <strong style={{fontSize: '16px'}}>₹{totalRenterRate}</strong>
                                </div>
                            </div>

                            <div className="form-group" style={{flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px'}}>
                                <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} id="auto-renew" style={{width: '16px', height: '16px', accentColor: 'var(--primary-orange)'}} />
                                <label htmlFor="auto-renew" style={{cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)'}}>Keep listing active automatically after 30 days</label>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={isPublishing}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    marginTop: '14px',
                                    fontSize: '15px',
                                    justifyContent: 'center',
                                    opacity: isPublishing ? 0.7 : 1,
                                    cursor: isPublishing ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isPublishing ? 'Publishing...' : 'Publish Listing'}
                            </button>
                        </form>
                    </div>

                    {/* Right Panel - Live Preview */}
                    <div className="sticky-preview-wrapper">
                        <div className="glass-panel" style={{padding: '24px'}}>
                            <div className="panel-heading" style={{marginBottom: '16px'}}>Live Preview</div>
                            
                            <div className="preview-card">
                                <div className="preview-image-container" style={{ position: 'relative' }}>
                                    <img src={imagePreview} alt="Preview" />
                                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        <span className="preview-category-chip">{category || 'Category'}</span>
                                        <span style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '100px' }}>
                                            {conditionLabel}
                                        </span>
                                    </div>
                                </div>
                                {videoPreviewUrl && (
                                    <div style={{ padding: '12px 16px 0 16px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                            Condition Video Preview:
                                        </div>
                                        <video
                                            controls
                                            preload="metadata"
                                            src={videoPreviewUrl}
                                            style={{ width: '100%', maxHeight: '160px', borderRadius: '8px', background: '#000' }}
                                        />
                                    </div>
                                )}
                                <div className="preview-body">
                                    <h3 className="preview-title">{title || 'Item Title Here'}</h3>
                                    {Object.keys(categorySpecs).length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                            {Object.entries(categorySpecs).filter(([_, v]) => v).map(([k, v]) => (
                                                <span key={k} style={{ fontSize: '11px', background: 'var(--bg-subtle, rgba(0,0,0,0.05))', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                                    {v}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <p className="preview-desc">{description || 'Description of your item will appear here.'}</p>
                                    
                                    <div className="preview-seller-info">
                                        <div className="preview-avatar">{sellerName ? sellerName.charAt(0).toUpperCase() : 'R'}</div>
                                        <div className="preview-seller-details">
                                            <span className="preview-seller-name">{sellerName || 'Your Name'}</span>
                                            <span className="preview-seller-sub">{sellerCity || 'City'}</span>
                                        </div>
                                    </div>

                                    <div className="preview-pricing-line">
                                        <div>
                                            <span className="preview-price-display">₹{calcPrice}</span>
                                            <span className="preview-price-period">/{pricePeriod}</span>
                                        </div>
                                        <div className="preview-security-note">Deposit: ₹{securityDeposit}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div
                    className="modal-overlay active"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 1,
                        pointerEvents: 'auto'
                    }}
                >
                    <div className="success-modal-card" style={{
                        background: 'var(--bg-card)',
                        padding: '40px 32px',
                        borderRadius: '20px',
                        textAlign: 'center',
                        maxWidth: '460px',
                        width: '90%',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            fontSize: '32px'
                        }}>
                            ✓
                        </div>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                            Listing Published!
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px', lineHeight: 1.5 }}>
                            Your rental item has been successfully published to MongoDB and is now live on RentFlow.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => { setShowSuccess(false); navigate('/booking'); }}
                                className="btn-primary"
                                style={{ padding: '12px 24px', fontSize: '15px' }}
                            >
                                View in Explore Rentals
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSuccess(false);
                                    setTitle('');
                                    setDescription('');
                                    setImageFile(null);
                                }}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-secondary)',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Add Another
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

