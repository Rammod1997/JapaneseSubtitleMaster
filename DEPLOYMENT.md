# Free Deployment Guide

Since Replit requires a paid plan for deployment, here are free alternatives:

## Option 1: Vercel (Recommended)

1. **Create a GitHub repository** and push your code
2. **Go to vercel.com** and sign in with GitHub
3. **Import your repository**
4. **Add environment variables** in Vercel dashboard:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `OPENAI_API_KEY` - Your OpenAI API key
5. **Deploy automatically**

### Database for Vercel
- Use **Neon** (free tier): https://neon.tech
- Or **PlanetScale** (free tier): https://planetscale.com

## Option 2: Railway

1. **Go to railway.app** and sign in with GitHub
2. **Create new project** from GitHub repo
3. **Add environment variables**:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
4. **Deploy automatically**

Railway includes free PostgreSQL database.

## Option 3: Render

1. **Go to render.com** and sign in with GitHub
2. **Create new Web Service** from GitHub repo
3. **Set build command**: `npm run build`
4. **Set start command**: `npm run start`
5. **Add environment variables**
6. **Create PostgreSQL database** (free tier available)

## Current Configuration

Your app is already configured for deployment:
- ✅ `vercel.json` - Vercel deployment config
- ✅ `netlify.toml` - Netlify deployment config
- ✅ Build scripts in `package.json`
- ✅ Environment variables ready
- ✅ Database schema deployed

## Next Steps

1. **Push code to GitHub** (if not already done)
2. **Choose a platform** (Vercel recommended)
3. **Set up database** (Neon for external hosting)
4. **Configure environment variables**
5. **Deploy!**

Your app will be live and accessible worldwide for free!