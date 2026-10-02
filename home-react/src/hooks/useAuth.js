import { useState, useEffect } from 'react';

export function useAuth() {
  const [authState, setAuthState] = useState(() => {
    try {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const currentUser = JSON.parse(localStorage.getItem('current_user'));
      const profileImage = localStorage.getItem('profileImage') || '../assets/profile.png';
      return {
        isLoggedIn: isLoggedIn && !!currentUser,
        user: currentUser || null,
        profileImage,
        isPremium: currentUser ? !!currentUser.isPremium : false,
      };
    } catch (e) {
      return { isLoggedIn: false, user: null, profileImage: '../assets/profile.png', isPremium: false };
    }
  });

  useEffect(() => {
    if (authState.isLoggedIn && authState.user && authState.isPremium && authState.user.premiumExpiryDate) {
      const expiry = new Date(authState.user.premiumExpiryDate);
      const now = new Date();
      if (now > expiry) {
        // Handle expired premium
        const updatedUser = { ...authState.user, isPremium: false };
        localStorage.setItem('current_user', JSON.stringify(updatedUser));
        
        try {
          let allUsers = JSON.parse(localStorage.getItem('user')) || [];
          const userIndex = allUsers.findIndex(u => u.useremail === updatedUser.useremail);
          if (userIndex !== -1) {
            allUsers[userIndex].isPremium = false;
            localStorage.setItem('user', JSON.stringify(allUsers));
          }
        } catch (e) {}

        setAuthState(prev => ({
          ...prev,
          user: updatedUser,
          isPremium: false,
        }));
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('current_user');
    localStorage.removeItem('profileImage');
    window.location.reload();
  };

  return {
    ...authState,
    logout,
  };
}
