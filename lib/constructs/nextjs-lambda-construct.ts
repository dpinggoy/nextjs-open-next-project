import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface NextjsLambdaConstructProps {
  environment: string;
  assetsBucket: s3.IBucket;
  imageCacheBucket: s3.IBucket;
  lambdaMemory: number;
  lambdaTimeout: number;
  enableProvisioning?: boolean;
  provisionedConcurrency?: number;
  environmentVariables?: Record<string, string>;
}

export class NextjsLambdaConstruct extends Construct {
  public readonly ssrFunction: lambda.Function;
  public readonly imageOptFunction: lambda.Function;
  public readonly ssrFunctionUrl: lambda.FunctionUrl;
  public readonly imageOptFunctionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: NextjsLambdaConstructProps) {
    super(scope, id);

    const {
      environment,
      assetsBucket,
      imageCacheBucket,
      lambdaMemory,
      lambdaTimeout,
      enableProvisioning,
      provisionedConcurrency,
      environmentVariables
    } = props;

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
      description: `Lambda execution role for Next.js ${environment}`,
    });

    // Grant S3 permissions
    assetsBucket.grantReadWrite(lambdaRole);
    imageCacheBucket.grantReadWrite(lambdaRole);

    // Prepare environment variables
    const lambdaEnvironment: Record<string, string> = {
      BUCKET_NAME: assetsBucket.bucketName,
      BUCKET_PREFIX: '_assets',
      NODE_ENV: environment === 'prod' ? 'production' : environment,
      NEXT_PUBLIC_ENV: environment,
      ...environmentVariables,
    };

    // SSR Lambda function
    this.ssrFunction = new lambda.Function(this, 'SSRFunction', {
      functionName: `nextjs-ssr-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('.open-next/server-functions/default'),
      memorySize: lambdaMemory,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      role: lambdaRole,
      environment: lambdaEnvironment,
      description: `Next.js SSR Lambda function for ${environment}`,
      architecture: lambda.Architecture.ARM_64
    });

    // SSR Function URL
    this.ssrFunctionUrl = this.ssrFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    })

    // Add provisioned concurrency if enabled
    if (enableProvisioning && provisionedConcurrency) {
      const version = this.ssrFunction.currentVersion;
      new lambda.Alias(this, 'SSRFunctionAlias', {
        aliasName: 'live',
        version: version,
        provisionedConcurrentExecutions: provisionedConcurrency,
        description: `Live alias with provisioned concurrency for ${environment}`,
      });
    }

    // Image Optimization Lambda Function
    this.imageOptFunction = new lambda.Function(this, 'ImageOptFunction', {
      functionName: `nextjs-image-opt-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('.open-next/image-optimization-function'),
      memorySize: Math.floor(lambdaMemory * 1.5),
      timeout: cdk.Duration.seconds(Math.min(lambdaTimeout * 2.5, 900)),
      role: lambdaRole,
      environment: {
        BUCKET_NAME: imageCacheBucket.bucketName,
        ...environmentVariables,
        },
        description: `Next.js Image Optimization for ${environment}`,
        architecture: lambda.Architecture.ARM_64
    });

    // Image Optimization Function URL
    this.imageOptFunctionUrl = this.imageOptFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    // Outputs
    new cdk.CfnOutput(this, 'SSRFunctionName', {
        value: this.ssrFunction.functionName,
        description: 'SSR Lambda Function Name'
    });

    new cdk.CfnOutput(this, 'ImageOptFunctionName', {
        value: this.ssrFunction.functionName,
        description: 'Image Optimization Lambda Function Name'
    });

    new cdk.CfnOutput(this, 'SSRFunctionUrl', {
        value: this.ssrFunctionUrl.url,
        description: 'SSR Function URL'
    });
    
    new cdk.CfnOutput(this, 'ImageOptFunctionUrl', {
        value: this.imageOptFunctionUrl.url,
        description: 'Image Optimization Function URL'
    });
  }
}