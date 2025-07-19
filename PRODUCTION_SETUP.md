# 🚀 TouchPoints Production Setup Guide

## URGENT: Complete These Steps for Immediate Testing

### Step 1: Database Migrations (5 minutes)

Go to **https://supabase.com/dashboard/project/wuhafoazneztarvoxphj/sql/new** and run each SQL file **in order**:

1. **20250719010625_tight_block.sql** - Core tables and security
2. **20250719020000_calendar_sync.sql** - Calendar integration
3. **20250719030000_visit_patterns.sql** - Pattern recognition
4. **20250719040000_enhanced_visit_notes.sql** - Enhanced notes & mood
5. **20250719050000_photo_storage.sql** - Photo storage setup
6. **20250719060000_notifications_system.sql** - Notification system

### Step 2: Create Storage Buckets

In **https://supabase.com/dashboard/project/wuhafoazneztarvoxphj/storage/buckets**:

1. Create bucket: `visit-photos`
   - Private bucket
   - 5MB file size limit
   - MIME types: `image/jpeg, image/png, image/webp, image/heic`

2. Create bucket: `voice-notes`
   - Private bucket  
   - 10MB file size limit
   - MIME types: `audio/mp3, audio/wav, audio/m4a, audio/webm`

### Step 3: Update Vercel Environment Variables

In **https://vercel.com/ourania-ka-llc/touchpoints/settings/environment-variables**:

```
VITE_SUPABASE_URL=https://wuhafoazneztarvoxphj.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key-from-supabase]
```

### Step 4: Update Supabase Auth Settings

In **https://supabase.com/dashboard/project/wuhafoazneztarvoxphj/auth/url-configuration**:

- **Site URL**: `https://touchpoints-q574w7jdt-ourania-ka-llc.vercel.app`
- **Additional redirect URLs**: 
  - `https://touchpoints-q574w7jdt-ourania-ka-llc.vercel.app/**`
  - `https://touchpoints.vercel.app/**`

## 📱 Quick Start Testing Guide

### For iPhone (Brother):
1. Open **Safari** (must be Safari for PWA)
2. Go to: `https://touchpoints-q574w7jdt-ourania-ka-llc.vercel.app`
3. Tap **Share** → **Add to Home Screen**
4. Sign up with email/password
5. Create care circle for mom

### For Android (You):
1. Open **Chrome**
2. Go to: `https://touchpoints-q574w7jdt-ourania-ka-llc.vercel.app`
3. Tap **"Add to Home Screen"** when prompted
4. Sign up with same family email domain
5. Join the care circle

## ✅ Testing Checklist

- [ ] Database migrations completed
- [ ] Storage buckets created
- [ ] Environment variables updated
- [ ] Auth URLs configured
- [ ] PWA installs on iPhone
- [ ] PWA installs on Android
- [ ] User signup works
- [ ] Care circle creation works
- [ ] Visit scheduling works
- [ ] Photo upload works
- [ ] Notifications work

## 🆘 If Something Breaks

1. Check Supabase logs: **https://supabase.com/dashboard/project/wuhafoazneztarvoxphj/logs/explorer**
2. Check Vercel logs: **https://vercel.com/ourania-ka-llc/touchpoints/functions**
3. Clear browser cache and try again

## 🎯 Demo Data Setup (Optional)

After basic setup works, you can add demo data:

```sql
-- Sample care circle
INSERT INTO care_circles (patient_first_name, patient_last_name, facility_name, room_number, created_by) 
VALUES ('Jane', 'Doe', 'Sunny Acres Care Center', '234', '[your-user-id]');

-- Sample visit
INSERT INTO visits (circle_id, visitor_id, visit_date, start_time, end_time, notes)
VALUES ('[circle-id]', '[user-id]', '2025-07-20', '14:00', '16:00', 'Great visit! Mom was very alert and happy.');
```

## 🚀 PRIORITY ORDER:
1. Run migrations (2 min)
2. Create storage buckets (1 min) 
3. Update environment variables (1 min)
4. Test PWA installation (1 min)
5. Test basic functionality (5 min)

**Total setup time: ~10 minutes**