# Cloudron Deployment Guide

This document provides essential information for deploying the RFI System to Cloudron, including critical insights discovered during development.

## 🚨 Critical Issue: Docker Tag Caching

### The Problem

**Cloudron does NOT automatically pull updated Docker images when using the same tag (like `:latest`).** This is due to Docker's client-side caching behavior where it assumes the local image is current when the tag hasn't changed.

### Symptoms

- GitHub Actions builds succeed and show "success" status
- Docker images are correctly built and pushed to GitHub Container Registry
- Cloudron deployment succeeds without errors
- **BUT**: The running container still uses old code/images
- Logs show old messages despite code changes
- No amount of cache busting in Dockerfile helps

### Root Cause

When deploying with:
```bash
cloudron update --image ghcr.io/viaviktor/rfisys:latest
```

Cloudron's Docker client sees the same `:latest` tag and assumes the local cached image is current, even though a newer image exists in the registry.

### Evidence from Logs

**Before Fix (using :latest):**
```
box:docker downloadImage: ghcr.io/viaviktor/rfisys:latest
# Instant completion - using cached image
```

**After Fix (using commit-specific tags):**
```
box:docker downloadImage: ghcr.io/viaviktor/rfisys:main-77c4a82
=> Downloading image ........................
box:docker pullImage: {"status":"Status: Downloaded newer image for ghcr.io/viaviktor/rfisys:main-77c4a82"}
box:docker deleteImage: removing ghcr.io/viaviktor/rfisys:latest
```

## ✅ Solution: Commit-Specific Tags

### Updated Deployment Script

The `/scripts/deploy-cloudron.sh` has been updated to use commit-specific tags:

```bash
#!/bin/bash
# Get the latest commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG="main-${COMMIT_HASH}"

echo "🚀 Deploying RFI System to Cloudron..."
echo "📦 Using commit-specific tag to bypass Docker caching"
echo "🏷️  Image: ghcr.io/viaviktor/rfisys:${IMAGE_TAG}"
echo "🔗 Commit: ${COMMIT_HASH}"

# Deploy to Cloudron using commit-specific tag (bypasses Docker caching)
cloudron update --image ghcr.io/viaviktor/rfisys:${IMAGE_TAG}

echo "✅ Deployment complete!"
```

### How It Works

1. **GitHub Actions** automatically creates multiple tags for each build:
   - `latest` (problematic for Cloudron)
   - `main-abc123f` (commit-specific, perfect for Cloudron)
   - `main` (branch-based)

2. **Deployment Script** uses the commit-specific tag (`main-abc123f`) which is unique for each commit

3. **Cloudron** sees a new tag and is forced to pull the actual latest image from the registry

## 🔧 GitHub Actions Configuration

The `.github/workflows/deploy-cloudron.yml` is configured to build with no-cache flags:

```yaml
- name: Build and push Docker image
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    no-cache: true  # Forces complete rebuild
    pull: true      # Pulls base images fresh
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
```

## 📋 Deployment Process

### 1. Make Code Changes
```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main
```

### 2. Wait for GitHub Actions
- GitHub Actions automatically builds the Docker image
- Multiple tags are created including commit-specific ones
- Build typically takes 2-3 minutes

### 3. Deploy to Cloudron
```bash
# From the project root
./scripts/deploy-cloudron.sh
```

The script will:
- Get the current commit hash
- Use the commit-specific tag (e.g., `main-77c4a82`)
- Force Cloudron to pull the new image
- Deploy successfully with the latest code

## 🐛 Troubleshooting

### Problem: Still seeing old code after deployment

**Check:**
1. Did GitHub Actions complete successfully?
2. Is the deployment script using commit-specific tags?
3. Are you waiting long enough for the GitHub Actions build?

**Solution:**
```bash
# Check if the commit-specific image exists
docker manifest inspect ghcr.io/viaviktor/rfisys:main-$(git rev-parse --short HEAD)

# If it doesn't exist, wait for GitHub Actions or trigger manually
git commit --allow-empty -m "Trigger rebuild"
git push origin main
```

### Problem: Image not found error

**Cause:** GitHub Actions hasn't finished building the commit-specific tag yet.

**Solution:**
```bash
# Wait for GitHub Actions, then retry
sleep 120
./scripts/deploy-cloudron.sh
```

## 🏗️ Alternative Solutions (Not Recommended)

### Option 1: Force Pull with Latest
```bash
# Some Cloudron versions support force pull
cloudron update --image ghcr.io/viaviktor/rfisys:latest --force-pull
```

### Option 2: Use Image Digest
```bash
# Reference by SHA256 digest instead of tag
DIGEST=$(docker manifest inspect ghcr.io/viaviktor/rfisys:latest | jq -r '.config.digest')
cloudron update --image ghcr.io/viaviktor/rfisys@${DIGEST}
```

### Option 3: Tag Rotation
```bash
# Alternate between deploy-a and deploy-b tags
CURRENT_TAG=$(cloudron status | grep -o 'deploy-[ab]')
NEW_TAG=$([[ "$CURRENT_TAG" == "deploy-a" ]] && echo "deploy-b" || echo "deploy-a")
cloudron update --image ghcr.io/viaviktor/rfisys:${NEW_TAG}
```

## 📊 Performance Impact

### Before Fix
- ❌ Instant "deployment" (cached image)
- ❌ No new code deployed
- ❌ Wasted development time

### After Fix
- ✅ ~30-40 seconds for image download
- ✅ Guaranteed fresh code deployment
- ✅ Reliable development workflow

## 🎯 Key Takeaways

1. **Never use `:latest` tag for production Cloudron deployments**
2. **Always use unique tags** (commit hash, timestamp, etc.)
3. **GitHub Container Registry works perfectly** - the issue was client-side caching
4. **GitHub Actions works perfectly** - the issue was not with the build process
5. **Docker layer caching in Dockerfile is irrelevant** to this tag caching issue

## 📝 Historical Context

This issue was discovered after multiple hours of debugging, including:
- Extensive Docker cache busting attempts
- GitHub Actions workflow modifications
- Emergency hotfix scripts
- Multiple deployment attempts

The breakthrough came from investigating GitHub Container Registry and realizing that new images were being built correctly, but Cloudron wasn't pulling them due to tag caching.

**Resolution Date:** July 31, 2025  
**Total Time to Resolution:** ~4 hours  
**Key Insight:** The problem was deployment strategy, not build process

---

*This document should be kept updated as Cloudron deployment strategies evolve.*