import { supabase } from '../lib/supabase';
import { format, addDays, isWeekend, startOfWeek, endOfWeek } from 'date-fns';
import type { Visit, CareCircle, User } from '../types';

export interface VisitPattern {
  id: string;
  circle_id: string;
  visitor_id: string;
  pattern_type: 'day_preference' | 'time_preference' | 'duration_preference' | 'frequency_pattern';
  day_of_week?: number; // 0 = Sunday, 6 = Saturday
  preferred_start_time?: string;
  preferred_duration_minutes?: number;
  occurrence_count: number;
  total_opportunities: number;
  consistency_score: number;
  confidence_level: 'low' | 'medium' | 'high';
  suggestion_count: number;
  acceptance_count: number;
  rejection_count: number;
  visitor?: User;
}

export interface VisitSuggestion {
  id: string;
  visitor_id: string;
  visitor_name: string;
  suggested_date: string;
  suggested_start_time: string;
  suggested_end_time: string;
  suggestion_reason: string;
  confidence_level: 'low' | 'medium' | 'high';
  pattern_id: string;
  can_accept: boolean;
}

export class VisitPatternService {
  /**
   * Analyze visit history for a circle and extract patterns
   */
  async analyzeCirclePatterns(circleId: string, analysisDays: number = 30): Promise<{ success: boolean; error?: string }> {
    try {
      // Call the database function to analyze patterns
      const { error } = await supabase.rpc('analyze_visit_patterns', {
        circle_uuid: circleId,
        analysis_days: analysisDays
      });

      if (error) {
        console.error('Pattern analysis error:', error);
        return { success: false, error: error.message };
      }

      // Clean up expired suggestions while we're here
      await this.cleanupExpiredSuggestions();

      return { success: true };
    } catch (error) {
      console.error('Error analyzing patterns:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Pattern analysis failed' 
      };
    }
  }

  /**
   * Get learned patterns for a circle
   */
  async getCirclePatterns(circleId: string): Promise<VisitPattern[]> {
    try {
      const { data, error } = await supabase
        .from('visit_patterns')
        .select(`
          *,
          visitor:users(id, full_name, email)
        `)
        .eq('circle_id', circleId)
        .gte('confidence_level', 'medium') // Only return meaningful patterns
        .order('consistency_score', { ascending: false });

      if (error) {
        console.error('Error fetching patterns:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCirclePatterns:', error);
      return [];
    }
  }

  /**
   * Generate intelligent visit suggestions for the upcoming week
   */
  async generateWeekSuggestions(circleId: string): Promise<VisitSuggestion[]> {
    try {
      const patterns = await this.getCirclePatterns(circleId);
      if (patterns.length === 0) return [];

      const suggestions: VisitSuggestion[] = [];
      const currentDate = new Date();
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);

      // Get existing visits for the week to avoid conflicts
      const { data: existingVisits } = await supabase
        .from('visits')
        .select('visit_date, start_time, end_time, visitor_id')
        .eq('circle_id', circleId)
        .gte('visit_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('visit_date', format(weekEnd, 'yyyy-MM-dd'));

      // Get existing suggestions to avoid duplicates
      const { data: existingSuggestions } = await supabase
        .from('pattern_suggestions')
        .select('visitor_id, suggested_date')
        .eq('circle_id', circleId)
        .eq('status', 'pending')
        .gte('suggested_date', format(weekStart, 'yyyy-MM-dd'));

      const existingMap = new Set(
        (existingSuggestions || []).map(s => `${s.visitor_id}-${s.suggested_date}`)
      );

      // Process patterns to generate suggestions
      for (const pattern of patterns) {
        if (pattern.pattern_type === 'day_preference' && pattern.day_of_week !== undefined) {
          const suggestion = await this.generateDayPreferenceSuggestion(
            pattern,
            circleId,
            weekStart,
            weekEnd,
            existingVisits || [],
            existingMap
          );
          
          if (suggestion) {
            suggestions.push(suggestion);
          }
        }
      }

      // Limit to 3 suggestions max to avoid overwhelming users
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Generate a suggestion based on day preference pattern
   */
  private async generateDayPreferenceSuggestion(
    pattern: VisitPattern,
    circleId: string,
    weekStart: Date,
    weekEnd: Date,
    existingVisits: any[],
    existingMap: Set<string>
  ): Promise<VisitSuggestion | null> {
    if (pattern.day_of_week === undefined) return null;

    // Find the next occurrence of this day in the week
    const targetDay = addDays(weekStart, pattern.day_of_week);
    
    // Skip if it's in the past
    if (targetDay < new Date()) return null;

    const dateString = format(targetDay, 'yyyy-MM-dd');
    const suggestionKey = `${pattern.visitor_id}-${dateString}`;

    // Skip if we already have a suggestion for this visitor on this day
    if (existingMap.has(suggestionKey)) return null;

    // Check if visitor already has a visit scheduled this day
    const hasVisit = existingVisits.some(v => 
      v.visitor_id === pattern.visitor_id && v.visit_date === dateString
    );
    if (hasVisit) return null;

    // Determine suggested time (use pattern or reasonable default)
    const suggestedStartTime = pattern.preferred_start_time || '14:00'; // 2 PM default
    const suggestedEndTime = this.calculateEndTime(
      suggestedStartTime, 
      pattern.preferred_duration_minutes || 60
    );

    // Check for time conflicts
    const hasTimeConflict = existingVisits.some(v => 
      v.visit_date === dateString && 
      this.timesOverlap(suggestedStartTime, suggestedEndTime, v.start_time, v.end_time)
    );

    if (hasTimeConflict) {
      // Try to find an alternative time
      const alternativeTime = this.findAlternativeTime(
        existingVisits.filter(v => v.visit_date === dateString),
        pattern.preferred_duration_minutes || 60
      );
      
      if (!alternativeTime) return null;
      
      return {
        id: `suggestion-${pattern.id}-${dateString}`,
        visitor_id: pattern.visitor_id,
        visitor_name: pattern.visitor?.full_name || 'Unknown',
        suggested_date: dateString,
        suggested_start_time: alternativeTime.start,
        suggested_end_time: alternativeTime.end,
        suggestion_reason: this.buildSuggestionReason(pattern, 'alternative_time'),
        confidence_level: pattern.confidence_level,
        pattern_id: pattern.id,
        can_accept: true
      };
    }

    return {
      id: `suggestion-${pattern.id}-${dateString}`,
      visitor_id: pattern.visitor_id,
      visitor_name: pattern.visitor?.full_name || 'Unknown',
      suggested_date: dateString,
      suggested_start_time: suggestedStartTime,
      suggested_end_time: suggestedEndTime,
      suggestion_reason: this.buildSuggestionReason(pattern, 'day_preference'),
      confidence_level: pattern.confidence_level,
      pattern_id: pattern.id,
      can_accept: true
    };
  }

  /**
   * Accept a pattern suggestion and create the visit
   */
  async acceptSuggestion(
    suggestion: VisitSuggestion, 
    circleId: string, 
    userId: string
  ): Promise<{ success: boolean; visitId?: string; error?: string }> {
    try {
      // Create the visit
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .insert({
          circle_id: circleId,
          visitor_id: suggestion.visitor_id,
          visit_date: suggestion.suggested_date,
          start_time: suggestion.suggested_start_time,
          end_time: suggestion.suggested_end_time,
          notes: `Scheduled based on visit pattern`,
          status: 'scheduled'
        })
        .select()
        .single();

      if (visitError) {
        return { success: false, error: visitError.message };
      }

      // Store the suggestion as accepted
      await supabase
        .from('pattern_suggestions')
        .insert({
          circle_id: circleId,
          visitor_id: suggestion.visitor_id,
          pattern_id: suggestion.pattern_id,
          suggested_date: suggestion.suggested_date,
          suggested_start_time: suggestion.suggested_start_time,
          suggested_end_time: suggestion.suggested_end_time,
          suggestion_reason: suggestion.suggestion_reason,
          status: 'accepted',
          responded_at: new Date().toISOString()
        });

      // Update pattern statistics (acceptance)
      await this.updatePatternStats(suggestion.pattern_id, 'accepted');

      return { success: true, visitId: visit.id };
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to accept suggestion' 
      };
    }
  }

  /**
   * Reject a pattern suggestion
   */
  async rejectSuggestion(
    suggestion: VisitSuggestion, 
    circleId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Store the suggestion as rejected
      await supabase
        .from('pattern_suggestions')
        .insert({
          circle_id: circleId,
          visitor_id: suggestion.visitor_id,
          pattern_id: suggestion.pattern_id,
          suggested_date: suggestion.suggested_date,
          suggested_start_time: suggestion.suggested_start_time,
          suggested_end_time: suggestion.suggested_end_time,
          suggestion_reason: suggestion.suggestion_reason,
          status: 'rejected',
          responded_at: new Date().toISOString()
        });

      // Update pattern statistics (rejection)
      await this.updatePatternStats(suggestion.pattern_id, 'rejected');

      return { success: true };
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to reject suggestion' 
      };
    }
  }

