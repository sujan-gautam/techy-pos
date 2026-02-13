# Implementation Plan: Loading Skeletons, SEO & Admin Settings

## Phase 1: Loading Skeletons ✅ COMPLETED

### 1.1 Create Reusable Skeleton Components ✅
- [x] `components/skeletons/TableSkeleton.jsx` - For inventory, jobs, usage logs tables
- [x] `components/skeletons/CardSkeleton.jsx` - For dashboard cards
- [x] `components/skeletons/ListSkeleton.jsx` - For search results, dropdowns
- [x] `components/skeletons/index.js` - Export file for easy imports

### 1.2 Implement Skeletons in Key Pages ✅
- [x] Dashboard - Card skeletons for stats + chart placeholders
- [x] Inventory - Table skeleton with header
- [x] Jobs - Table skeleton with header and button placeholder
- [x] UsageLogs - List skeleton with filter placeholders
- [x] UseParts - Grid skeleton with list items

## Phase 2: SEO Optimization

### 2.1 Backend - Site Settings Model
Create `SiteSettings` model with:
- Site name
- Site description
- Logo URL
- Favicon URL
- Meta keywords
- Social media links
- Contact information
- Business hours

### 2.2 Backend - Settings API
- [ ] `GET /api/settings` - Public endpoint for site settings
- [ ] `PUT /api/settings` - Admin-only endpoint to update settings
- [ ] `POST /api/settings/upload-logo` - Upload logo/favicon

### 2.3 Frontend - SEO Components
- [ ] `components/SEO/MetaTags.jsx` - Dynamic meta tags component
- [ ] Update `index.html` with proper structure
- [ ] Add Open Graph tags
- [ ] Add Twitter Card tags
- [ ] Add JSON-LD structured data

### 2.4 Frontend - Settings Context
- [ ] Create `SiteSettingsContext` to provide settings app-wide
- [ ] Fetch settings on app load
- [ ] Use settings for logo, title, etc.

## Phase 3: Admin Settings Panel

### 3.1 Admin Settings Page
Create `pages/AdminSettings.jsx` with tabs:
- **General** - Site name, description
- **Branding** - Logo upload, favicon, colors
- **SEO** - Meta tags, keywords, social links
- **Business** - Contact info, hours, address

### 3.2 Logo Upload Functionality
- [ ] File upload component
- [ ] Image preview
- [ ] Backend storage (local or cloud)
- [ ] Update navbar to use dynamic logo

## Implementation Order

1. **Start with Skeletons** (Quick win, immediate UX improvement)
2. **Backend Settings Model & API** (Foundation)
3. **Frontend Settings Context** (Integration)
4. **Admin Settings Panel** (UI)
5. **SEO Components** (Enhancement)

## Technical Notes

- Use `react-helmet-async` for dynamic meta tags
- Store uploaded files in `backend/uploads/` or use cloud storage
- Cache site settings in frontend to reduce API calls
- Implement proper image optimization for logos
