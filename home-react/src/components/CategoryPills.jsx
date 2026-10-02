import React from 'react';
import { categoriesData } from '../data/categories';

export function CategoryPills() {
  return (
    <div className="home-pills">
      {categoriesData.map(cat => (
        <a 
          key={cat} 
          href={`booking.html?category=${encodeURIComponent(cat)}`}
          className="home-pill"
        >
          {cat}
        </a>
      ))}
    </div>
  );
}
