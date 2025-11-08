import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

/**
 * Accessible tooltip component with hover and focus support
 *
 * Shows helpful information on hover/focus with smooth fade-in animation
 * and proper ARIA attributes for screen readers
 */
export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-flex">
      <span
        tabIndex={0}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="cursor-help"
      >
        {children}
      </span>
      {show && (
        <div role="tooltip" className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-xl whitespace-nowrap animate-fadeIn">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
};
