import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesData } from '../../data/categories';

export function SearchForm() {
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location.trim()) params.append('q', location.trim());
    if (category) params.append('category', category);
    
    const queryString = params.toString();
    navigate(queryString ? `/booking?${queryString}` : '/booking');
  };

  return (
    <form className="home-search-box" onSubmit={handleSubmit}>
      <input 
        type="text" 
        className="home-search-input" 
        placeholder="Search by city or item (e.g. Mumbai, Camera, MacBook)..."
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <select 
        className="home-search-select"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">All Categories</option>
        {categoriesData.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      <button type="submit" className="home-search-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Find Rental
      </button>
    </form>
  );
}
