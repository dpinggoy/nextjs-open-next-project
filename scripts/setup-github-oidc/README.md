# GitHub OIDC Setup

Quick setup for secure GitHub Actions authentication with AWS.

## Recommended Setup: Multi-Environment with GitHub Environments

This creates separate AWS roles for dev, staging, and production, with secrets organized in GitHub Environments.

### Step 1: Run Setup Script

```bash
npm install
npm run setup:multi-env
```

Answer the prompts:
- GitHub username/org
- Repository name  
- AWS region (just hit enter for us-east-1)

The script creates three roles:
- `GitHubActionsDeployRole-Dev` - restricted to `dev` branch
- `GitHubActionsDeployRole-Staging` - restricted to `staging` branch
- `GitHubActionsDeployRole-Prod` - restricted to `main` branch

### Step 2: Create GitHub Environments

Go to: `Settings → Environments`

**Create "development" environment:**
- Click "New environment"
- Name: `development`
- No protection rules needed
- Add these secrets:
  - `AWS_ROLE_ARN` → paste Dev role ARN from terminal
  - `AWS_REGION` → `us-east-1`

**Create "staging" environment:**
- Name: `staging`
- Optional: Add reviewers if you want
- Add these secrets:
  - `AWS_ROLE_ARN` → paste Staging role ARN from terminal
  - `AWS_REGION` → `us-east-1`

**Create "production" environment:**
- Name: `production`
- Enable "Required reviewers" and add yourself
- Add these secrets:
  - `AWS_ROLE_ARN` → paste Prod role ARN from terminal
  - `AWS_REGION` → `us-east-1`

### Step 3: Delete Old Secrets

Go to: `Settings → Secrets and variables → Actions`

If these exist, delete them:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ROLE_ARN_DEV`
- `AWS_ROLE_ARN_STAGING`
- `AWS_ROLE_ARN_PROD`

### Step 4: Test

Push to your dev branch:
```bash
git checkout dev
git commit -m "test" --allow-empty
git push origin dev
```

Check the Actions tab to verify deployment works.

## Alternative: Single Role Setup

If you don't need separate environments:

```bash
npm run setup
```

This creates one role for all environments. Then add secrets to repository (not environments):
- `AWS_ROLE_ARN`
- `AWS_REGION`

## Benefits of GitHub Environments

**Better organization:**
- Each environment has its own secrets
- All workflows use same secret names (`AWS_ROLE_ARN`, `AWS_REGION`)
- No need for `_DEV`, `_STAGING`, `_PROD` suffixes

**Security:**
- Production requires manual approval
- See deployment history per environment
- Restrict who can deploy to each environment

**Visibility:**
- GitHub shows which environment is deployed
- See deployment status in UI
- Better audit trail

## Optional: Minimal Permissions

For better security, restrict permissions after setup:

```bash
npm run setup:minimal
```

This replaces full AWS access with only what's needed for Next.js deployments.

Note: This only updates one role at a time. You'll need to update the script for multi-environment or run it manually for each role.

## What This Does

Creates secure authentication between GitHub and AWS:
- No permanent credentials stored in GitHub
- Temporary tokens that expire after 1 hour
- Only your specific repository/branch can authenticate
- Each environment isolated with its own role

## Troubleshooting

**Find your role ARNs:**
```bash
cat github-oidc-config.txt
```

**"Access Denied" during deployment:**
- Run `npm run setup:minimal`
- Check CloudWatch logs for missing permissions

**Want to start over:**
```bash
aws iam delete-role --role-name GitHubActionsDeployRole-Dev
aws iam delete-role --role-name GitHubActionsDeployRole-Staging
aws iam delete-role --role-name GitHubActionsDeployRole-Prod
npm run setup:multi-env
```

**Check current setup:**
```bash
aws iam get-role --role-name GitHubActionsDeployRole-Dev
aws iam get-role --role-name GitHubActionsDeployRole-Staging
aws iam get-role --role-name GitHubActionsDeployRole-Prod
```

## Files

- `setup-github-oidc.js` - single role setup
- `setup-github-oidc-multi-env.js` - multi-environment setup (recommended)
- `create-minimal-policy.js` - restricts permissions
- `github-oidc-config.txt` - your config (created by script)

## Summary

Total time: about 5 minutes

Steps:
1. Run `npm run setup:multi-env`
2. Create three GitHub Environments
3. Add two secrets to each environment
4. Delete old secrets
5. Push code to test

Production deployments will require your approval.