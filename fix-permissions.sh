#!/bin/bash
# Emergency permission fix script
# This script fixes upload directory permissions at runtime in Cloudron

echo "🚨 EMERGENCY PERMISSION FIX SCRIPT"
echo "📁 Fixing upload directory permissions for Cloudron"

UPLOAD_PATH="/app/data/uploads"

echo "Current user: $(whoami) ($(id))"
echo "Upload path: $UPLOAD_PATH"

# Create directory if it doesn't exist
mkdir -p "$UPLOAD_PATH" 2>/dev/null || echo "Directory creation failed"

# Show current state
ls -ld "$UPLOAD_PATH" 2>/dev/null || echo "Cannot check directory"

# Try multiple permission fixes
echo "Applying permission fixes..."
chmod 777 "$UPLOAD_PATH" 2>/dev/null && echo "✅ Applied 777 permissions"
chown -R "$(whoami):$(whoami)" "$UPLOAD_PATH" 2>/dev/null && echo "✅ Fixed ownership"

# Test write
if touch "$UPLOAD_PATH/.test-write" 2>/dev/null && rm "$UPLOAD_PATH/.test-write" 2>/dev/null; then
    echo "✅ SUCCESS: Upload directory is now writable!"
else
    echo "❌ FAILED: Upload directory still not writable"
    echo "Directory info: $(ls -ld "$UPLOAD_PATH" 2>/dev/null)"
    echo "Parent info: $(ls -ld "$(dirname "$UPLOAD_PATH")" 2>/dev/null)"
fi