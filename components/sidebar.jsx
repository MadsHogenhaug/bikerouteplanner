// sidebar.jsx
// -----------------------------
// React component for a toggleable sidebar
'use client'

import React, { useState } from 'react';

const Sidebar = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleBurgerClick = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {!isOpen && (
        <div
          id="burgerIcon"
          onClick={handleBurgerClick}
          style={{ cursor: 'pointer' }}
        >
          &#9776;
        </div>
      )}
      {isOpen && (
        <div id="sidebar" className="sidebar open">
          {/* Close button as an 'X' */}
          <button
            id="closeBtn"
            onClick={handleClose}
            style={{
              fontSize: '48px',
              background: 'none',
              border: 'none',
              color: '#E57373',
              cursor: 'pointer',
              marginBottom: '1px'
            }}
          >
            &times;
          </button>

          {/* Larger "Route Planner" heading */}
          <h1 style={{ marginTop: 0, marginBottom: '20px' }}>Route Planner</h1>

          {/* Now render children */}
          {children}
        </div>
      )}
    </>
  );
};

export default Sidebar;
