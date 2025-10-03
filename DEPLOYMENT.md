# Deployment Guide

## 🚀 Vercel Deployment (Recommended)

This application is optimized for Vercel deployment with custom configuration for performance and caching.

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Visit [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel will automatically detect Next.js and use our configuration

3. **Deployment Settings**:
   - **Build Command**: Uses `vercel.json` configuration
   - **Install Command**: `npm install --legacy-peer-deps`
   - **Output Directory**: `.next` (automatic)
   - **Node.js Version**: 18.x (recommended)

### Option 2: Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Production Deployment**:
   ```bash
   vercel --prod
   ```

## 📋 Pre-Deployment Checklist

- [x] Build successful (`npm run build`)
- [x] `vercel.json` configuration file present
- [x] `.vercelignore` excludes unnecessary files
- [x] Performance optimizations enabled
- [x] Theme toggle working with SSR
- [x] API endpoints functional
- [x] Custom icons loading properly

## ⚙️ Deployment Configuration

### vercel.json Features
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps",
  "functions": {
    "pages/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

### Performance Optimizations
- **API Caching**: 1-hour cache with stale-while-revalidate
- **Function Timeout**: 30 seconds for data processing
- **Legacy Peer Deps**: Compatibility with HeroUI
- **Build Optimizations**: SWC compiler with minification

## 🌐 Custom Domain Setup

1. **Add Domain in Vercel**:
   - Go to your project settings
   - Navigate to "Domains"
   - Add your custom domain

2. **DNS Configuration**:
   - Add CNAME record pointing to `vercel.app`
   - Or use Vercel nameservers for full management

## 📊 Post-Deployment Verification

After deployment, verify these features:

### ✅ Core Functionality
- [ ] Homepage loads with salary data
- [ ] Search page functional
- [ ] Equivalency tool working
- [ ] Admin panel accessible

### ✅ Performance
- [ ] Build time under 10 seconds
- [ ] Page load times under 2 seconds
- [ ] API responses cached properly
- [ ] Theme toggle responsive

### ✅ API Endpoints
Test these endpoints:
```bash
# Replace with your deployment URL
curl https://your-app.vercel.app/api/data
curl https://your-app.vercel.app/api/top
curl https://your-app.vercel.app/api/cs-01
curl https://your-app.vercel.app/api/as-04/top
```

## 🔧 Troubleshooting

### Common Issues

**Build Failures**:
- Ensure `--legacy-peer-deps` in install command
- Check Node.js version (18.x recommended)
- Verify all dependencies are compatible

**Performance Issues**:
- Check if caching headers are working
- Verify API responses are under 6MB
- Monitor function execution times

**Theme Toggle Issues**:
- Ensure SSR handling is working
- Check if custom icons are loading
- Verify next-themes configuration

### Environment Variables
This application requires **no environment variables** - it works out of the box!

## 📈 Monitoring

### Vercel Analytics
- Automatic performance monitoring
- Real user metrics
- Core Web Vitals tracking

### Recommended Monitoring
- Monitor API response times
- Track build success rates
- Watch for errors in function logs

## 🔄 Continuous Deployment

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🎉 Success!

Your PS Salary application is now deployed and ready to serve Canadian public service salary data to users worldwide!

### Next Steps
1. Test all functionality
2. Set up custom domain (optional)
3. Monitor performance metrics
4. Share with users

---

**Questions?** Check the [README.md](README.md) or create an issue on GitHub.