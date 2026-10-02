import React from 'react';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import Feedback from './pages/admin/Feedback';
import ContactUs from './contactus';
import BookingHistory from './booking-history';
import Chat from './chat';
import BookingPage from './booking';

const routes = [
  // ==========================================
  // DHRUV'S ROUTES
  // ==========================================
  { path: '/login', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Login</h2><p>Owner: Dhruv</p></div>, owner: 'Dhruv', title: 'Login' },
  { path: '/signup', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Signup</h2><p>Owner: Dhruv</p></div>, owner: 'Dhruv', title: 'Signup' },
  { path: '/profile', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Profile</h2><p>Owner: Dhruv</p></div>, owner: 'Dhruv', title: 'Profile' },

  // ==========================================
  // MAYANK'S ROUTES
  // ==========================================
  { path: '/admin-dashboard', element: <AdminDashboard />, owner: 'Mayank', title: 'Admin Dashboard' },
  { path: '/analytics', element: <Analytics />, owner: 'Mayank', title: 'Analytics' },
  { path: '/feedback', element: <Feedback />, owner: 'Mayank', title: 'Feedback' },

  // ==========================================
  // MADHAV'S ROUTES
  // ==========================================
  { path: '/create-listing', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Create Listing</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Create Listing' },
  { path: '/edit-listing', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Edit Listing</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Edit Listing' },
  { path: '/', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Home</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Home' },
  { path: '/premium', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Premium</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Premium' },
  { path: '/about', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>About</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'About' },
  { path: '/policy', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Policy</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Policy' },
  { path: '/upcoming-features', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Upcoming Features</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Upcoming Features' },

  // ==========================================
  // ARYAN'S ROUTES
  // ==========================================
  { path: '/booking-history', element: <BookingHistory />, owner: 'Aryan', title: 'Booking History' },
  { path: '/booking', element: <BookingPage />, owner: 'Aryan', title: 'Booking' },
  { path: '/contact', element: <ContactUs />, owner: 'Aryan', title: 'Contact' },
  { path: '/chat', element: <Chat />, owner: 'Aryan', title: 'Chat' },

  // ==========================================
  // COMMON / FALLBACK
  // ==========================================
  { path: '*', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>404 - Not Found</h2></div>, owner: 'Common', title: 'Not Found' }
];

export default routes;
