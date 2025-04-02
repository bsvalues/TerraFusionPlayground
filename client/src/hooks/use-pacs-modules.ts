import { useQuery } from '@tanstack/react-query';
import { PacsModule } from '@/lib/types';

/**
 * Hook to fetch and manage PACS modules
 */
export const usePacsModules = () => {
  const { data: modules = [], isLoading, error } = useQuery<PacsModule[]>({
    queryKey: ['/api/pacs-modules'],
  });

  // Group modules by agent type for easier consumption in sidebar
  const getModulesByAgent = (agentType: string): PacsModule[] => {
    // This is a simple mapping - in a real app, you'd have a more sophisticated
    // way to map modules to agents, possibly from a configuration file or API
    switch (agentType) {
      case 'data-management':
        return modules.filter(module => 
          ['Land', 'Fields', 'Improvements', 'Destroyed Property', 'Imports'].includes(module.moduleName)
        );
      case 'property-valuation':
        return modules.filter(module => 
          ['Valuation Methods', 'Comparable Sales', 'Marshall & Swift Commercial', 
           'Marshall & Swift Residential', 'Recalculation'].includes(module.moduleName)
        );
      case 'citizen-interaction':
        return modules.filter(module => 
          ['Customer Service Alerts', 'Inquiry Processing', 'Protest Processing',
           'Notice Processing', 'Letter Processing'].includes(module.moduleName)
        );
      case 'audit-compliance':
        return modules.filter(module => 
          ['DOR Reports', 'Audit Logs', 'Event Management', 'REET',
           'Rollback & Current Use Removal', 'Levy Certification'].includes(module.moduleName)
        );
      default:
        return [];
    }
  };

  const initializePacsModules = async () => {
    try {
      const response = await fetch('/api/pacs-modules/initialize', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize PACS modules');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error initializing PACS modules:', error);
      throw error;
    }
  };

  return {
    modules,
    isLoading,
    error,
    getModulesByAgent,
    initializePacsModules,
  };
};
