# Google Calendar Integration Setup

This guide walks you through setting up Google Calendar integration for TouchPoints.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. TouchPoints application running locally
3. Supabase project set up

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Configure the application:
   - **Name**: TouchPoints Calendar Integration
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:5173/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)

5. Click "Create" and save your Client ID and Client Secret

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` if you haven't already
2. Add your Google credentials:

```bash
# Google Calendar Integration
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret_here
VITE_GOOGLE_API_KEY=your_google_api_key_here
```

## Step 4: Run Database Migration

Apply the calendar sync migration to your Supabase database:

```sql
-- Run the contents of supabase/migrations/20250719020000_calendar_sync.sql
-- in your Supabase SQL editor
```

## Step 5: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the dashboard
3. You should see the "Connect Google Calendar" section
4. Click "Connect Google Calendar" to test the OAuth flow

## Features Included

✅ **OAuth 2.0 Authentication**: Secure token-based authentication with Google
✅ **Automatic Event Creation**: Visits are automatically added to Google Calendar
✅ **Two-way Sync**: Updates in TouchPoints reflect in Google Calendar
✅ **Smart Event Details**: 
   - Title: "Visit [Patient Name]"
   - Location: "[Facility Name], Room [Room Number]"
   - Description: Visit notes + TouchPoints link
   - Reminders: 1 hour and 15 minutes before visit

✅ **Error Handling**: Calendar sync failures don't break core functionality
✅ **Token Management**: Automatic refresh token handling
✅ **Privacy**: Secure token storage in Supabase

## Security Considerations

### Production Deployment

**Important**: Before deploying to production:

1. **Encrypt Tokens**: The current implementation stores tokens in plain text. In production, implement encryption:
   ```typescript
   // TODO: Implement token encryption
   access_token_encrypted: encrypt(tokens.access_token)
   refresh_token_encrypted: encrypt(tokens.refresh_token)
   ```

2. **Update OAuth Redirect URIs**: Add your production domain to Google Cloud Console

3. **Secure API Keys**: Use environment variables, never commit keys to version control

4. **Rate Limiting**: Implement rate limiting for calendar API calls

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch" error**
   - Ensure your redirect URI in Google Console matches exactly
   - Check for trailing slashes and http vs https

2. **"invalid_grant" error**
   - Token has expired, user needs to reconnect
   - Check token refresh logic

3. **Calendar events not appearing**
   - Verify user has granted calendar permissions
   - Check sync status in database

4. **OAuth popup blocked**
   - Ensure popup blockers allow the OAuth window
   - Consider using redirect flow instead of popup

### Debug Mode

Enable debug logging by setting:
```bash
VITE_DEBUG_MODE=true
```

This will log calendar sync operations to the browser console.

## API Rate Limits

Google Calendar API has the following limits:
- 1,000,000 queries per day
- 100 queries per 100 seconds per user

TouchPoints is designed to stay well within these limits through:
- Efficient batching of operations
- Caching of calendar data
- Graceful error handling

## Next Steps

Consider implementing these additional features:

1. **Conflict Detection**: Check for calendar conflicts before scheduling
2. **Bulk Sync**: Sync existing visits to calendar
3. **Calendar Selection**: Allow users to choose which calendar to sync to
4. **Timezone Handling**: Improved timezone support for families in different locations
5. **Outlook Integration**: Support for Microsoft 365 calendars

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Google Cloud Console configuration
3. Ensure environment variables are set correctly
4. Test with a fresh browser session to clear any cached auth state