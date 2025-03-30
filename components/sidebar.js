//sidebar.jsx
//Sidebar component for the Route Planner app
//This component is a sidebar that can be opened and closed by the user
//It contains the route planner form and settings
//The sidebar is hidden by default and can be opened by clicking the burger icon


'use client';

import React, { useState } from 'react';

const Sidebar = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false); // Start closed by default

  const handleBurgerClick = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      {/* Burger Icon - No inline styles needed, handled by #burgerIcon in layout.css */}
      {!isOpen && (
        <div
          id="burgerIcon" // Keep ID for styling hook from layout.css
          onClick={handleBurgerClick}
          role="button" // Better semantics
          aria-label="Open sidebar"
          tabIndex={0} // Make it focusable
          onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleBurgerClick() : null} // Keyboard accessibility
        >
          ☰
        </div>
      )}

      {/* Sidebar Container - Classes handle visibility, ID for base styles from layout.css */}
      <div id="sidebar" className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        {/* Sidebar Header - Use class from layout.css */}
        <div className="sidebar-header">
          {/* H1 - No inline styles needed, handled by .sidebar-header h1 in layout.css */}
          <h1>Route Planner</h1>
          {/* Close Button - Keep ID for styling hook from layout.css */}
          <button
            id="closeBtn" // Keep ID for styling hook
            onClick={handleClose}
            aria-label="Close sidebar"
          >
            × {/* Use HTML entity for times symbol */}
          </button>
        </div>

        {/* Content Area - Children are rendered here */}
        {/* Add a wrapper if needed for consistent padding/scrolling separate from header */}
        <div className="sidebar-content" style={{ flexGrow: 1, overflowY: 'auto' }}> {/* Basic wrapper example */}
             {children}
        </div>
      </div>
    </>
  );
};

export default Sidebar;