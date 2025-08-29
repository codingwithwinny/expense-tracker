#!/bin/bash

# 🔒 Git History Cleanup Script for Sensitive Data
# This script helps remove sensitive data from Git history

echo "🔒 Starting Git history cleanup for sensitive data..."

# Step 1: Create a backup branch
echo "📦 Creating backup branch..."
git checkout -b backup-before-cleanup

# Step 2: Go back to main
git checkout main

# Step 3: Use git filter-repo (if available) or BFG
if command -v git-filter-repo &> /dev/null; then
    echo "🧹 Using git-filter-repo to clean history..."
    git filter-repo --path src/lib/firebase.js --invert-paths
elif command -v bfg &> /dev/null; then
    echo "🧹 Using BFG to clean history..."
    bfg --delete-files firebase.js
else
    echo "⚠️  Neither git-filter-repo nor BFG found."
    echo "📋 Manual steps required:"
    echo "1. Install BFG: brew install bfg (macOS) or download from https://rtyley.github.io/bfg-repo-cleaner/"
    echo "2. Run: bfg --delete-files firebase.js"
    echo "3. Run: git reflog expire --expire=now --all && git gc --prune=now --aggressive"
    echo "4. Force push: git push --force-with-lease origin main"
    exit 1
fi

# Step 4: Clean up and optimize
echo "🧹 Cleaning up Git repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Step 5: Force push (with safety check)
echo "🚀 Ready to force push changes..."
echo "⚠️  WARNING: This will rewrite Git history!"
echo "📋 Run the following command to push:"
echo "   git push --force-with-lease origin main"
echo ""
echo "✅ Git history cleanup completed!"
