# Deployment Guide

This guide explains how to properly deploy the Expense Splitter application.

## Build Commands

### For Static Site Platforms (Cloudflare Pages, Vercel, Netlify, etc.)

**Build Command**: `npm run build`  
**Output Directory**: `dist`  
**Deploy Command**: *None required* (static files are served directly)

### For Server-based Platforms (Railway, Render, etc.)

**Build Command**: `npm run build`  
**Start Command**: `npm run start:local`  
**Output Directory**: `dist`

### Manual/Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the application:
   ```bash
   npm run build
   ```

3. Serve the application locally:
   ```bash
   npm run start:local
   ```

The application will be available at `http://localhost:3000`

## Common Deployment Platforms

### Cloudflare Pages
- Build Command: `npm run build`
- Output Directory: `dist`
- Deploy Command: *Leave empty* (static files served automatically)

### Vercel
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

### Netlify
- Build Command: `npm run build`
- Publish Directory: `dist`

### Railway/Render (Server-based)
- Build Command: `npm run build`
- Start Command: `npm run start:local`

## Important Notes

⚠️ **Never use `npm run dev` for deployment** - This command starts a development server that runs indefinitely and will cause timeouts on deployment platforms.

⚠️ **For static site platforms (Cloudflare Pages, Netlify, Vercel), do NOT specify a start/deploy command** - These platforms serve the static files from the `dist` directory directly.

✅ **For static site deployment**: Only use `npm run build` and let the platform serve the static files.

✅ **For server-based deployment**: Use `npm run build` followed by `npm run start:local`.

The `npm run start:local` command uses the `serve` package to serve the static files from the `dist` directory, which is appropriate for local testing or server-based hosting platforms.