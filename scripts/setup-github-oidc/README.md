# Getting Started

## What This Does

Sets up secure authentication between GitHub Actions and AWS. Instead of storing AWS credentials in GitHub, your workflows get temporary credentials that expire after an hour.

## Quick Start

Create a folder for the setup files:
```bash
mkdir github-oidc-setup
cd github-oidc-setup
```

Copy these files into the folder:
- setup-github-oidc.js
- create-minimal-policy.js  
- package.json

Install dependencies:
```bash
npm install
```

Run setup:
```bash
node setup-github-oidc.js
```

Answer the prompts:
```
GitHub username or org: yourusername
Repository name: your-repo
AWS region (default us-east-1): [press enter]
```

The script will show you two values:
```
AWS_ROLE_ARN
arn:aws:iam::123456789012:role/GitHubActionsDeployRole

AWS_REGION
us-east-1
```

## Add Secrets to GitHub

Go to your repository settings:
`https://github.com/yourusername/your-repo/settings/secrets/actions`

Click "New repository secret" and add:

**First secret:**
- Name: `AWS_ROLE_ARN`
- Value: paste the ARN from terminal

**Second secret:**  
- Name: `AWS_REGION`
- Value: paste the region from terminal

If you have these old secrets, delete them:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Test It

Push some code:
```bash
git checkout dev
git add .
git commit -m "test oidc"
git push origin dev
```

Check the Actions tab in GitHub. Your workflow should run successfully.

## Optional: Use Minimal Permissions

The setup gives GitHub full AWS access by default. To limit permissions:

```bash
cd github-oidc-setup
node create-minimal-policy.js
```

This restricts the role to only what's needed for Next.js deployments.

## How It Works

When a workflow runs:
1. GitHub requests authentication from AWS
2. AWS verifies the request came from your repository
3. AWS gives GitHub temporary credentials (valid 1 hour)
4. GitHub uses those credentials to deploy
5. Credentials expire automatically

This is more secure than storing permanent credentials.

## Troubleshooting

**Script fails with permission error:**
Make sure AWS CLI is configured:
```bash
aws configure
```

**Deployment fails after setup:**
Try the minimal policy script. If that doesn't work, check CloudWatch logs to see what permission is missing.

**Want to verify setup:**
```bash
aws iam get-role --role-name GitHubActionsDeployRole
```

**Need to start over:**
```bash
aws iam delete-role --role-name GitHubActionsDeployRole
node setup-github-oidc.js
```

## Files Created

- `github-oidc-config.txt` - has your role ARN and other details

## Summary

Total time: about 5 minutes

Steps:
1. Run setup script
2. Add two secrets to GitHub  
3. Push code to test

That's it.