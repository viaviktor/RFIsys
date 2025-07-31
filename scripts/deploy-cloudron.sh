#!/bin/bash

# Deploy RFI System to Cloudron
# This script deploys the latest Docker image using commit-specific tags to bypass Docker caching

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