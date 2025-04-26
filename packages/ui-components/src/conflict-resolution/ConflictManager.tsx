/**
 * ConflictManager Component
 * 
 * A component that wraps the conflict resolution components
 * and provides a unified interface for conflict management.
 */

import React from 'react';
import { ConflictResolutionManager } from '@terrafusion/offline-sync/src/conflict-resolution';
import { ConflictBadge } from './ConflictBadge';
import { ConflictResolutionModal } from './ConflictResolutionModal';
import { useConflictResolution } from './useConflictResolution';

export interface ConflictManagerProps {
  /** Conflict resolution manager instance */
  conflictManager: ConflictResolutionManager;
  /** User ID for conflict resolution */
  userId: string;
  /** Document ID to filter conflicts */
  documentId?: string;
  /** Children */
  children?: React.ReactNode;
  /** Whether to auto-open the modal when conflicts are detected */
  autoOpenModal?: boolean;
  /** Whether to show badge in silent mode (no popups) */
  silentMode?: boolean;
  /** Render prop for badge */
  renderBadge?: (props: {
    count: number;
    onClick: () => void;
  }) => React.ReactNode;
}

/**
 * ConflictManager component
 */
export const ConflictManager: React.FC<ConflictManagerProps> = ({
  conflictManager,
  userId,
  documentId,
  children,
  autoOpenModal = true,
  silentMode = false,
  renderBadge,
}) => {
  // Use the conflict resolution hook
  const {
    unresolvedConflicts,
    isModalOpen,
    openModal,
    closeModal,
    resolveConflict,
    loading,
    unresolvedCount,
  } = useConflictResolution({
    conflictManager,
    userId,
    documentId,
    autoOpenModal,
    showNotifications: !silentMode,
  });
  
  // Custom badge renderer or default badge
  const badgeElement = renderBadge ? (
    renderBadge({
      count: unresolvedCount,
      onClick: openModal,
    })
  ) : (
    <ConflictBadge
      count={unresolvedCount}
      onClick={openModal}
      tooltip={`${unresolvedCount} conflict${unresolvedCount !== 1 ? 's' : ''} need resolution`}
    />
  );
  
  return (
    <>
      {/* Badge */}
      {badgeElement}
      
      {/* Modal */}
      <ConflictResolutionModal
        conflicts={unresolvedConflicts}
        isOpen={isModalOpen}
        onClose={closeModal}
        userId={userId}
        onResolve={resolveConflict}
        loading={loading}
      />
      
      {/* Children */}
      {children}
    </>
  );
};

/**
 * ConflictManager component story
 */
export default {
  title: 'Conflict Resolution/ConflictManager',
  component: ConflictManager,
  parameters: {
    docs: {
      description: {
        component: 'A component that wraps the conflict resolution components',
      },
    },
  },
};