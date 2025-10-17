#!/usr/bin/env node

const { IAMClient, CreateOpenIDConnectProviderCommand, GetOpenIDConnectProviderCommand, 
        CreateRoleCommand, GetRoleCommand, AttachRolePolicyCommand, UpdateAssumeRolePolicyCommand } = require('@aws-sdk/client-iam');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
const readline = require('readline');
const fs = require('fs');

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getAccountId(region) {
  const sts = new STSClient({ region });
  const { Account } = await sts.send(new GetCallerIdentityCommand({}));
  return Account;
}

async function setupOIDCProvider(iam, region) {
  const accountId = await getAccountId(region);
  const providerArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;
  
  try {
    await iam.send(new GetOpenIDConnectProviderCommand({
      OpenIDConnectProviderArn: providerArn
    }));
    console.log('OIDC provider already exists');
    return providerArn;
  } catch (err) {
    if (err.name === 'NoSuchEntity') {
      const result = await iam.send(new CreateOpenIDConnectProviderCommand({
        Url: 'https://token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: ['6938fd4d98bab03faadb97b34396831e3780aea1']
      }));
      console.log('Created OIDC provider');
      return result.OpenIDConnectProviderArn;
    }
    throw err;
  }
}

async function setupRole(iam, roleName, repo, branch, providerArn) {
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Federated: providerArn },
      Action: 'sts:AssumeRoleWithWebIdentity',
      Condition: {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${repo}:ref:refs/heads/${branch}`
        }
      }
    }]
  };

  try {
    const { Role } = await iam.send(new GetRoleCommand({ RoleName: roleName }));
    console.log(`Role ${roleName} already exists, updating trust policy`);
    
    await iam.send(new UpdateAssumeRolePolicyCommand({
      RoleName: roleName,
      PolicyDocument: JSON.stringify(trustPolicy)
    }));
    
    return Role.Arn;
  } catch (err) {
    if (err.name === 'NoSuchEntity' || err.message.includes('cannot be found')) {
      const { Role } = await iam.send(new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
        Description: `Role for GitHub Actions deployments - ${branch} branch`
      }));
      console.log(`Created IAM role ${roleName}`);
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
    console.log(`Attached permissions to ${roleName}`);
  } catch (err) {
    if (err.name !== 'EntityAlreadyExists') throw err;
  }
}

async function main() {
  console.log('\nGitHub OIDC Setup for AWS (Multi-Environment)\n');
  
  const githubOrg = await ask('GitHub username or org: ');
  const githubRepo = await ask('Repository name: ');
  const regionInput = await ask('AWS region (default us-east-1): ');
  const region = regionInput.trim() || 'us-east-1';
  
  const repo = `${githubOrg}/${githubRepo}`;
  
  console.log(`\nRepository: ${repo}`);
  console.log(`Region: ${region}`);
  
  const confirm = await ask('\nContinue? (y/n): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('Cancelled');
    return;
  }

  console.log('\nSetting up OIDC...');
  
  const iam = new IAMClient({ region });
  
  const providerArn = await setupOIDCProvider(iam, region);
  
  const environments = [
    { name: 'dev', branch: 'dev', roleName: 'GitHubActionsDeployRole-Dev' },
    { name: 'staging', branch: 'staging', roleName: 'GitHubActionsDeployRole-Staging' },
    { name: 'prod', branch: 'main', roleName: 'GitHubActionsDeployRole-Prod' }
  ];
  
  const roleArns = {};
  
  console.log('\nCreating roles for each environment...\n');
  
  for (const env of environments) {
    console.log(`Setting up ${env.name}...`);
    const roleArn = await setupRole(iam, env.roleName, repo, env.branch, providerArn);
    await attachPolicy(iam, env.roleName);
    roleArns[env.name] = { roleArn, branch: env.branch };
    console.log('');
  }
  
  const sts = new STSClient({ region });
  const { Account } = await sts.send(new GetCallerIdentityCommand({}));
  
  console.log(`Setup complete!`);
  console.log(`AWS Account: ${Account}\n`);
  
  const config = `
GitHub OIDC Configuration (Multi-Environment)
Date: ${new Date().toISOString()}
Repository: ${repo}
Region: ${region}

OIDC Provider: ${providerArn}

Development Environment (dev branch):
Role ARN: ${roleArns.dev.roleArn}
Branch: ${roleArns.dev.branch}

Staging Environment (staging branch):
Role ARN: ${roleArns.staging.roleArn}
Branch: ${roleArns.staging.branch}

Production Environment (main branch):
Role ARN: ${roleArns.prod.roleArn}
Branch: ${roleArns.prod.branch}

Add these secrets to GitHub:
https://github.com/${repo}/settings/secrets/actions

For Development environment:
AWS_ROLE_ARN_DEV
${roleArns.dev.roleArn}

For Staging environment:
AWS_ROLE_ARN_STAGING
${roleArns.staging.roleArn}

For Production environment:
AWS_ROLE_ARN_PROD
${roleArns.prod.roleArn}

AWS_REGION (same for all):
${region}

Then delete these old secrets if they exist:
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
`;

  fs.writeFileSync('github-oidc-config.txt', config);
  
  console.log('Add these GitHub secrets:\n');
  console.log('AWS_ROLE_ARN_DEV');
  console.log(roleArns.dev.roleArn);
  console.log('');
  console.log('AWS_ROLE_ARN_STAGING');
  console.log(roleArns.staging.roleArn);
  console.log('');
  console.log('AWS_ROLE_ARN_PROD');
  console.log(roleArns.prod.roleArn);
  console.log('');
  console.log('AWS_REGION');
  console.log(region);
  console.log(`\nConfig saved to github-oidc-config.txt`);
  console.log(`\nNote: Each role is restricted to its specific branch`);
  console.log(`Run create-minimal-policy-multi-env.js for better security`);
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});