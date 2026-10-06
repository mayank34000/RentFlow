import React from 'react';
import AdminDashboard from './AdminDashboard';
import Analytics from './Analytics';
import Feedback from './Feedback';
import ContactUs from './contactus';
import BookingHistory from './booking-history';
import Chat from './chat';
import BookingPage from './booking';
import HomePage from './HomePage';
import Login from './Login';
import Signup from './Signup';
import Profile from './Profile';
import CreateListing from './CreateListing';
import EditListing from './EditListing';
import Premium from './Premium';
import About from './About';
import UpcomingFeatures from './UpcomingFeatures';

const routes = [
  // ==========================================
  // DHRUV'S ROUTES
  // ==========================================
  { path: '/login', element: <Login />, owner: 'Dhruv', title: 'Login' },
  { path: '/signup', element: <Signup />, owner: 'Dhruv', title: 'Signup' },
  { path: '/profile', element: <Profile />, owner: 'Dhruv', title: 'Profile' },
  { path: '/settings', element: <Profile />, owner: 'Dhruv', title: 'Settings' },
  { path: '/', element: <HomePage />, owner: 'Dhruv', title: 'Home' },
  { path: '/booking-history', element: <BookingHistory />, owner: 'Dhruv', title: 'Booking History' },
  { path: '/booking', element: <BookingPage />, owner: 'Dhruv', title: 'Booking' },
  { path: '/messages', element: <Profile />, owner: 'Dhruv', title: 'Messages' },
  { path: '/reviews', element: <Profile />, owner: 'Dhruv', title: 'Reviews' },

  // ==========================================
  // MAYANK'S ROUTES
  // ==========================================
  { path: '/admin-dashboard', element: <AdminDashboard />, owner: 'Mayank', title: 'Admin Dashboard' },
  { path: '/analytics', element: <Analytics />, owner: 'Mayank', title: 'Analytics' },
  { path: '/feedback', element: <Feedback />, owner: 'Mayank', title: 'Feedback' },

  // ==========================================
  // MADHAV'S ROUTES
  // ==========================================
  { path: '/create-listing', element: <CreateListing />, owner: 'Madhav', title: 'Create Listing' },
  { path: '/edit-listing/:id', element: <EditListing />, owner: 'Madhav', title: 'Edit Listing' },
  { path: '/premium', element: <Premium />, owner: 'Madhav', title: 'Premium' },
  { path: '/about', element: <About />, owner: 'Madhav', title: 'About' },
  { path: '/policy', element: <div style={{ padding: '2rem', textAlign: 'center' }}><h2>Policy</h2><p>Owner: Madhav</p></div>, owner: 'Madhav', title: 'Policy' },
  { path: '/upcoming-features', element: <UpcomingFeatures />, owner: 'Madhav', title: 'Upcoming Features' },

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
