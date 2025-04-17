
import React from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const NavigationBreadcrumb = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
      <a href="/" className="hover:text-primary transition-colors">
        Home
      </a>
      {pathSegments.map((segment, index) => (
        <React.Fragment key={segment}>
          <ChevronRight className="w-4 h-4" />
          <a
            href={`/${pathSegments.slice(0, index + 1).join('/')}`}
            className="hover:text-primary transition-colors capitalize"
          >
            {segment.replace(/-/g, ' ')}
          </a>
        </React.Fragment>
      ))}
    </nav>
  );
};
