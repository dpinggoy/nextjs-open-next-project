#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NextjsStack } from '../lib/nextjs-stack';

const app = new cdk.App();

// Development Environment
new NextjsStack(app, 'NextjsStack-dev', {
    environment: 'dev',
    config: {
        // Lambda settings - small for dev to save cost
        lambdaMemory: 512,
        lambdaTimeout: 10,

        // Cache settings - short TTL for quick testing
        cacheTtl: {
            static: 3600,   // 1 hour
            server: 0       // No caching
        },

        // No provisioned concurrency - save cost
        enableProvisioning: false,

        // Environment variables for your app
        environmentVariables: {
            LOG_LEVEL: 'debug',
            API_URL: 'https://api-dev.example.com'
        }
    },

    // AWS account settings
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1'
    },

    stackName: 'nextjs-dev'
});

app.synth();