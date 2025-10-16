# Next.js Multi-Environment Deployment with AWS CDK + OpenNext

A production-ready, multi-environment Next.js deployment solution using AWS CDK and OpenNext. Deploy your Next.js application to AWS Lambda with CloudFront CDN, optimized for serverless architecture.

## 🎯 Features

- ✅ **Multi-Environment Support** - Separate dev, staging, and production environments
- ✅ **AWS CDK Infrastructure as Code** - Type-safe, version-controlled infrastructure
- ✅ **OpenNext Integration** - Optimized Next.js deployment for AWS
- ✅ **Serverless Architecture** - Lambda functions for SSR and image optimization
- ✅ **Global CDN** - CloudFront distribution with edge caching
- ✅ **Custom Domain Support** - SSL certificates via AWS ACM
- ✅ **CI/CD Ready** - GitHub Actions workflows included
- ✅ **Modular Constructs** - Reusable CDK components
- ✅ **Cost Optimized** - Environment-specific resource allocation
- ✅ **ISR Support** - Incremental Static Regeneration
- ✅ **Image Optimization** - Automatic image optimization at the edge

## 📁 Project Structure

```
nextjs-cdk-opennext/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # CI checks (lint, test, build)
│       ├── deploy-dev.yml         # Deploy to dev
│       ├── deploy-staging.yml     # Deploy to staging
│       ├── deploy-prod.yml        # Deploy to production
│       └── README.md              # Workflow documentation
├── bin/
│   ├── app-dev.ts                 # Dev environment config
│   ├── app-staging.ts             # Staging environment config
│   └── app-prod.ts                # Production environment config
├── lib/
│   ├── nextjs-cdk-stack.ts        # Main CDK stack
│   └── constructs/
│       ├── nextjs-storage-construct.ts    # S3 buckets
│       ├── nextjs-lambda-construct.ts     # Lambda functions
│       ├── nextjs-cdn-construct.ts        # CloudFront CDN
│       └── README.md                      # Constructs documentation
├── app/                           # Next.js app (App Router)
│   ├── page.tsx
│   ├── layout.tsx
│   └── api/
├── public/                        # Static assets
├── cdk.json                       # CDK configuration
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies and scripts
├── Makefile                       # Convenient commands
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## 🏗️ Architecture

```
User Request
    ↓
