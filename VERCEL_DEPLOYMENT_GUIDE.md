# Vercel Deployment Guide - Frontend

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Your backend API deployed and accessible (e.g., on Render, Railway, or Heroku)
- Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare Your Frontend

### 1.1 Verify vercel.json Configuration
Your `coach-crew-manager-main/vercel.json` should contain:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 1.2 Environment Variables
You need to set the `VITE_API_URL` environment variable to point to your deployed backend.

Example:
- Local: `http://localhost:5000`
- Production: `https://your-backend-api.onrender.com` (or your backend URL)

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Your Repository**
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select your repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `coach-crew-manager-main` (IMPORTANT!)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-api-url.com` (your deployed backend URL)
   - Select all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 1-2 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd coach-crew-manager-main
   ```

4. **Deploy**
   ```bash
   vercel
   ```

5. **Follow Prompts**
   - Set up and deploy: Yes
   - Which scope: Select your account
   - Link to existing project: No
   - Project name: (press enter for default)
   - Directory: `./` (current directory)
   - Override settings: No

6. **Add Environment Variables**
   ```bash
   vercel env add VITE_API_URL
   ```
   - Enter your backend API URL
   - Select all environments

7. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Environment Variables

### Required Environment Variables:
- `VITE_API_URL`: Your backend API URL (e.g., `https://your-api.onrender.com`)

### Optional (if using Supabase):
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon/public key

## Step 4: Update Backend CORS

Your backend needs to allow requests from your Vercel domain.

In your backend `server.js` or `app.js`, update CORS configuration:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',  // Local development
    'https://your-app.vercel.app',  // Your Vercel domain
    'https://your-custom-domain.com'  // If you have a custom domain
  ],
  credentials: true
}));
```

## Step 5: Test Your Deployment

1. **Visit Your Vercel URL**
   - Vercel will provide a URL like: `https://your-app.vercel.app`

2. **Test Key Features**
   - Login functionality
   - API calls to backend
   - Image uploads (team logo, player photos)
   - All authenticated routes (admin, coach, player)

3. **Check Browser Console**
   - Look for any CORS errors
   - Verify API calls are going to correct backend URL

## Common Issues & Solutions

### Issue 1: "Invalid vercel.json"
**Solution**: Make sure your vercel.json is valid JSON with no syntax errors. Use the configuration provided above.

### Issue 2: API Calls Failing (404 or Network Error)
**Solution**: 
- Verify `VITE_API_URL` environment variable is set correctly in Vercel
- Make sure it includes the protocol (https://) and no trailing slash
- Redeploy after adding environment variables

### Issue 3: CORS Errors
**Solution**: 
- Update your backend CORS configuration to include your Vercel domain
- Redeploy your backend after updating CORS

### Issue 4: Images Not Loading
**Solution**: 
- Verify `VITE_API_URL` is set correctly
- Check that your backend is serving static files correctly
- Ensure image paths in database include leading slash (e.g., `/uploads/logo.png`)

### Issue 5: 404 on Page Refresh
**Solution**: 
- Verify the `rewrites` configuration in vercel.json is correct
- This should already be handled by the provided vercel.json

### Issue 6: Environment Variables Not Working
**Solution**: 
- Environment variables must start with `VITE_` to be exposed to the frontend
- After adding/changing environment variables, you must redeploy
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables

## Step 6: Custom Domain (Optional)

1. **Go to Project Settings**
   - Vercel Dashboard → Your Project → Settings → Domains

2. **Add Domain**
   - Enter your custom domain
   - Follow DNS configuration instructions

3. **Update Backend CORS**
   - Add your custom domain to backend CORS allowed origins

## Continuous Deployment

Once connected to Git:
- Every push to `main` branch → Automatic production deployment
- Every push to other branches → Automatic preview deployment
- Pull requests → Automatic preview deployments

## Monitoring & Logs

- **View Logs**: Vercel Dashboard → Your Project → Deployments → Click deployment → View Logs
- **Analytics**: Vercel Dashboard → Your Project → Analytics
- **Performance**: Vercel Dashboard → Your Project → Speed Insights

## Environment-Specific Builds

If you need different builds for different environments:

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:production": "vite build --mode production",
    "build:staging": "vite build --mode staging"
  }
}
```

Then in Vercel, set the build command to the appropriate script.

## Rollback

If a deployment has issues:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Find the previous working deployment
3. Click "..." → "Promote to Production"

## Summary Checklist

- [ ] vercel.json is configured correctly
- [ ] Root directory is set to `coach-crew-manager-main`
- [ ] `VITE_API_URL` environment variable is set in Vercel
- [ ] Backend CORS includes Vercel domain
- [ ] Backend is deployed and accessible
- [ ] Test login and API calls after deployment
- [ ] Images and uploads are working
- [ ] All routes work (no 404 on refresh)

## Support

If you encounter issues:
- Check Vercel deployment logs
- Check browser console for errors
- Verify environment variables are set correctly
- Test API endpoints directly using Postman or curl
- Check backend logs for errors
