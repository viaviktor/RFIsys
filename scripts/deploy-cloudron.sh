#!/bin/bash

# Deploy RFI System to Cloudron
# This script deploys the latest Docker image from GitHub Container Registry to Cloudron

echo "Deploying RFI System to Cloudron..."
echo "Image: ghcr.io/viaviktor/rfisys:latest"

# Deploy to Cloudron using the cloudron CLI
cloudron update --image ghcr.io/viaviktor/rfisys:latest

echo "Deployment complete!"