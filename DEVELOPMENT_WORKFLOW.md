# 🚨 MANDATORY DEVELOPMENT WORKFLOW

## ⚠️ CRITICAL REQUIREMENT: Always Follow This Order

**NEVER push code to GitHub without completing ALL these steps first!**

### 📋 Required Testing Sequence

1. **Build Check** ✅
   ```bash
   npm run build
   ```
   - Must complete without errors
   - Verify TypeScript compilation
   - Check for any build warnings

2. **Local Development Testing** ✅
   ```bash
   npm run dev
   ```
   - Start development server
   - Test key functionality manually
   - Verify API endpoints respond correctly
   - Check database connectivity via health endpoint

3. **Quality Assurance** ✅
   ```bash
   npm run lint      # (if configured)
   npm run test      # (if tests exist)
   ```
   - Run all linting checks
   - Execute test suites
   - Verify code quality standards

4. **Local Docker Testing** ✅ (CRITICAL)
   ```bash
   docker build -t rfisys-test:local .
   docker run --env-file .env -p 3000:3000 rfisys-test:local
   ```
   - Build Docker image locally
   - Test in containerized environment
   - Simulate Cloudron deployment conditions
   - Verify startup scripts work correctly
   - Test database migrations in container

5. **Only After ALL Above Pass** ✅
   ```bash
   git add .
   git commit -m "..."
   git push origin main
   ```

---

## 🎯 Why This Order Matters

- **Build failures**: Catch TypeScript/compilation errors early
- **Runtime issues**: Identify problems before containerization
- **Docker-specific bugs**: Container environment differs from dev
- **Migration issues**: Database changes need container testing
- **Cloudron compatibility**: Docker test simulates production

---

## 🚫 What NOT To Do

- ❌ Push emergency fixes directly to GitHub
- ❌ Skip Docker testing for "small changes"
- ❌ Assume local dev = container behavior
- ❌ Deploy untested database migrations
- ❌ Rush fixes without proper validation

---

## 🏷️ Commit Message Format

```
🔧 Brief description (fix/feat/docs/test)

- Detailed change 1
- Detailed change 2
- What was tested and how

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📝 Notes

- **Emergency situations**: Still follow this workflow, just faster
- **Database changes**: Extra care with Docker testing required
- **Migration fixes**: Test migration rollback/recovery scenarios
- **Production issues**: Always test fix locally before deploying

**Remember: 5 minutes of proper testing saves hours of production debugging!**