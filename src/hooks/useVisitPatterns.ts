import { useState, useEffect, useCallback } from 'react';
import { VisitPatternService } from '../services/VisitPatternService';
import type { VisitSuggestion, VisitPattern } from '../services/VisitPatternService';
import { useAuth } from './useAuth';

interface UseVisitPatternsState {
  suggestions: VisitSuggestion[];
  patterns: VisitPattern[];
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  lastAnalysis: Date | null;
}

interface UseVisitPatternsReturn extends UseVisitPatternsState {
  analyzePatternsForCircle: (circleId: string) => Promise<void>;
  generateSuggestions: (circleId: string) => Promise<void>;
  acceptSuggestion: (suggestion: VisitSuggestion, circleId: string) => Promise<{ success: boolean; visitId?: string; error?: string }>;
  rejectSuggestion: (suggestion: VisitSuggestion, circleId: string) => Promise<{ success: boolean; error?: string }>;
  refreshSuggestions: (circleId: string) => Promise<void>;
  clearError: () => void;
}

export const useVisitPatterns = (): UseVisitPatternsReturn => {
  const { user } = useAuth();
  const [state, setState] = useState<UseVisitPatternsState>({
    suggestions: [],
    patterns: [],
    isLoading: false,
    isAnalyzing: false,
    error: null,
    lastAnalysis: null
  });

  const patternService = new VisitPatternService();

  // Analyze patterns for a circle
  const analyzePatternsForCircle = useCallback(async (circleId: string) => {
    if (!user) return;

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      const result = await patternService.analyzeCirclePatterns(circleId);
      
      if (result.success) {
        setState(prev => ({ 
          ...prev, 
          lastAnalysis: new Date(),
          error: null 
        }));
      } else {
        setState(prev => ({ 
          ...prev, 
          error: result.error || 'Pattern analysis failed' 
        }));
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      }));
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  }, [user]);

  // Generate suggestions for a circle
  const generateSuggestions = useCallback(async (circleId: string) => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const suggestions = await patternService.generateWeekSuggestions(circleId);
      const patterns = await patternService.getCirclePatterns(circleId);
      
      setState(prev => ({
        ...prev,
        suggestions,
        patterns,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate suggestions'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // Accept a suggestion
  const acceptSuggestion = useCallback(async (
    suggestion: VisitSuggestion, 
    circleId: string
  ) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await patternService.acceptSuggestion(suggestion, circleId, user.id);
      
      if (result.success) {
        // Remove the accepted suggestion from the list
        setState(prev => ({
          ...prev,
          suggestions: prev.suggestions.filter(s => s.id !== suggestion.id),
          error: null
        }));
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to accept suggestion';
      setState(prev => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [user]);

  // Reject a suggestion
  const rejectSuggestion = useCallback(async (
    suggestion: VisitSuggestion, 
    circleId: string
  ) => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      const result = await patternService.rejectSuggestion(suggestion, circleId);
      
      if (result.success) {
        // Remove the rejected suggestion from the list
        setState(prev => ({
          ...prev,
          suggestions: prev.suggestions.filter(s => s.id !== suggestion.id),
          error: null
        }));
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reject suggestion';
      setState(prev => ({ ...prev, error: errorMsg }));
      return { success: false, error: errorMsg };
    }
  }, [user]);

  // Refresh suggestions (useful after accepting/rejecting)
  const refreshSuggestions = useCallback(async (circleId: string) => {
    await generateSuggestions(circleId);
  }, [generateSuggestions]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-analyze patterns when component mounts or user changes
  useEffect(() => {
    // We don't auto-analyze here since we need a circleId
    // The calling component should trigger analysis
  }, [user]);

  return {
    ...state,
    analyzePatternsForCircle,
    generateSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    refreshSuggestions,
    clearError
  };
};