#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NextjsStack } from '../lib/nextjs-stack';

const app = new cdk.App();

// Staging Environment
new NextjsStack(app, 'NextjsStack-staging', {
    environment: 'staging',
    config: {
        //Lambda settings - medium for staging
        lambdaMemory: 1024,
        lambdaTimeout: 15,

        // Cached settings - moderate TTL for testing
        cacheTtl: {
            static: 86400,      // 24 hours
            server: 60
        },

        // No provisioned concurrency - save cost
        enableProvisioning: false,

        // Environment variables for your app
        environmentVariables: {
            LOG_LEVEL: 'info',
            API_URL: 'https://api-staging.example.com'
        },

        // Tags for cost tracking
        tags: {
            Environment: 'staging',
            Project: 'NextJS'
        }
    },

    // AWS account settings
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1'
    },

    stackName: 'nextjs-staging'
});

app.synth();