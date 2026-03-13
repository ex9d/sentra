# News System Documentation

## Overview

The news system is a dual-mode feed that displays both external tweets and admin announcements. It supports subscription-based access control using KeyAuth license types.

## Features

### 1. **Announcement System**
- **Admin Creation**: Admins can create and post announcements via the admin panel
- **Public/Private**: Announcements can be marked as "Admin Only" to restrict visibility
- **Storage**: Announcements are stored locally in user data folder (`announcements.json`)
- **History**: All announcements are preserved with creation timestamps

### 2. **Access Control**
- **Default Users**: See public announcements and tweets
- **Admin Users**: See all announcements (including admin-only) and tweets
- **KeyAuth Integration**: Uses the `Account.isAdmin` flag from KeyAuth

### 3. **User Interface**
- **Admin Panel**: Floating button (bottom-right) for admins only
- **Post Badge**: Announcements marked with "ANNOUNCEMENT" badge with optional "(Admin Only)" label
- **Feed Merge**: Announcements appear at the top of the feed in chronological order

## Components

- **Props**: 
  - `username`: Current user's display name
  - `onAnnouncementCreated`: Callback after successful creation
- **Features**:
  - Text area for announcement content
  - Toggle for admin-only visibility
  - Error/success feedback
  - Character count

### `NewsCard.tsx`
Displays individual news items (tweets or announcements)
- **Features**:
  - Different styling for announcements
  - Announcement badge with admin-only label
  - No engagement metrics for announcements
  - Thread support for tweets

### `NewsFeed.tsx`
Main feed component
- **Features**:
  - Fetches announcements and tweets in parallel
  - Automatically shows admin panel for admins
  - Cache invalidation on new announcement
  - Error handling

## Data Structures

### Announcement Interface
```typescript
interface Announcement {
  id: string              // UUID
  content: string         // Announcement text
  createdAt: string       // ISO timestamp
  updatedAt: string       // ISO timestamp
  adminOnly: boolean      // Visibility restriction
  createdBy: string       // Admin username
  media?: Array<{         // Optional media
    type: 'image' | 'video'
    url: string
    alt?: string
  }>
}
```

### NewsPost Type Extension
```typescript
interface NewsPost {
  // ... existing fields ...
  type?: 'tweet' | 'announcement'
  subscriptionRequired?: SubscriptionType
  adminOnly?: boolean
}
```

## IPC Handlers

### Main Process Handlers (`NewsController.ts`)

- `news:get` → Fetch tweets from external API
- `news:get-announcements` (isAdmin) → Get announcements with filtering
- `news:create-announcement` (content, username, adminOnly, media) → Create announcement
- `news:delete-announcement` (id) → Delete announcement
- `news:update-announcement` (id, updates) → Update announcement

## Service Layer

### `AnnouncementService`
Handles all announcement persistence and retrieval

**Methods**:
- `getAnnouncements(adminOnly)` - Get filtered announcements
- `createAnnouncement(content, createdBy, adminOnly, media)` - Create new
- `deleteAnnouncement(id)` - Delete by ID
- `updateAnnouncement(id, updates)` - Update fields
- `ensureFile()` - Initialize storage

## KeyAuth Integration

The news system leverages the existing KeyAuth integration:

1. **User Authentication**: Handled by auth module
2. **License Type Detection**: KeyAuth returns user data including subscription tier
3. **Admin Flag**: Set in `Account.isAdmin` based on license type
4. **News Filtering**: System checks `Account.isAdmin` to:
   - Show/hide admin panel
   - Filter announcements by visibility
   - Display appropriate UI elements

### Setting Up Admin Users in KeyAuth

To mark a user as admin in your KeyAuth dashboard:
1. Go to your application's user management
2. Select the user
3. Set their subscription/license type to "admin"
4. When they log in, `Account.isAdmin` will be true

## Adding Media to Announcements

Currently, the system supports media in announcements (images/videos), but the admin panel UI doesn't expose this. To add media support to the admin panel:

2. Convert files to URLs (use your media service)
3. Pass media array to `createAnnouncement`

## Testing

### Manual Testing Checklist
- [ ] Admin can see "Post Announcement" button
- [ ] Non-admin doesn't see "Post Announcement" button
- [ ] Admin can create public announcement
- [ ] Admin can create admin-only announcement
- [ ] Public announcement visible to all users
- [ ] Admin-only announcement hidden from non-admins
- [ ] Announcement appears at top of feed
- [ ] Tweets from external API display normally
- [ ] "ANNOUNCEMENT" badge shows on admin posts
- [ ] Engagement metrics hidden for announcements

## Future Enhancements

1. **Media Support**: Add image/video uploads to announcements
2. **Edit Announcements**: Allow admins to edit existing announcements
3. **Delete Confirmation**: Add confirmation dialog for deletion
4. **Scheduled Announcements**: Add date/time scheduling
5. **Announcement Analytics**: Track announcement views/reactions
6. **Rich Text Editor**: Support markdown or rich text formatting
7. **Pinned Announcements**: Allow pinning important announcements
8. **Announcement Categories**: Organize announcements by type