CloudFront (Global CDN)
    ↓
    ├─→ S3 (Static Assets: _next/static/*)
    ├─→ Lambda (SSR: Dynamic pages & API routes)
    └─→ Lambda (Image Optimization: _next/image*)
```

### AWS Resources Created (per environment)

- **CloudFront Distribution** - Global CDN with edge caching
- **Lambda Functions** (2):
  - SSR Function - Server-side rendering and API routes
  - Image Optimization - Next.js image optimization
- **S3 Buckets** (2):
  - Assets Bucket - Static files and ISR cache
  - Image Cache Bucket - Optimized images
- **SSM Parameters** - Store distribution IDs for CI/CD
- **CloudWatch Logs** - Lambda execution logs

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- AWS CLI configured
- AWS account with appropriate permissions

### 1. Install Dependencies

```bash
npm install
```

### 2. Bootstrap CDK (First Time Only)

```bash
npm run cdk:bootstrap
```

### 3. Configure Next.js for OpenNext

Create or update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: false,
  },
}

module.exports = nextConfig
```

### 4. Deploy to Development

```bash
npm run cdk:deploy:dev
```

This will:
1. Build your Next.js app
2. Run OpenNext build
3. Deploy AWS infrastructure
4. Output your CloudFront URL

### 5. Access Your Application

```bash
# The deployment will output:
✅ NextjsStack-dev

Outputs:
NextjsStack-dev.DistributionUrl = https://d123abc.cloudfront.net
```

Visit the URL to see your deployed app!

## 📝 Available Commands

### Development

```bash
npm run dev              # Run Next.js locally
npm run build            # Build Next.js
npm run build:open-next  # Build with OpenNext
```

### Deployment

```bash
# Deploy to specific environment
npm run cdk:deploy:dev       # Deploy to dev
npm run cdk:deploy:staging   # Deploy to staging
npm run cdk:deploy:prod      # Deploy to production

# Or using Make
make deploy-dev
make deploy-staging
make deploy-prod
```

### View Changes Before Deploying

```bash
npm run cdk:diff:dev
npm run cdk:diff:staging
npm run cdk:diff:prod
```

### Synthesize CloudFormation

```bash
npm run cdk:synth:dev
npm run cdk:synth:staging
npm run cdk:synth:prod
```

### View Infrastructure Info

```bash
make info-dev
make info-staging
make info-prod
```

### View Logs

```bash
make logs-dev
make logs-staging
make logs-prod
```

### Invalidate CloudFront Cache

```bash
make invalidate-dev
make invalidate-staging
make invalidate-prod
```

### Destroy Environments

```bash
make destroy-dev        # No confirmation
make destroy-staging    # Press Enter to confirm
make destroy-prod       # Type 'destroy-prod' to confirm
```

## ⚙️ Environment Configuration

Each environment has its own configuration file in `bin/`:

### Development (`bin/app-dev.ts`)

```typescript
{
  lambdaMemory: 512,
  lambdaTimeout: 10,
  cacheTtl: {
    static: 3600,      // 1 hour
    server: 0,         // No caching
  },
  enableProvisioning: false,
}
```

**Purpose:** Quick development and testing  
**Cost:** ~$5-10/month

### Staging (`bin/app-staging.ts`)

```typescript
{
  lambdaMemory: 1024,
  lambdaTimeout: 15,
  cacheTtl: {
    static: 86400,     // 24 hours
    server: 60,        // 1 minute
  },
  enableProvisioning: false,
}
```

**Purpose:** Pre-production testing and QA  
**Cost:** ~$10-20/month

### Production (`bin/app-prod.ts`)

```typescript
{
  domainName: 'www.example.com',
  certificateArn: process.env.CERTIFICATE_ARN,
  lambdaMemory: 2048,
  lambdaTimeout: 30,
  cacheTtl: {
    static: 31536000,  // 1 year
    server: 300,       // 5 minutes
  },
  enableProvisioning: true,
  provisionedConcurrency: 5,
}
```

**Purpose:** Live production application  
**Cost:** ~$50-200/month (depending on traffic)

## 🔧 Customization

### Add Environment Variables

Edit the environment file (e.g., `bin/app-dev.ts`):

```typescript
environmentVariables: {
  API_URL: 'https://api.example.com',
  DATABASE_URL: process.env.DATABASE_URL,
  STRIPE_KEY: process.env.STRIPE_KEY,
}
```

### Adjust Lambda Memory

```typescript
lambdaMemory: 1024,  // 128 to 10240 MB
```

### Change Cache TTL

```typescript
cacheTtl: {
  static: 86400,   // Seconds (24 hours)
  server: 300,     // Seconds (5 minutes)
}
```

### Add Custom Domain (Production)

1. Create ACM certificate in `us-east-1`:
```bash
aws acm request-certificate \
  --domain-name www.example.com \
  --validation-method DNS \
  --region us-east-1
```

2. Validate certificate via DNS

3. Update `bin/app-prod.ts`:
```typescript
domainName: 'www.example.com',
certificateArn: process.env.CERTIFICATE_ARN,
```

4. Set environment variable:
```bash
export CERTIFICATE_ARN="arn:aws:acm:us-east-1:123456789:certificate/xxxxx"
```

5. Deploy:
```bash
npm run cdk:deploy:prod
```

6. Create Route53 A record pointing to CloudFront

## 🔄 CI/CD with GitHub Actions

The project includes ready-to-use GitHub Actions workflows:

### Setup

1. **Create GitHub Environments** in Settings → Environments:
   - `dev`
   - `staging`
   - `production` (with required reviewers)

2. **Add Secrets** to each environment:
   - `AWS_ROLE_ARN_DEV` (or `AWS_ACCESS_KEY_ID_DEV` + `AWS_SECRET_ACCESS_KEY_DEV`)
   - `AWS_ROLE_ARN_STAGING`
   - `AWS_ROLE_ARN_PROD`
   - `DEV_API_URL`
   - `STAGING_API_URL`
   - `PROD_API_URL`
   - `PROD_CERTIFICATE_ARN` (if using custom domain)

3. **Create Git Branches**:
```bash
git checkout -b develop
git push origin develop

git checkout -b staging
git push origin staging
```

### Workflow

- **Push to `develop`** → Auto-deploys to dev
- **Push to `staging`** → Auto-deploys to staging
- **Push to `main`** → Auto-deploys to production (with approval)

## 🏗️ CDK Constructs

The infrastructure is organized into modular, reusable constructs:

### NextjsStorageConstruct
Manages S3 buckets for assets and caching
- Assets bucket with lifecycle policies
- Image cache bucket with auto-expiration
- Automatic deployment of OpenNext output

### NextjsLambdaConstruct
Creates Lambda functions for compute
- SSR function for server-side rendering
- Image optimization function
- ARM64 architecture for better price/performance
- Optional provisioned concurrency

### NextjsCdnConstruct
Manages CloudFront distribution
- Global CDN with edge locations
- Multiple cache policies (static vs dynamic)
- Custom domain support
- Error response handling

See `lib/constructs/README.md` for detailed documentation.

## 📊 Cost Breakdown

### Development Environment
- Lambda (512 MB): ~$2/month
- CloudFront: ~$1/month
- S3: ~$1/month
- **Total:** ~$5-10/month

### Staging Environment
- Lambda (1024 MB): ~$5/month
- CloudFront: ~$2/month
- S3: ~$1/month
- **Total:** ~$10-20/month

### Production Environment
- Lambda (2048 MB): ~$15/month
- Provisioned Concurrency: ~$30/month
- CloudFront: ~$5-50/month (traffic dependent)
- S3: ~$2/month
- **Total:** ~$50-200/month (depending on traffic)

**Cost Optimization Tips:**
- Disable provisioned concurrency if cold starts are acceptable (-$30/month)
- Increase CloudFront cache TTL to reduce Lambda invocations
- Use S3 Intelligent-Tiering for infrequently accessed files

## 🔍 Monitoring

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/nextjs-ssr-dev --follow
aws logs tail /aws/lambda/nextjs-ssr-staging --follow
aws logs tail /aws/lambda/nextjs-ssr-prod --follow
```

### CloudWatch Metrics

Key metrics to monitor:
- Lambda invocations
- Lambda errors
- Lambda duration
- CloudFront requests
- CloudFront cache hit ratio

### X-Ray Tracing

Enable X-Ray for distributed tracing (optional):

```typescript
// In lambda construct
tracing: lambda.Tracing.ACTIVE,
```

## 🐛 Troubleshooting

### Build Fails with OpenNext

**Issue:** `output: 'standalone'` not in next.config.js

**Solution:**
```javascript
// next.config.js
module.exports = {
  output: 'standalone',
}
```

### Lambda Timeout Errors

**Issue:** Function execution exceeds timeout

**Solution:** Increase timeout in environment config:
```typescript
lambdaTimeout: 30,  // Increase to 30 seconds
```

### CloudFront Not Serving Updated Content

**Issue:** Old content cached at edge

**Solution:**
```bash
make invalidate-dev  # Or staging/prod
```

### Permission Errors

**Issue:** AWS credentials lack necessary permissions

**Solution:** Ensure IAM user/role has these permissions:
- CloudFormation full access
- Lambda full access
- S3 full access
- CloudFront full access
- IAM role creation
- SSM parameter access

### Different Behavior Between Environments

**Issue:** App works in dev but not prod

**Checklist:**
1. Check environment variables are set correctly
2. Verify Lambda memory is sufficient
3. Review CloudWatch logs for errors
4. Check CloudFront cache settings

## 🔐 Security Best Practices

1. **Use OIDC for GitHub Actions** instead of long-lived credentials
2. **Enable CloudFront WAF** for DDoS protection
3. **Use AWS Secrets Manager** for sensitive environment variables
4. **Enable CloudTrail** for audit logging
5. **Implement least-privilege IAM policies**
6. **Enable S3 bucket encryption** (already configured)
7. **Use VPC endpoints** for private Lambda access (optional)

## 🚦 Deployment Workflow

### Development Workflow

```bash
# 1. Make changes locally
npm run dev

# 2. Test locally
# Make sure everything works

# 3. Deploy to dev
npm run cdk:deploy:dev

# 4. Test on dev environment
# Visit CloudFront URL

# 5. Iterate quickly
# Repeat steps 1-4
```

### Release Workflow

```bash
# 1. Deploy to staging
git checkout staging
git merge develop
git push origin staging
# GitHub Actions auto-deploys

# 2. QA team tests staging

# 3. Deploy to production
git checkout main
git merge staging
git push origin main
# GitHub Actions deploys (with approval)

# 4. Monitor production
make logs-prod
```

## 📚 Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [OpenNext Documentation](https://open-next.js.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenNext](https://open-next.js.org/) - For making Next.js work seamlessly on AWS
- [AWS CDK](https://aws.amazon.com/cdk/) - For infrastructure as code
- [Next.js](https://nextjs.org/) - For the amazing React framework

---

**Built with ❤️ using AWS CDK, OpenNext, and Next.js**

For questions or issues, please create an issue in the GitHub repository.