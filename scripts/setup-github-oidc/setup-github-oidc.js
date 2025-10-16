#!/usr/bin/env node

const { 
    IAMClient, 
    CreateOpenIDConnectProviderCommand, 
    GetOpenIDConnectProviderCommand, 
    CreateRoleCommand, 
    GetRoleCommand, 
    AttachRolePolicyCommand,
    UpdateAssumeRolePolicyCommand
} = require("@aws-sdk/client-iam");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
const readline = require('readline');
const fs = require('fs');
const { resolve } = require("path");
const { get } = require("http");
const { Effect, PolicyDocument } = require("aws-cdk-lib/aws-iam");

function ask(question){
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function getAccountId(){
    const sts = new STSClient({ region: client.config.region });
    const { Account } = await sts.send(new GetCallerIdentityCommand({}));
    return Account;
}

async function setupOIDCProvider(iam) {
    const accountId = await getAccountId();
    const providerArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;

    try {
        await iam.send(new GetOpenIDConnectProviderCommand({
            OpenIDConnectProviderArn: providerArn
        }));
        console.log("OIDC provider already exists.");
        return providerArn;
    } catch (err) {
        if (e.name === 'NoSuchEntity') {
            const result = await iam.send(new CreateOpenIDConnectProviderCommand({
                Url: "https://token.actions.githubusercontent.com",
                ClientIDList: ["sts.amazonaws.com"],
                ThumbprintList: ["6938fd4d98bab03faadb97b34396831e3780aea1"]
            }));
            console.log("Created OIDC provider.");
            return result.OpenIDConnectProviderArn;
        }
        throw err;
    }
}

async function setupRole(iam, roleName, repo, providerArn) {
    const trustPolicy = {
        Version: "2012-10-17",
        Statement: [{
            Effect: 'Allow',
            Principal: { Federated: providerArn },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
                StringEquals: {
                    'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
                },
                StringLike: {
                    'token.actions.githubusercontent.com:sub': `repo:${repo}:*`
                }
            }
        }]
    };

    try {
        const { Role } = await iam.send(new GetRoleCommand({ RoleName: roleName }));
        console.log(`Role ${roleName} already exists. Updating trust policy...`);
        
        await iam.send(new UpdateAssumeRolePolicyCommand({
            RoleName: roleName,
            PolicyDocument: JSON.stringify(trustPolicy)
        }));
        console.log("Updated trust policy.");

        return Role.Arn;
    } catch (e) {
        if (e.name === 'NoSuchEntity') {
            const { Role } = await iam.send(new CreateRoleCommand({
                RoleName: roleName,
                AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
                Description: `Role for GitHub Actions from repo ${repo}`
            }));
            console.log(`Created role ${roleName}.`);
            return Role.Arn; 
        }
        throw err;
    }
}

async function attachPolicy(iam, roleName) {
    try {
        await iam.send(new AttachRolePolicyCommand({
            RoleName: roleName,
            PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess'
        }));
        console.log('Attached AdministratorAccess policy to role.');
    } catch (err) {
        if (err.name === 'NoSuchEntity') throw err;
    }
}

async function main() {
    console.log('\nGitHub OIDC Setup FOR AWS\n');

    const githubOrg = await ask('GitHub username or org: ');
    const githubRepo = await ask('GitHub repository name: ');
    const region = await ask('AWS region (default us-east-1): ') || 'us-east-1';

    const repo = `${githubOrg}/${githubRepo}`;

    console.log(`\nRepository: ${repo}`);
    console.log(`Region: ${region}\n`);
    
    const confirm = await ask('\nContinue? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        return;
    }

    console.log('\nSetting up OIDC...\n');

    const iam = new IAMClient({ region });
    const roleName = `GitHubActionsDeployRole-${githubRepo}`;

    const providerArn = await setupOIDCProvider(iam);
    const roleArn = await setupRole(iam, roleName, repo, providerArn);
    await attachPolicy(iam, roleName);

    const sts = new STSClient({ region });
    const { Account } = await sts.send(new GetCallerIdentityCommand({}));
    
    console.log('\nSetup complete!\n');
    console.log(`AWS Account: ${Account}`);

    const config = `
GitHub OIDC Configuration
========================
Date: ${new Date().toISOString()}
Repository: ${repo}
Region: ${region}

OIDC Provider ARN: ${providerArn}
Role Name: ${roleName}
Role ARN: ${roleArn}

Add these secrets to GitHub:
https://github.com/${repo}/settings/secrets/actions

AWS_ROLE_ARN
${roleArn}

AWS_REGION
${region}

Then delete these old secrets if they exist:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
`;
    fs.writeFileSync('githhub-oidc-config.txt', config.trim());

    console.log('\nAdd these GitHub secrets:');
    console.log(`\nAWS_ROLE_ARN\n`);
    console.log(roleArn);
    console.log(`\nAWS_REGION\n`);
    console.log(region);
    console.log('\nConfig saved to githhub-oidc-config.txt');
    console.log('\nNote: Currently using AdministratorAccess.');
    console.log('Run create-minimal-policy.js for better security.\n'); 
}

main().catch(err => {
    console.error('\nError:', err.message);
    process.exit(1);
});