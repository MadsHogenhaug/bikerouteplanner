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
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '24px' }}>Route Planner</h1>
            <button
              id="closeBtn"
              onClick={handleClose}
              style={{
                fontSize: '35px',
                background: 'none',
                border: 'none',
                color: '#E57373',
                cursor: 'pointer',
                padding: '0 0 0 68px',
                margin: 0,
                height: '24px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Now render children */}
          {children}
        </div>
      )}
    </>
  );
};

export default Sidebar;
