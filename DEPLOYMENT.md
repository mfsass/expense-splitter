# Deployment Guide

This guide explains how to properly deploy the Expense Splitter application.

## Build Commands

### For Build Platforms (Vercel, Netlify, etc.)

**Build Command**: `npm run build`  
**Start/Deploy Command**: `npm run start`  
**Output Directory**: `dist`

### Manual Deployment

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Serve the application:
   ```bash
   npm run start
   ```

The application will be available at `http://localhost:3000`

## Common Deployment Platforms

### Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Netlify
- Build Command: `npm run build`
- Publish Directory: `dist`

### Railway/Render
- Build Command: `npm run build`
- Start Command: `npm run start`

## Important Notes

⚠️ **Never use `npm run dev` for deployment** - This command starts a development server that runs indefinitely and will cause timeouts on deployment platforms.

✅ **Always use `npm run build` followed by `npm run start`** for production deployments.

The `npm run start` command uses the `serve` package to serve the static files from the `dist` directory, which is the proper way to deploy a Vite-built application.