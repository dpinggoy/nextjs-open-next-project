import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface NextjsCdnConstructProps {
  environment: string;
  assetsBucket: s3.IBucket;
  oai: cloudfront.OriginAccessIdentity;
  ssrFunctionUrl: string;
  imageOptFunctionUrl: string;
  cacheTtl: {
    static: number;
    server: number;
  };
  domainName?: string;
  certificateArn?: string;
}

export class NextjsCdnConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: NextjsCdnConstructProps) {
    super(scope, id);

    const {
      environment,
      assetsBucket,
      oai,
      ssrFunctionUrl,
      imageOptFunctionUrl,
      cacheTtl,
      domainName,
      certificateArn,
    } = props;

    // Server-side cache policy
    const serverCachePolicy = new cloudfront.CachePolicy(this, 'ServerCachePolicy', {
      cachePolicyName: `NextjsServerCache-${environment}`,
      comment: `Server-side rendering cache policy for ${environment}`,
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      defaultTtl: cdk.Duration.seconds(cacheTtl.server),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'accept',
        'rsc',
        'next-router-prefetch',
        'next-router-state-tree',
        'next-url'
      ),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Static assets cache policy
    const staticCachePolicy = new cloudfront.CachePolicy(this, 'StaticCachePolicy', {
      cachePolicyName: `NextjsStaticCache-${environment}`,
      comment: `Static assets cache policy for ${environment}`,
      minTtl: cdk.Duration.seconds(0),
      maxTtl: cdk.Duration.days(365),
      defaultTtl: cdk.Duration.seconds(cacheTtl.static),
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
      headerBehavior: cloudfront.CacheHeaderBehavior.none(),
      cookieBehavior: cloudfront.CacheCookieBehavior.none(),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
    });

    // Server origin request policy
    const serverOriginRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      'ServerOriginRequestPolicy',
      {
        originRequestPolicyName: `NextjsServerOrigin-${environment}`,
        comment: `Origin request policy for Next.js server ${environment}`,
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          'accept',
          'rsc',
          'next-router-prefetch',
          'next-router-state-tree',
          'next-url',
          'x-forwarded-host',
          'x-prerender-revalidate'
        ),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      }
    );

    // CloudFront distribution configuration
    const distributionConfig: cloudfront.DistributionProps = {
      comment: `Next.js ${environment} Distribution`,
      priceClass: environment === 'prod' 
        ? cloudfront.PriceClass.PRICE_CLASS_ALL 
        : cloudfront.PriceClass.PRICE_CLASS_100,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      enableIpv6: true,
      // Add domain names if provided
      ...(domainName && certificateArn && {
        domainNames: [domainName],
        certificate: acm.Certificate.fromCertificateArn(
          this,
          'Certificate',
          certificateArn
        ),
      }),
      defaultBehavior: {
        origin: new origins.HttpOrigin(
          cdk.Fn.select(2, cdk.Fn.split('/', ssrFunctionUrl))
        ),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: serverCachePolicy,
        originRequestPolicy: serverOriginRequestPolicy,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      },
      additionalBehaviors: {
        '_next/static/*': {
          // origin: new origins.S3Origin(assetsBucket, {
          //   originAccessIdentity: oai,
          //   originPath: '/_assets',
          // }),
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(assetsBucket, {
            originAccessIdentity: oai,
            originPath: '/_assets',
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticCachePolicy,
          compress: true,
        },
        'public/*': {
          // origin: new origins.S3Origin(assetsBucket, {
          //   originAccessIdentity: oai,
          //   originPath: '/_assets/public',
          // }),
          origin: origins.S3BucketOrigin.withOriginAccessIdentity(assetsBucket, {
            originAccessIdentity: oai,
            originPath: '/_assets/public',
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: staticCachePolicy,
          compress: true,
        },
        '_next/image*': {
          origin: new origins.HttpOrigin(
            cdk.Fn.select(2, cdk.Fn.split('/', imageOptFunctionUrl))
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 500,
          ttl: cdk.Duration.seconds(0),
        },
      ],
    };

    // Add custom domain if provided
    if (domainName && certificateArn) {
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'Certificate',
        certificateArn
      );
    }

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', distributionConfig);

    // Store distribution ID in SSM Parameter Store
    new ssm.StringParameter(this, 'DistributionIdParameter', {
      parameterName: `/nextjs/${environment}/cloudfront-distribution-id`,
      stringValue: this.distribution.distributionId,
      description: `CloudFront Distribution ID for ${environment}`,
      tier: ssm.ParameterTier.STANDARD,
    });

    // Store distribution domain in SSM
    new ssm.StringParameter(this, 'DistributionDomainParameter', {
      parameterName: `/nextjs/${environment}/cloudfront-domain`,
      stringValue: this.distribution.distributionDomainName,
      description: `CloudFront Domain for ${environment}`,
      tier: ssm.ParameterTier.STANDARD,
    });

    // Outputs
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `nextjs-${environment}-distribution-id`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: domainName || this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `nextjs-${environment}-domain`,
    });

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: `https://${domainName || this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    // Tags
    cdk.Tags.of(this.distribution).add('Purpose', 'NextJS-CDN');
  }
}