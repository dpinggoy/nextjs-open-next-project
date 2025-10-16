import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { env } from 'process';

export interface NextjsStorageConstructProps {
  environment: string;
  removalPolicy: cdk.RemovalPolicy;
  autoDeleteObjects: boolean;
}

export class NextjsStorageConstruct extends Construct {
    public readonly assetBucket: s3.Bucket;
    public readonly imageCacheBucket: s3.Bucket;

    constructor(scope: Construct, id: string, props: NextjsStorageConstructProps) {
        super(scope, id);
        
        const { environment, removalPolicy, autoDeleteObjects } = props;
        const stackAccount = cdk.Stack.of(this).account;
        const stackRegion = cdk.Stack.of(this).region;

        // S3 bucket for static assets
        this.assetBucket = new s3.Bucket(this, 'AssetBucket', {
            bucketName: `nextjs-assets-${environment}-${stackAccount}-${stackRegion}`,
            removalPolicy: removalPolicy,
            autoDeleteObjects: autoDeleteObjects,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    maxAge: 3000,
                },
            ],
            lifecycleRules: [
                {
                    id: 'DeleteOldVersions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
            ],
            versioned: environment === 'prod'
        });

        // S3 bucket for image caching
        this.imageCacheBucket = new s3.Bucket(this, 'ImageCacheBucket', {
            bucketName: `nextjs-image-cache-${environment}-${stackAccount}-${stackRegion}`,
            removalPolicy: removalPolicy,
            autoDeleteObjects: autoDeleteObjects,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            lifecycleRules: [
                {
                    id: 'ExpireCachedImages',
                    enabled: true,
                    expiration: cdk.Duration.days(environment === 'prod' ? 90 : 30),
                },
                {
                    id: 'TransitionToIA',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30),
                        }
                    ]
                }
            ],
        });

        // Deploy static assets to S3 asset bucket
        new s3deploy.BucketDeployment(this, 'DeployAssets', {
            sources: [s3deploy.Source.asset('.open-next/assets')],
            destinationBucket: this.assetBucket,
            destinationKeyPrefix: '_assets',
            prune: true,
            retainOnDelete: environment === 'prod',
            memoryLimit: 1024,
            exclude: ['**/cache/**'], // Exclude cache directory from assets
        });

        // Deploy cache files to S3 image cache bucket
        new s3deploy.BucketDeployment(this, 'DeployCache', {
            sources: [s3deploy.Source.asset('.open-next/cache')],
            destinationBucket: this.assetBucket, // Same bucket as assets, different prefix
            destinationKeyPrefix: '_cache',
            prune: false, // Don't prune - cache files are managed by Lambda
            retainOnDelete: environment === 'prod',
            memoryLimit: 512,
        });

        // Outputs
        new cdk.CfnOutput(this, 'AssetBucketName', {
            value: this.assetBucket.bucketName,
            description: 'S3 Assets Bucket Name',
        });

        new cdk.CfnOutput(this, 'AssetsBucketArn', {
            value: this.assetBucket.bucketArn,
            description: 'S3 Assets Bucket ARN',
        });

        new cdk.CfnOutput(this, 'ImageCacheBucketName', {
            value: this.imageCacheBucket.bucketName,
            description: 'S3 Image Cache Bucket Name',
        });

        // Tags
        cdk.Tags.of(this.assetBucket).add('Purpose', 'NextJsAssets');
        cdk.Tags.of(this.imageCacheBucket).add('Purpose', 'NextJsImageCache');
    }
}