'use client';

import React, { useState } from 'react';

const Sidebar = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      {!isOpen && (
        <div
          id="burgerIcon"
          onClick={open}
          role="button"
          aria-label="Open sidebar"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') open();
          }}
        >
          ☰
        </div>
      )}

      <div id="sidebar" className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h1>Route Planner</h1>
          <button id="closeBtn" onClick={close} aria-label="Close sidebar" type="button">
            ×
          </button>
        </div>

        <div className="sidebar-content">{children}</div>
      </div>
    </>
  );
};

export default Sidebar;
