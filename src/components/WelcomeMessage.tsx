import React from 'react';
import { Heart, Shield, Clock, Users } from 'lucide-react';
import { Card } from './ui/Card';

interface WelcomeMessageProps {
  userName?: string;
  className?: string;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  userName,
  className = ''
}) => {
  return (
    <Card className={`p-6 mb-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20 ${className}`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Heart className="w-8 h-8 text-primary" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-text mb-3">
          Welcome to TouchPoints{userName ? `, ${userName}` : ''}! 🎉
        </h2>
        
        <p className="text-textSecondary mb-6 max-w-2xl mx-auto">
          You're about to transform how your family coordinates care visits. TouchPoints helps you 
          stay organized, share memories, and ensure your loved one always has company.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-text mb-1">Coordinate Family</h3>
              <p className="text-sm text-textSecondary">
                Create care circles and invite family members to schedule visits together.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-secondary/10 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h3 className="font-semibold text-text mb-1">Smart Scheduling</h3>
              <p className="text-sm text-textSecondary">
                AI learns your family's patterns to suggest optimal visit times.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
              <Shield className="w-5 h-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold text-text mb-1">Preserve Memories</h3>
              <p className="text-sm text-textSecondary">
                Capture photos, voice notes, and mood tracking during each visit.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-primary/5 rounded-lg">
          <p className="text-sm text-textSecondary">
            <strong>Pro tip:</strong> Install this app on your phone's home screen for instant access, 
            even in hospitals with poor WiFi! 📱
          </p>
        </div>
      </div>
    </Card>
  );
};