  /**
   * Update pattern statistics based on user response
   */
  private async updatePatternStats(patternId: string, response: 'accepted' | 'rejected'): Promise<void> {
    try {
      const field = response === 'accepted' ? 'acceptance_count' : 'rejection_count';
      
      await supabase
        .from('visit_patterns')
        .update({
          [field]: supabase.rpc('increment_field', { field_name: field }),
          suggestion_count: supabase.rpc('increment_field', { field_name: 'suggestion_count' })
        })
        .eq('id', patternId);
    } catch (error) {
      console.error('Error updating pattern stats:', error);
    }
  }

  /**
   * Helper functions
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return format(endDate, 'HH:mm');
  }

  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && start2 < end1;
  }

  private findAlternativeTime(
    existingVisits: any[], 
    durationMinutes: number
  ): { start: string; end: string } | null {
    // Try common visit times: 10 AM, 2 PM, 4 PM, 6 PM
    const alternatives = ['10:00', '14:00', '16:00', '18:00'];
    
    for (const startTime of alternatives) {
      const endTime = this.calculateEndTime(startTime, durationMinutes);
      
      const hasConflict = existingVisits.some(v => 
        this.timesOverlap(startTime, endTime, v.start_time, v.end_time)
      );
      
      if (!hasConflict) {
        return { start: startTime, end: endTime };
      }
    }
    
    return null;
  }

  private buildSuggestionReason(pattern: VisitPattern, reasonType: string): string {
    const visitorName = pattern.visitor?.full_name || 'This visitor';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    switch (reasonType) {
      case 'day_preference':
        const dayName = pattern.day_of_week !== undefined ? dayNames[pattern.day_of_week] : 'this day';
        const percentage = Math.round(pattern.consistency_score * 100);
        return `${visitorName} usually visits on ${dayName}s (${percentage}% of the time)`;
      
      case 'alternative_time':
        return `${visitorName} prefers this day, suggested alternative time to avoid conflicts`;
      
      default:
        return `Based on ${visitorName}'s visiting patterns`;
    }
  }

  private async cleanupExpiredSuggestions(): Promise<void> {
    try {
      await supabase.rpc('cleanup_expired_suggestions');
    } catch (error) {
      console.error('Error cleaning up expired suggestions:', error);
    }
  }
}