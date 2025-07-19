import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  X, 
  Brain, 
  TrendingUp,
  User,
  ChevronRight 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { VisitSuggestion } from '../../services/VisitPatternService';

interface VisitSuggestionsProps {
  suggestions: VisitSuggestion[];
  onAccept: (suggestion: VisitSuggestion) => Promise<void>;
  onReject: (suggestion: VisitSuggestion) => Promise<void>;
  loading?: boolean;
  className?: string;
}

export const VisitSuggestions: React.FC<VisitSuggestionsProps> = ({
  suggestions,
  onAccept,
  onReject,
  loading = false,
  className = ''
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (suggestions.length === 0) {
    return null;
  }

  const handleAccept = async (suggestion: VisitSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      await onAccept(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (suggestion: VisitSuggestion) => {
    setProcessingId(suggestion.id);
    try {
      await onReject(suggestion);
    } finally {
      setProcessingId(null);
    }
  };

  const getConfidenceColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'low': return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high': return <TrendingUp className="w-4 h-4" />;
      case 'medium': return <Brain className="w-4 h-4" />;
      case 'low': return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Smart Suggestions
          </h3>
          <p className="text-sm text-gray-600">
            Based on your family's visiting patterns
          </p>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="space-y-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={() => handleAccept(suggestion)}
            onReject={() => handleReject(suggestion)}
            isProcessing={processingId === suggestion.id}
            disabled={loading || processingId !== null}
            confidenceColor={getConfidenceColor(suggestion.confidence_level)}
            confidenceIcon={getConfidenceIcon(suggestion.confidence_level)}
          />
        ))}
      </div>

      {/* Learning Indicator */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <Brain className="w-3 h-3" />
          TouchPoints learns from your family's patterns to make helpful suggestions
        </p>
      </div>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: VisitSuggestion;
  onAccept: () => void;
  onReject: () => void;
  isProcessing: boolean;
  disabled: boolean;
  confidenceColor: string;
  confidenceIcon: React.ReactNode;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onAccept,
  onReject,
  isProcessing,
  disabled,
  confidenceColor,
  confidenceIcon
}) => {
  const formatSuggestionDate = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEEE, MMM d');
    }
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Visitor and Date */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {suggestion.visitor_name}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                {formatSuggestionDate(suggestion.suggested_date)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                {formatTime(suggestion.suggested_start_time)} - {formatTime(suggestion.suggested_end_time)}
              </span>
            </div>
          </div>

          {/* Suggestion Reason */}
          <p className="text-sm text-gray-600 mb-3">
            {suggestion.suggestion_reason}
          </p>

          {/* Confidence Level */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${confidenceColor}`}>
            {confidenceIcon}
            <span className="capitalize">{suggestion.confidence_level} confidence</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={disabled}
            className="text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <X className="w-4 h-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            onClick={onAccept}
            disabled={disabled || !suggestion.can_accept}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isProcessing ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-200 border-t-white" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Schedule
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};