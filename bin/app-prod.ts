#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NextjsStack } from '../lib/nextjs-stack';

const app = new cdk.App();

// Production Environment
new NextjsStack(app, 'NextjsStack-prod', {
    environment: 'prod',
    config: {
        // Custom domain (optional - comment out if not using)
        domainName: 'www.example.com',
        certificateArn: process.env.CERTIFICATE_ARN,

        // Lambda settings - large for production performance
        lambdaMemory: 2048,
        lambdaTimeout: 30,

        // Cache settings - large for production performance
        cacheTtl: {
            static: 31536000,       // 1 year
            server: 300,            // 5 minutes
        },

        // Provisioned concurrency for zero cold starts
        enableProvisioning: true,
        provisionedConcurrency: 5,

        // Environment variables for your app
        environmentVariables: {
            LOG_LEVEL: 'warn',
            API_URL: 'https://api.example.com'
        },

        // Tags for cost tracking
        tags: {
            Environment: 'production',
            Project: 'NextJS'
        }
    },

    // AWS account settings
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1'
    },

    stackName: 'nextjs-prod'
});

app.synth();