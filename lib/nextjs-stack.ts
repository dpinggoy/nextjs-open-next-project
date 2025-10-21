import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
import { NextjsStorageConstruct } from './constructs/nextjs-storage-construct';
import { NextjsLambdaConstruct } from './constructs/nextjs-lambda-construct';
import { NextjsCdnConstruct } from './constructs/nextjs-cdn-construct';
import { env } from 'process';

export interface NextjsStackProps extends cdk.StackProps {
  environment: string;
  config: EnvironmentConfig;
  env?: cdk.Environment;
}

export interface EnvironmentConfig {
  domainName?: string;
  certificateArn?: string;
  lambdaMemory: number;
  lambdaTimeout: number;
  cacheTtl: {
    static: number;
    server: number;
  };
  enableProvisioning?: boolean;
  provisionedConcurrency?: number;
  environmentVariables?: Record<string, string>;
  tags?: Record<string, string>;
}

export class NextjsStack extends cdk.Stack {
  public readonly storage: NextjsStorageConstruct;
  public readonly lambda: NextjsLambdaConstruct;
  public readonly cdn: NextjsCdnConstruct;

  constructor(scope: Construct, id: string, props: NextjsStackProps) {
    super(scope, id, props);

    const { environment, config } = props;

    // Apply tags to all resources in this stack
    if(config.tags){
      Object.entries(config.tags).forEach(([Key, value]) => {
        cdk.Tags.of(this).add(Key, value);
      });
    }
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
    cdk.Tags.of(this).add('Application', 'NextJS');

    // Determine removal policy based on environment
    const removalPolicy = environment === 'prod'
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;
    const autoDeleteObjects = environment !== 'prod';

    // 1. Create Storage (S3 Buckets)
    this.storage = new NextjsStorageConstruct(this, 'Storage', {
      environment,
      removalPolicy,
      autoDeleteObjects
    });

    // 2. Create Lambda Functions
    this.lambda = new NextjsLambdaConstruct(this, 'Lambda', {
      environment,
      assetsBucket: this.storage.assetBucket,
      imageCacheBucket: this.storage.imageCacheBucket,
      lambdaMemory: config.lambdaMemory,
      lambdaTimeout: config.lambdaTimeout,
      enableProvisioning: config.enableProvisioning,
      provisionedConcurrency: config.provisionedConcurrency,
      environmentVariables: config.environmentVariables
    });

    // 3. Create CloudFront Origin Access Identity
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for Next.js ${environment}`
    });
    this.storage.assetBucket.grantRead(oai);

    // 4. Create CDN (CloudFront Distribution)
    this.cdn = new NextjsCdnConstruct(this, 'CDN', {
      environment,
      assetsBucket: this.storage.assetBucket,
      oai,
      ssrFunctionUrl: this.lambda.ssrFunctionUrl.url,
      imageOptFunctionUrl: this.lambda.imageOptFunctionUrl.url,
      cacheTtl: config.cacheTtl,
      domainName: config.domainName,
      certificateArn: config.certificateArn
    });

    // Stack-level outputs
    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'Deployment Environment'
    });

    new cdk.CfnOutput(this, 'StackName', {
      value: this.stackName,
      description: 'CloudFormation Stack Name'
    });

    new cdk.CfnOutput(this, 'CDNDistributionId', { 
      value: this.cdn.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${this.stackName}-DistributionId`
    });
  }
}