# Database Setup for Likes and Comments

## 🚀 Quick Setup

To enable persistent likes and comments, you need to run the database migration:

### 1. Run the Migration
```sql
-- Copy and paste the contents of database-migration.sql into your Supabase SQL Editor
-- Or run it via the Supabase CLI: supabase db push
```

### 2. What's Been Implemented

✅ **Likes System**
- API endpoint: `POST /api/posts/[id]/like`
- Toggles like/unlike with optimistic UI
- Persists to Supabase database
- Updates cache with new like counts

✅ **Comments System** 
- API endpoints: `GET/POST/DELETE /api/posts/[id]/comments`
- Real-time comment posting and deletion
- User authentication required
- Updates cache with comment counts

✅ **Frontend Updates**
- PostCard component now persists likes
- New Comments component with full functionality
- Post detail page shows persistent comments
- Optimistic UI updates for better UX

### 3. Features

- **Authentication**: Users must be logged in to like/comment
- **Optimistic UI**: Instant feedback while API calls complete
- **Error Handling**: Graceful fallback if API fails
- **Cache Updates**: Post counts updated in real-time
- **Responsive Design**: Mobile-friendly comment interface
- **Delete Own Comments**: Users can delete their own comments
- **Character Limits**: Comments max 1000 characters

### 4. Database Tables Created

- `profiles` - User profile information
- `post_likes` - Like records with post_id and user_id
- `post_comments` - Comment records with content and timestamps

### 5. Security

- Row Level Security (RLS) enabled
- Users can only modify their own likes/comments
- Public read access for viewing likes/comments

## 🎯 Testing

1. **Test Likes**: Click like button on any post - should persist after refresh
2. **Test Comments**: Add comments on post detail page - should persist after refresh  
3. **Test Authentication**: Like/comment buttons should require login
4. **Test Error Handling**: Try with network disabled - should show graceful fallback

## 🔧 Troubleshooting

If likes/comments don't persist:
1. Check Supabase database migration ran successfully
2. Verify environment variables are set
3. Check browser console for API errors
4. Ensure user is authenticated

The system is now ready for persistent user engagement! 🎉
