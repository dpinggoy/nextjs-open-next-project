#!/usr/bin/env node

const { IAMClient, CreatePolicyCommand, ListPoliciesCommand, CreatePolicyVersionCommand, 
        ListPolicyVersionsCommand, DeletePolicyVersionCommand, DetachRolePolicyCommand, 
        AttachRolePolicyCommand } = require('@aws-sdk/client-iam');

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'CloudFormation',
      Effect: 'Allow',
      Action: [
        'cloudformation:*Stack',
        'cloudformation:*ChangeSet',
        'cloudformation:DescribeStack*',
        'cloudformation:GetTemplate'
      ],
      Resource: '*'
    },
    {
      Sid: 'S3',
      Effect: 'Allow',
      Action: ['s3:*'],
      Resource: ['arn:aws:s3:::nextjs-*', 'arn:aws:s3:::nextjs-*/*', 'arn:aws:s3:::cdk-*', 'arn:aws:s3:::cdk-*/*']
    },
    {
      Sid: 'Lambda',
      Effect: 'Allow',
      Action: ['lambda:*Function*', 'lambda:*Permission', 'lambda:TagResource'],
      Resource: 'arn:aws:lambda:*:*:function:nextjs-*'
    },
    {
      Sid: 'CloudFront',
      Effect: 'Allow',
      Action: ['cloudfront:*Distribution', 'cloudfront:*Invalidation', 'cloudfront:*OriginAccessControl'],
      Resource: '*'
    },
    {
      Sid: 'IAM',
      Effect: 'Allow',
      Action: ['iam:*Role*', 'iam:PassRole', 'iam:TagRole'],
      Resource: ['arn:aws:iam::*:role/nextjs-*', 'arn:aws:iam::*:role/cdk-*']
    },
    {
      Sid: 'Logs',
      Effect: 'Allow',
      Action: ['logs:*LogGroup*'],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/nextjs-*'
    },
    {
      Sid: 'SSM',
      Effect: 'Allow',
      Action: ['ssm:GetParameter', 'ssm:PutParameter'],
      Resource: 'arn:aws:ssm:*:*:parameter/cdk-bootstrap/*'
    },
    {
      Sid: 'STS',
      Effect: 'Allow',
      Action: 'sts:AssumeRole',
      Resource: 'arn:aws:iam::*:role/cdk-*'
    }
  ]
};

async function main() {
  console.log('\nCreating minimal IAM policy\n');
  
  const iam = new IAMClient({});
  const policyName = 'GitHubActionsCDKDeployPolicy';
  const roleName = 'GitHubActionsDeployRole';
  
  console.log('Checking for existing policy...');
  
  const { Policies } = await iam.send(new ListPoliciesCommand({ Scope: 'Local' }));
  const existing = Policies.find(p => p.PolicyName === policyName);
  
  let policyArn;
  
  if (existing) {
    console.log('Policy exists, updating...');
    policyArn = existing.Arn;
    
    const { Versions } = await iam.send(new ListPolicyVersionsCommand({ PolicyArn: policyArn }));
    
    if (Versions.length >= 5) {
      const oldest = Versions.filter(v => !v.IsDefaultVersion).sort((a, b) => 
        new Date(a.CreateDate) - new Date(b.CreateDate)
      )[0];
      
      await iam.send(new DeletePolicyVersionCommand({
        PolicyArn: policyArn,
        VersionId: oldest.VersionId
      }));
    }
    
    await iam.send(new CreatePolicyVersionCommand({
      PolicyArn: policyArn,
      PolicyDocument: JSON.stringify(policy),
      SetAsDefault: true
    }));
  } else {
    console.log('Creating new policy...');
    const result = await iam.send(new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policy),
      Description: 'Minimal permissions for GitHub Actions CDK deployments'
    }));
    policyArn = result.Policy.Arn;
  }
  
  console.log('Updating role permissions...');
  
  try {
    await iam.send(new DetachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: 'arn:aws:iam::aws:policy/AdministratorAccess'
    }));
  } catch (err) {
    // already detached
  }
  
  await iam.send(new AttachRolePolicyCommand({
    RoleName: roleName,
    PolicyArn: policyArn
  }));
  
  console.log('\nDone! Role now has minimal permissions.');
  console.log('\nPermissions include:');
  console.log('- CloudFormation');
  console.log('- S3');
  console.log('- Lambda');
  console.log('- CloudFront');
  console.log('- IAM (limited)');
  console.log('- CloudWatch Logs');
  console.log('- SSM');
  console.log('\nIf deployment fails, check logs for missing permissions.');
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});