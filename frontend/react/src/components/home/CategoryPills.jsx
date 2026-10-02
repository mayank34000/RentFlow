import React from 'react';
import { Link } from 'react-router-dom';
import { categoriesData } from '../../data/categories';

export function CategoryPills() {
  return (
    <div className="home-pills">
      {categoriesData.map(cat => (
        <Link 
          key={cat} 
          to={`/booking?category=${encodeURIComponent(cat)}`}
          className="home-pill"
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}
