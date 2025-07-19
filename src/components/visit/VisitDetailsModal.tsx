import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar, Clock, User, Edit3, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EnhancedVisitNotes } from './EnhancedVisitNotes';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import type { Visit, CareCircle } from '../../types';

interface VisitDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  circle?: CareCircle;
  onVisitUpdated?: () => void;
  onVisitDeleted?: () => void;
}

export const VisitDetailsModal: React.FC<VisitDetailsModalProps> = ({
  isOpen,
  onClose,
  visit,
  circle,
  onVisitUpdated,
  onVisitDeleted
}) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!visit) return null;

  const canEdit = user && (user.id === visit.visitor_id || visit.status === 'scheduled');
  const canDelete = user && user.id === visit.visitor_id;

  const formatVisitDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleVisitUpdate = () => {
    onVisitUpdated?.();
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!visit || !user) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('visits')
        .delete()
        .eq('id', visit.id);

      if (error) throw error;

      onVisitDeleted?.();
      onClose();
    } catch (error) {
      console.error('Error deleting visit:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'cancelled': return 'bg-error/10 text-error';
      case 'scheduled': return 'bg-primary/10 text-primary';
      default: return 'bg-border text-textSecondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      case 'scheduled': return 'Scheduled';
      default: return status;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Visit Details"
    >
      <div className="space-y-6">
        {/* Visit Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            {/* Patient Info */}
            {circle && (
              <div>
                <h2 className="text-xl font-semibold text-text">
                  Visit with {circle.patient_first_name} {circle.patient_last_name}
                </h2>
                {circle.facility_name && (
                  <p className="text-sm text-textSecondary">
                    {circle.facility_name}
                    {circle.room_number && ` • Room ${circle.room_number}`}
                  </p>
                )}
              </div>
            )}

            {/* Visit Details */}
            <div className="flex flex-wrap gap-4 text-sm text-textSecondary">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatVisitDate(visit.visit_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {formatTime(visit.start_time)} - {formatTime(visit.end_time)}
                </span>
              </div>
              {visit.visitor && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{visit.visitor.full_name}</span>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(visit.status)}`}>
                {getStatusLabel(visit.status)}
              </span>
            </div>
          </div>

          {/* Actions */}
          {canEdit && !showDeleteConfirm && (
            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit3 className="w-4 h-4 mr-1" />
                {isEditing ? 'View' : 'Edit'}
              </Button>
              
              {canDelete && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleDeleteClick}
                  className="text-error border-error/30 hover:bg-error/5"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-error/5 border border-error/20 rounded-lg">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-error mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-error">
                  Delete this visit?
                </h3>
                <p className="text-sm text-error/80 mt-1">
                  This action cannot be undone. All notes and mood tracking for this visit will be permanently removed.
                </p>
                <div className="flex gap-3 mt-3">
                  <Button
                    size="sm"
                    onClick={handleDeleteConfirm}
                    disabled={isDeleting}
                    className="bg-error hover:bg-error/90 text-white"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, delete visit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleDeleteCancel}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Visit Notes */}
        {!showDeleteConfirm && (
          <div className="border-t pt-6">
            <EnhancedVisitNotes
              visit={visit}
              onUpdate={handleVisitUpdate}
              readonly={!isEditing}
              circleId={circle?.id}
            />
          </div>
        )}

        {/* Footer Actions */}
        {!showDeleteConfirm && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};