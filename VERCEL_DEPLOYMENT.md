# Vercel Deployment Guide for ExpandNote

This guide will help you deploy your ExpandNote app to Vercel.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Your Supabase credentials (already configured)
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Step 1: Push Your Code to Git

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit your changes
git commit -m "Initial commit: ExpandNote app with Supabase"

# Add your remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/expandnote.git

# Push to main branch
git push -u origin main
```

#### Step 2: Import Project to Vercel

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Vercel will auto-detect Next.js

#### Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

| Variable Name | Value | Where to Find |
|--------------|-------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dtgxsrpxxdhzjaxevhwp.supabase.co` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJI...` | Your Supabase anon/public key |

**To add environment variables:**
1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable for **Production**, **Preview**, and **Development**
4. Click **"Save"**

#### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your app
3. You'll get a production URL like: `https://expandnote.vercel.app`

#### Step 5: Configure Supabase Redirect URLs

After deployment, add your Vercel URL to Supabase allowed URLs:

1. Go to https://supabase.com/dashboard/project/dtgxsrpxxdhzjaxevhwp/auth/url-configuration
2. Add these URLs to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/*` (for all routes)
3. Click **"Save"**

---

### Option 2: Deploy via Vercel CLI

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

The CLI will prompt you to set environment variables during first deployment.

---

## Build Settings

Vercel will auto-detect these settings (already configured in `vercel.json`):

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

## Environment Variables Required

### Production Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://dtgxsrpxxdhzjaxevhwp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0Z3hzcnB4eGRoempheGV2aHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4ODAwMzUsImV4cCI6MjA3NjQ1NjAzNX0.uyJBDnVtXLgLU1kYRI3kUa9mTFMpcG5TmZzfaSkgcbY
```

### Optional Future Variables

When you implement AI features, you'll need to add:

```env
# These will be stored in user_settings table, not in Vercel env vars
# Users will provide their own API keys via the app settings
```

---

## Vercel Deployment Features

### Automatic Deployments

- Every push to `main` branch → Production deployment
- Every push to other branches → Preview deployment
- Pull requests → Preview deployments with unique URLs

### Preview Deployments

- Each PR gets its own URL: `https://expandnote-git-feature-username.vercel.app`
- Test changes before merging to production

### Custom Domain (Optional)

1. Go to your Vercel project → **"Settings"** → **"Domains"**
2. Add your custom domain (e.g., `expandnote.com`)
3. Follow Vercel's DNS configuration instructions
4. Update Supabase redirect URLs to include your custom domain

---

## Post-Deployment Checklist

After your first deployment:

- [ ] Verify the app loads at your Vercel URL
- [ ] Test Supabase connection (check browser console for errors)
- [ ] Add Vercel URLs to Supabase redirect URLs
- [ ] Test authentication flow (sign up, login, logout)
- [ ] Check that environment variables are properly set
- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics (optional, in project settings)

---

## Troubleshooting

### Build Fails

**Issue**: Build command fails
**Solution**: Check build logs in Vercel dashboard, ensure all dependencies are in `package.json`

### Environment Variables Not Working

**Issue**: Supabase connection fails
**Solution**:
1. Verify environment variables are set in Vercel dashboard
2. Make sure variable names start with `NEXT_PUBLIC_` for client-side access
3. Redeploy after adding environment variables

### Authentication Redirect Issues

**Issue**: Auth redirect fails after login
**Solution**:
1. Add your Vercel URL to Supabase redirect URLs
2. Include wildcard: `https://your-app.vercel.app/*`

### Middleware Issues

**Issue**: Middleware not running
**Solution**: Check that `src/middleware.ts` is in the correct location (Next.js 13+ App Router)

---

## Monitoring & Performance

### Vercel Analytics

Enable in project settings:
- **Analytics**: Track page views, performance metrics
- **Speed Insights**: Monitor Core Web Vitals
- **Real User Monitoring**: Track actual user experience

### Logs

View deployment logs:
- Go to **Deployments** tab in Vercel dashboard
- Click on any deployment to see build and runtime logs

---

## Continuous Integration

### Recommended Setup

1. **Development**: Local dev server
2. **Preview**: Automatic preview deployments for PRs
3. **Production**: Deploy from `main` branch

### Branch Strategy

```
main (production)
  ├── develop (preview)
  └── feature/* (preview)
```

---

## Cost Considerations

### Vercel Free Tier Includes:
- Unlimited deployments
- 100 GB bandwidth per month
- Automatic HTTPS
- Preview deployments
- Serverless functions

**Current project should fit within free tier for MVP testing.**

For production scale, monitor usage and upgrade if needed.

---

## Next Steps After Deployment

1. Share your Vercel URL with testers
2. Continue development with automatic deployments
3. Monitor performance and errors in Vercel dashboard
4. Add custom domain when ready for production
5. Set up monitoring and error tracking (e.g., Sentry)

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase + Vercel**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- **Vercel Support**: https://vercel.com/support

---

**Ready to deploy!** Follow Option 1 for the easiest deployment experience.
