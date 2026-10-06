import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getAuthUser, getListings, updateListing } from '../services/api';

export default function EditListing() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const [listing, setListing] = useState(null);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [price, setPrice] = useState('');
    const [period, setPeriod] = useState('');
    const [description, setDescription] = useState('');
    const [city, setCity] = useState('');
    
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

    useEffect(() => {
        const currentUser = getAuthUser();
        if (!currentUser) {
            navigate('/login?redirect=/edit-listing/' + id);
            return;
        }
        setUser(currentUser);

        const allListings = getListings();
        const found = allListings.find(l => l.id === id);
        
        if (found) {
            setListing(found);
            setTitle(found.title || '');
            setCategory(found.category || '');
            setPrice(found.price || '');
            setPeriod(found.period || 'day');
            setDescription(found.description || '');
            setCity(found.seller?.city || '');
        } else {
            setStatusMsg({ text: 'Listing not found.', type: 'error' });
        }
    }, [id, navigate]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!title) {
            setStatusMsg({ text: 'Title is required.', type: 'error' });
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            setStatusMsg({ text: 'A valid price is required.', type: 'error' });
            return;
        }

        try {
            updateListing(id, {
                title,
                category,
                price: parseFloat(price),
                period,
                description,
                seller: {
                    ...listing.seller,
                    city
                }
            });
            setStatusMsg({ text: 'Listing updated successfully!', type: 'success' });
            setTimeout(() => {
                navigate('/create-listing');
            }, 1500);
        } catch (e) {
            setStatusMsg({ text: 'Listing no longer exists.', type: 'error' });
        }
    };

    if (!listing && !statusMsg.text) {
        return <div style={{padding: '100px', textAlign: 'center'}}>Loading...</div>;
    }

    return (
        <div style={{minHeight: '100vh', backgroundColor: 'var(--bg-page)', color: 'var(--text-strongest)', paddingTop: '80px', paddingBottom: '60px'}}>
            <header className="site-header scrolled">
                <Link to="/" className="logo">Rent<span style={{color: '#3b82f6'}}>Flow</span></Link>
                <nav className="nav-links">
                    <Link to="/">Home</Link>
                    <Link to="/booking">Explore Rentals</Link>
                    <Link to="/create-listing">Post Listing</Link>
                </nav>
            </header>

            <div style={{maxWidth: '600px', margin: '0 auto', padding: '0 20px'}}>
                <div style={{marginBottom: '30px'}}>
                    <Link to="/create-listing" style={{color: 'var(--text-secondary)', textDecoration: 'none'}}>← Back to Dashboard</Link>
                </div>
                
                <h1 style={{fontFamily: 'var(--font-display)', fontSize: '32px', marginBottom: '8px'}}>Edit Listing</h1>
                <p style={{color: 'var(--text-secondary)', marginBottom: '30px'}}>Update your active rental listing below.</p>

                {statusMsg.text && (
                    <div style={{
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        marginBottom: '20px', 
                        background: statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        color: statusMsg.type === 'error' ? '#ef4444' : '#10b981',
                        border: `1px solid ${statusMsg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                    }}>
                        {statusMsg.text}
                    </div>
                )}

                {listing && (
                    <form onSubmit={handleSubmit} style={{background: 'var(--bg-card)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)'}}>
                        <div style={{marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span style={{color: 'var(--text-secondary)', fontSize: '14px'}}>ID: {listing.id}</span>
                            <span style={{background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase'}}>{listing.status}</span>
                        </div>

                        <div style={{marginBottom: '20px'}}>
                            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>Title</label>
                            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)'}} />
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>Category</label>
                                <select value={category} onChange={e => setCategory(e.target.value)} style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)'}}>
                                    <option value="Electronics">Electronics & Tech</option>
                                    <option value="Vehicles">Vehicles & Transport</option>
                                    <option value="Furniture">Furniture & Home</option>
                                    <option value="Equipment">Tools & Equipment</option>
                                    <option value="Party">Party & Events</option>
                                </select>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>City</label>
                                <input type="text" value={city} onChange={e => setCity(e.target.value)} style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)'}} />
                            </div>
                        </div>

                        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>Price (₹)</label>
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="10" style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)'}} />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>Per</label>
                                <select value={period} onChange={e => setPeriod(e.target.value)} style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)'}}>
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                </select>
                            </div>
                        </div>

                        <div style={{marginBottom: '30px'}}>
                            <label style={{display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)'}}>Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4" style={{width: '100%', padding: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-strongest)', resize: 'vertical'}}></textarea>
                        </div>

                        <button type="submit" style={{width: '100%', padding: '14px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '16px', cursor: 'pointer'}}>Save Changes</button>
                    </form>
                )}
            </div>
        </div>
    );
}
