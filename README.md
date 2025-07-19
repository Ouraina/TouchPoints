# TouchPoints - Family Visit Coordination

TouchPoints is a web application designed to help families coordinate visits to loved ones in hospitals, hospice, or care facilities. The core mission is preventing empty visiting hours and ensuring someone is always there when possible.

## Features

**Core Features**:
- **Quick Setup**: Create a care circle in under 2 minutes during emergencies
- **Smart Scheduling**: Visual calendar showing available and scheduled visit slots
- **Conflict Prevention**: Automatic detection of scheduling conflicts
- **Family Invitations**: Easy sharing via links to invite family and friends
- **Visit Management**: Schedule, edit, and cancel visits with notes
- **Real-time Updates**: Instant notifications for visit changes
- **Mobile Optimized**: Responsive design that works perfectly on mobile devices

**Design Elements**:
- **Calming Color Palette**: Soft blues and greens designed for stressful situations
- **Large Touch Targets**: Easy interaction for users in emotional situations
- **Clear Visual Hierarchy**: Important information stands out immediately
- **Accessible Design**: High contrast ratios and readable fonts
- **Progressive Disclosure**: Simple interface that reveals complexity when needed

## Getting Started

### Prerequisites

- Node.js 18 or higher
- A Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd touchpoints
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the database:
   - Connect to your Supabase project
   - Run the migration file in `supabase/migrations/create_touchpoints_schema.sql`
   - This will create all necessary tables, security policies, and triggers

5. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

The application requires Supabase with the following key features:
- **Row Level Security**: Ensures families can only access their own data
- **Real-time Subscriptions**: Updates the UI when visit schedules change
- **User Authentication**: Email/password authentication with user profiles
- **Automatic Conflict Prevention**: Database constraints prevent double-booking

### User Flows

#### Emergency Setup (< 2 minutes)
1. **Quick Signup**: Email and password
2. **Patient Info**: Just first/last name required
3. **First Visit**: One-tap scheduling for immediate coverage
4. **Invite Family**: Share link via SMS or copy/paste

#### Daily Usage
1. **Calendar View**: See the week at a glance
2. **Empty Slot Alerts**: Visual indicators for uncovered time periods
3. **Quick Scheduling**: Tap any slot to claim it
4. **Visit Updates**: Add notes and status updates

## Technical Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive design
- **React Router** for navigation
- **Lucide React** for consistent icons
- **Date-fns** for date manipulation

### Backend
- **Supabase** for database, authentication, and real-time updates
- **PostgreSQL** with Row Level Security
- **Automatic conflict prevention** via database constraints

### Key Design Decisions
- **Mobile-first**: Designed for use in hospital waiting rooms
- **Offline-friendly**: Critical features work without internet
- **Fast loading**: Optimized for slower hospital wifi
- **Error resilient**: Graceful handling of network issues

## Security & Privacy

- **End-to-end data isolation**: Families cannot access other families' data
- **HIPAA-conscious design**: No medical information stored
- **Minimal data collection**: Only essential coordination information
- **Secure authentication**: Supabase handles all auth security

## Contributing

This is an MVP designed to validate the core concept. The focus is on:
1. **Simplicity**: Every feature must be essential
2. **Reliability**: Core flows must work flawlessly
3. **Speed**: Setup and daily use must be fast
4. **Accessibility**: Usable during emotional, stressful situations

## Support

For support, please contact the development team or create an issue in the repository.

## License

This project is licensed under the MIT License.