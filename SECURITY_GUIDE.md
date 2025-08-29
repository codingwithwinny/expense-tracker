# 🔒 Security Guide: API Key Management

## 🚨 **CRITICAL: API Keys Exposed in Git History**

Your Firebase API keys have been exposed in the Git history. Here's how to fix this permanently:

## ✅ **What I've Done (Immediate Fix)**

1. **✅ Moved API keys to environment variables**
2. **✅ Updated .gitignore to exclude .env files**
3. **✅ Created .env.example for reference**
4. **✅ Updated Firebase config to use environment variables**

## 🔧 **Current Status**

- **✅ Local**: API keys are now in `.env` file (not tracked by Git)
- **✅ Build**: Application builds successfully with environment variables
- **❌ Git History**: API keys still exist in previous commits

## 🧹 **Next Steps: Clean Git History**

### Option 1: Use BFG Repo-Cleaner (Recommended)

```bash
# 1. Install BFG (macOS)
brew install bfg

# 2. Run the cleanup script I created
./clean-git-history.sh

# 3. Or run manually:
bfg --delete-files firebase.js
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force-with-lease origin main
```

### Option 2: Manual Git Filter-Branch

```bash
# 1. Create backup branch
git checkout -b backup-before-cleanup

# 2. Clean history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch src/lib/firebase.js' \
  --prune-empty --tag-name-filter cat -- --all

# 3. Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Force push
git push --force-with-lease origin main
```

## 🌐 **Deployment Setup**

### For Firebase Hosting

1. **Set Environment Variables in Firebase Console:**
   - Go to Firebase Console → Project Settings → Environment Configuration
   - Add each environment variable:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
     ```

2. **Deploy with environment variables:**
   ```bash
   npm run build
   firebase deploy
   ```

### For Other Platforms

- **Vercel**: Add environment variables in project settings
- **Netlify**: Add environment variables in site settings
- **GitHub Pages**: Use GitHub Secrets for environment variables

## 🔐 **Security Best Practices**

### ✅ Do's
- ✅ Use environment variables for all API keys
- ✅ Keep `.env` files in `.gitignore`
- ✅ Use `.env.example` for documentation
- ✅ Rotate API keys regularly
- ✅ Use Firebase Security Rules

### ❌ Don'ts
- ❌ Never commit API keys to Git
- ❌ Don't share `.env` files
- ❌ Don't use API keys in client-side code without restrictions
- ❌ Don't ignore security warnings

## 🚨 **Immediate Actions Required**

1. **Clean Git History** (Choose one method above)
2. **Rotate Firebase API Keys** (Optional but recommended)
3. **Set up environment variables in deployment platform**
4. **Test the application thoroughly**

## 📋 **Checklist**

- [ ] Run Git history cleanup
- [ ] Force push to GitHub
- [ ] Set environment variables in Firebase Console
- [ ] Test deployment
- [ ] Verify application works correctly
- [ ] Delete backup branch (after confirming everything works)

## 🔍 **Verification**

After cleanup, verify:
1. **Git History**: No API keys visible in commits
2. **Local Build**: `npm run build` works
3. **Deployment**: App works on Firebase Hosting
4. **Authentication**: Google Sign-in works

## 📞 **Need Help?**

If you encounter issues:
1. Check the backup branch: `git checkout backup-before-cleanup`
2. Review Firebase Console settings
3. Verify environment variables are set correctly

---

**Remember: Security is crucial for production applications. Take the time to do this properly!** 🔒
