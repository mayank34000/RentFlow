import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAuthUser, getListings, saveListing, deleteListing, getBookings, updateBookingStatus, processWalletSettlement } from './services/api';
import './styles/create-listing.css';

export default function CreateListing() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Form State
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [condition, setCondition] = useState('like-new');
    const [price, setPrice] = useState(1500);
    const [pricePeriod, setPricePeriod] = useState('month');
    const [autoRenew, setAutoRenew] = useState(true);
    const [description, setDescription] = useState('');
    const [sellerName, setSellerName] = useState('');
    const [sellerPhone, setSellerPhone] = useState('');
    const [sellerCity, setSellerCity] = useState('');
    const [imagePreview, setImagePreview] = useState('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80');
    
    // Amenities
    const [amenities, setAmenities] = useState({
        delivery: false,
        setup: false,
        protection: false,
        sanitized: false
    });

    // Dashboards Data
    const [myListings, setMyListings] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [completedSettlements, setCompletedSettlements] = useState([]);
    
    // Modals
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const currentUser = getAuthUser();
        if (!currentUser) {
            navigate('/login?redirect=/create-listing');
            return;
        }
        setUser(currentUser);
        setSellerName(currentUser.name || currentUser.username || '');
        setSellerPhone(currentUser.userphone || '');
        setSellerCity(currentUser.address || '');

        loadDashboards();

        const handleStorage = () => loadDashboards();
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [navigate]);

    const loadDashboards = () => {
        const allListings = getListings();
        const allBookings = getBookings();
        
        // Assuming current user's listings are either those they created or default.
        // For simplicity, we show all since it's a demo, or filter by user email if available.
        // We will just show all listings as 'My Listings' to match existing behavior unless filtered.
        const currentUser = getAuthUser();
        const userEmail = currentUser?.useremail || 'madhvtaneja@gmail.com';

        setMyListings(allListings); // existing code shows all or relies on local logic
        
        const pending = allBookings.filter(b => b.status === 'Pending' && (b.lenderEmail === userEmail || b.lenderName === currentUser?.name));
        const completed = allBookings.filter(b => b.status === 'Active' && (b.lenderEmail === userEmail || b.lenderName === currentUser?.name));
        
        setPendingRequests(pending.length > 0 ? pending : allBookings.filter(b => b.status === 'Pending'));
        setCompletedSettlements(completed.length > 0 ? completed : allBookings.filter(b => b.status === 'Active'));
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target.result);
            reader.readAsDataURL(file);
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
            } catch (e) {
                alert('Could not fetch location details.');
            }
        });
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (!title || !price || !sellerName || !sellerPhone) {
            alert('Please fill out all required fields marked with *');
            return;
        }

        const newListing = {
            id: 'item_' + Date.now(),
            title,
            category,
            condition,
            price: parseFloat(price),
            period: pricePeriod,
            description,
            image: imagePreview,
            amenities: Object.keys(amenities).filter(k => amenities[k]),
            seller: {
                name: sellerName,
                phone: sellerPhone,
                city: sellerCity
            },
            status: 'active',
            dateAdded: new Date().toISOString()
        };

        saveListing(newListing);
        setShowSuccess(true);
        loadDashboards();
    };

    const syncApiProducts = async () => {
        try {
            const response = await fetch('/js/products.json');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            
            let count = 0;
            const currentListings = getListings();
            
            data.forEach(item => {
                if (!currentListings.find(l => l.title === item.title)) {
                    saveListing({
                        ...item,
                        id: item.id || 'api_' + Date.now() + Math.random(),
                        status: 'active'
                    });
                    count++;
                }
            });
            alert(`Successfully fetched and added ${count} products from the central inventory API!`);
            loadDashboards();
        } catch (e) {
            alert('Failed to sync API products.');
        }
    };

    // Calculators
    const calcPrice = parseFloat(price) || 0;
    const commission = Math.round(calcPrice * 0.02);
    const securityDeposit = Math.round(calcPrice * 0.10);
    const netPayout = Math.max(0, calcPrice - commission);

    return (
        <div className="create-listing-page">
            <header className="site-header scrolled">
                <Link to="/" className="logo">Rent<span style={{color: '#3b82f6'}}>Flow</span></Link>
                <nav className="nav-links">
                    <Link to="/">Home</Link>
                    <Link to="/booking">Explore Rentals</Link>
                    <Link to="/create-listing" style={{color: 'var(--primary-orange)', fontWeight: 600}}>+ Post Listing</Link>
                </nav>
                <div className="nav-cta">
                    <Link to="/profile" className="btn-ghost">Profile</Link>
                </div>
            </header>

            <div className="create-listing-container">
                <div className="page-header-block">
                    <h1 className="page-title">Post a New Rental</h1>
                    <p className="page-subtitle">Turn your idle assets into passive income. Fill out the details below to list your item on RentFlow's active marketplace.</p>
                </div>

                <div className="two-panel-grid">
                    {/* Left Form Panel */}
                    <div className="glass-panel">
                        <form id="create-listing-form" onSubmit={handleFormSubmit}>
                            
                            <div className="form-section-title">Item Details</div>
                            
                            <div className="form-group">
                                <label>Listing Title *</label>
                                <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sony Alpha A7 III Camera" required />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category *</label>
                                    <select className="form-input" value={category} onChange={e => setCategory(e.target.value)} required>
                                        <option value="" disabled>Select Category</option>
                                        <option value="Electronics">Electronics & Tech</option>
                                        <option value="Vehicles">Vehicles & Transport</option>
                                        <option value="Furniture">Furniture & Home</option>
                                        <option value="Equipment">Tools & Equipment</option>
                                        <option value="Party">Party & Events</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Condition</label>
                                    <select className="form-input" value={condition} onChange={e => setCondition(e.target.value)}>
                                        <option value="brand-new">Brand New</option>
                                        <option value="like-new">Like New</option>
                                        <option value="good">Good Condition</option>
                                        <option value="fair">Fair (Visible wear)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Upload Item Photo *</label>
                                <div className="upload-box" style={{position: 'relative'}}>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} style={{position:'absolute', width:'100%', height:'100%', opacity:0, cursor:'pointer'}} />
                                    <div className="upload-icon">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                    </div>
                                    <div className="upload-text">Click or drag image to upload</div>
                                    <div className="upload-hint">High quality images increase booking chances by 40%</div>
                                </div>
                            </div>

                            <div className="form-section-title">Amenities & Features</div>
                            <div className="amenities-grid">
                                <label className={`amenity-chip ${amenities.delivery ? 'active' : ''}`}>
                                    <input type="checkbox" checked={amenities.delivery} onChange={e => setAmenities({...amenities, delivery: e.target.checked})} style={{display:'none'}}/>
                                    Free Delivery
                                </label>
                                <label className={`amenity-chip ${amenities.setup ? 'active' : ''}`}>
                                    <input type="checkbox" checked={amenities.setup} onChange={e => setAmenities({...amenities, setup: e.target.checked})} style={{display:'none'}}/>
                                    Setup Included
                                </label>
                                <label className={`amenity-chip ${amenities.protection ? 'active' : ''}`}>
                                    <input type="checkbox" checked={amenities.protection} onChange={e => setAmenities({...amenities, protection: e.target.checked})} style={{display:'none'}}/>
                                    Damage Protection
                                </label>
                                <label className={`amenity-chip ${amenities.sanitized ? 'active' : ''}`}>
                                    <input type="checkbox" checked={amenities.sanitized} onChange={e => setAmenities({...amenities, sanitized: e.target.checked})} style={{display:'none'}}/>
                                    Sanitized
                                </label>
                            </div>

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
                                    <label>Contact Phone *</label>
                                    <input type="tel" className="form-input" value={sellerPhone} onChange={e => setSellerPhone(e.target.value)} required />
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
                                    <span>Renter Display Rate:</span>
                                    <strong>₹{calcPrice}</strong>
                                </div>
                                <div className="price-row">
                                    <span>Platform Service Fee (2%):</span>
                                    <span style={{color: 'var(--text-secondary)'}}>- ₹{commission}</span>
                                </div>
                                <div className="price-row">
                                    <span>Refundable Deposit:</span>
                                    <strong>₹{securityDeposit}</strong>
                                </div>
                                <div className="price-row total-payout">
                                    <span>Your Net Payout:</span>
                                    <strong style={{color: '#60a5fa', fontSize: '16px'}}>₹{netPayout}</strong>
                                </div>
                            </div>

                            <div className="form-group" style={{flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '8px'}}>
                                <input type="checkbox" checked={autoRenew} onChange={e => setAutoRenew(e.target.checked)} id="auto-renew" style={{width: '16px', height: '16px', accentColor: 'var(--primary-orange)'}} />
                                <label htmlFor="auto-renew" style={{cursor: 'pointer', fontSize: '14px', color: 'var(--text-secondary)'}}>Keep listing active automatically after 30 days</label>
                            </div>

                            <button type="submit" className="btn-primary" style={{width: '100%', padding: '14px', marginTop: '14px', fontSize: '15px', justifyContent: 'center'}}>Publish Listing</button>
                        </form>
                    </div>

                    {/* Right Panel - Live Preview */}
                    <div className="sticky-preview-wrapper">
                        <div className="glass-panel" style={{padding: '24px'}}>
                            <div className="panel-heading" style={{marginBottom: '16px'}}>Live Preview</div>
                            
                            <div className="preview-card">
                                <div className="preview-image-container">
                                    <img src={imagePreview} alt="Preview" />
                                    <span className="preview-category-chip">{category || 'Category'}</span>
                                </div>
                                <div className="preview-body">
                                    <h3 className="preview-title">{title || 'Item Title Here'}</h3>
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

                {/* Dashboard Sections */}
                {pendingRequests.length > 0 && (
                    <section className="dashboard-section">
                        <div className="dashboard-header">
                            <div>
                                <h2 className="dashboard-title">Pending Requests</h2>
                                <p style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Manage incoming booking requests.</p>
                            </div>
                        </div>
                        <div className="listings-grid">
                            {pendingRequests.map(req => (
                                <div key={req.id} className="listing-card">
                                    <img src={req.itemImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"} alt={req.itemTitle} className="listing-img" />
                                    <div className="listing-card-body">
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <h3 className="listing-card-title">{req.itemTitle}</h3>
                                            <span className="status-badge" style={{background:'rgba(245, 158, 11, 0.1)', color:'#f59e0b', border:'1px solid rgba(245, 158, 11, 0.2)'}}>Pending</span>
                                        </div>
                                        <p style={{fontSize:'13px', color:'var(--text-secondary)', margin:'4px 0'}}>Req by: {req.renterEmail}</p>
                                        <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                                            <button onClick={() => { updateBookingStatus(req.id, 'Active'); loadDashboards(); }} className="btn-primary" style={{flex:1, padding:'6px', fontSize:'12px', background:'#10b981'}}>Accept</button>
                                            <button onClick={() => { updateBookingStatus(req.id, 'Rejected'); loadDashboards(); }} className="btn-secondary" style={{flex:1, padding:'6px', fontSize:'12px', color:'#ef4444'}}>Reject</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {completedSettlements.length > 0 && (
                    <section className="dashboard-section">
                        <div className="dashboard-header">
                            <div>
                                <h2 className="dashboard-title">Active Rentals (Ready to Settle)</h2>
                                <p style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Confirm item returns and settle wallet payouts.</p>
                            </div>
                        </div>
                        <div className="listings-grid">
                            {completedSettlements.map(req => (
                                <div key={req.id} className="listing-card">
                                    <img src={req.itemImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"} alt={req.itemTitle} className="listing-img" />
                                    <div className="listing-card-body">
                                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                            <h3 className="listing-card-title">{req.itemTitle}</h3>
                                            <span className="status-badge" style={{background:'rgba(59, 130, 246, 0.1)', color:'#3b82f6', border:'1px solid rgba(59, 130, 246, 0.2)'}}>Active</span>
                                        </div>
                                        <p style={{fontSize:'13px', color:'var(--text-secondary)', margin:'4px 0'}}>Currently rented by: {req.renterEmail}</p>
                                        <button onClick={() => { 
                                            const res = processWalletSettlement(req);
                                            alert(`Settle Successful!\n- Security Deposit of ₹${res.securityAmount} refunded to buyer.\n- Rent payout of ₹${res.sellerEarnings} transferred to your wallet.`);
                                            loadDashboards();
                                        }} className="btn-primary" style={{width:'100%', marginTop:'12px', background:'#8b5cf6'}}>Mark Returned & Settle</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="dashboard-section">
                    <div className="dashboard-header">
                        <div>
                            <h2 className="dashboard-title">My Listings</h2>
                            <p style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Manage your currently listed items.</p>
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:'16px'}}>
                            <button onClick={syncApiProducts} className="btn-primary" style={{padding:'8px 16px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)'}}>Sync API Products</button>
                            <span>Total: {myListings.length}</span>
                        </div>
                    </div>
                    <div className="listings-grid">
                        {myListings.map(l => (
                            <div key={l.id} className="listing-card">
                                <img src={l.image} alt={l.title} className="listing-img" />
                                <div className="listing-card-body">
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                                        <h3 className="listing-card-title">{l.title}</h3>
                                        <span className="status-badge">{l.status}</span>
                                    </div>
                                    <div style={{marginTop:'12px', display:'flex', gap:'8px'}}>
                                        <Link to={`/edit-listing/${l.id}`} className="btn-secondary" style={{flex:1, textAlign:'center'}}>Edit</Link>
                                        <button onClick={() => { deleteListing(l.id); loadDashboards(); }} className="btn-secondary" style={{flex:1, color:'#ef4444'}}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="modal-overlay">
                    <div className="success-modal-card" style={{background: 'var(--bg-card)', padding: '40px', borderRadius: '16px', textAlign: 'center'}}>
                        <h2 style={{marginTop: '20px'}}>Listing Published!</h2>
                        <p style={{color: 'var(--text-secondary)', marginBottom: '24px'}}>Your item is now live and visible to thousands of renters in your area.</p>
                        <button onClick={() => setShowSuccess(false)} className="btn-primary">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}
