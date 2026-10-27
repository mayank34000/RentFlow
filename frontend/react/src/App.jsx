import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import routes from './routes';
import { useTheme } from './useNavbarBehavior';

function App() {
  useTheme();
  
  return (
    <BrowserRouter>
      <Routes>
        {routes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
