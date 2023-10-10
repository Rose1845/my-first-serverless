import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import path = require("path");
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class MyFirstAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'MyFirstAppQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    new cdk.aws_lambda_nodejs.NodejsFunction(this, "myFirstLambda", {
      entry: path.join(__dirname, "myFirstLambda", "handler.ts"),
      handler: "handler",
    });

    // add RestAPi ebdpoint
    const myFirstApi = new cdk.aws_apigateway.RestApi(this, "myFirstApi", {});
    const diceResource = myFirstApi.root.addResource("dice");

    const rollADiceFunction = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "rollADiceFunction",
      {
        entry: path.join(__dirname, "rollADice", "handler.ts"),
        handler: "handler",
      }
    );

    diceResource.addMethod(
      "GET",
      new cdk.aws_apigateway.LambdaIntegration(rollADiceFunction)
    );
    // create table
    const notesTable = new cdk.aws_dynamodb.Table(this, "notesTable", {
      partitionKey: {
        name: "PK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: cdk.aws_dynamodb.AttributeType.STRING,
      },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    // notes
    const createNote = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "createNote",
      {
        entry: path.join(__dirname, "createNote", "handler.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: notesTable.tableName, // VERY IMPORTANT
        },
      }
    );

    const getNote = new cdk.aws_lambda_nodejs.NodejsFunction(this, "getNote", {
      entry: path.join(__dirname, "getNote", "handler.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: notesTable.tableName, // VERY IMPORTANT
      },
    });

    notesTable.grantWriteData(createNote); // VERY IMPORTANT
    notesTable.grantReadData(getNote);

    const notesResource = myFirstApi.root
      .addResource("notes")
      .addResource("{userId}");

    notesResource.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(createNote)
    );

    notesResource
      .addResource("{id}")
      .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(getNote));

    // File storage

    /***
     * add s3 bucket using cdk
     */
    const articlesBucket = new cdk.aws_s3.Bucket(this, "articlesBucket", {
      // bucketName: "nyaugenyabucket",
      lifecycleRules: [
        // Enable intelligent tiering
        {
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.INTELLIGENT_TIERING,
              transitionAfter: cdk.Duration.days(0),
            },
          ],
        },
      ],
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL, // Enable block public access
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED, // Enable encryption
    });

    const articlesDatabase = new cdk.aws_dynamodb.Table(
      this,
      "articlesDatabase",
      {
        partitionKey: {
          name: "PK",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        sortKey: {
          name: "SK",
          type: cdk.aws_dynamodb.AttributeType.STRING,
        },
        billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      }
    );

    const publishArticle = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "publishArticle",
      {
        entry: path.join(__dirname, "publishArticle", "handler.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: articlesDatabase.tableName,
          BUCKET_NAME: articlesBucket.bucketName,
        },
      }
    );

    const listArticles = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "listArticles",
      {
        entry: path.join(__dirname, "listArticles", "handler.ts"),
        handler: "handler",
        environment: {
          TABLE_NAME: articlesDatabase.tableName,
          BUCKET_NAME: articlesBucket.bucketName,
        },
      }
    );

    const getArticle = new cdk.aws_lambda_nodejs.NodejsFunction(
      this,
      "getArticle",
      {
        entry: path.join(__dirname, "getArticle", "handler.ts"),
        handler: "handler",
        environment: {
          // TABLE_NAME: articlesDatabase.tableName,
          BUCKET_NAME: articlesBucket.bucketName,
        },
      }
    );

    // grant permission
    articlesBucket.grantWrite(publishArticle);
    articlesDatabase.grantWriteData(publishArticle);
    articlesDatabase.grantReadData(listArticles);
    articlesBucket.grantRead(getArticle);

    // plug our lambda funtions to restApi
    const articlesResource = myFirstApi.root.addResource("articles");

    articlesResource.addMethod(
      "POST",
      new cdk.aws_apigateway.LambdaIntegration(publishArticle)
    );
    articlesResource.addMethod(
      "GET",
      new cdk.aws_apigateway.LambdaIntegration(listArticles)
    );
    articlesResource
      .addResource("{id}")
      .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(getArticle));

    /**
     * Autheniticatio using Cognito
     */
    const userPool = new cdk.aws_cognito.UserPool(this, "myFirstUserPool", {
      selfSignUpEnabled: true,
      autoVerify: {
        email: true,
      },
    });

    const userPoolClient = new cdk.aws_cognito.UserPoolClient(
      this,
      "myFirstUserPoolClient",
      {
        userPool,
        authFlows: {
          userPassword: true,
        },
      }
    );

    // Provision a signup lambda function
    const signup = new cdk.aws_lambda_nodejs.NodejsFunction(this, "signup", {
      entry: path.join(__dirname, "signup", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // Give the lambda function the permission to sign up users
    signup.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:SignUp"],
        resources: [userPool.userPoolArn],
      })
    );

    // Provision a signup lambda function
    const confirm = new cdk.aws_lambda_nodejs.NodejsFunction(this, "confirm", {
      entry: path.join(__dirname, "confirm", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // Give the lambda function the permission to sign up users
    confirm.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:ConfirmSignUp"],
        resources: [userPool.userPoolArn],
      })
    );

    // Provision a signin lambda function
    const signin = new cdk.aws_lambda_nodejs.NodejsFunction(this, "signin", {
      entry: path.join(__dirname, "signin", "handler.ts"),
      handler: "handler",
      environment: {
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
      },
    });

    // GIve the lambda function the permission to sign in users
    signin.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["cognito-idp:InitiateAuth"],
        resources: [userPool.userPoolArn],
      })
    );

    // Add routes to the API
    myFirstApi.root
      .addResource("sign-up")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(signup));
    myFirstApi.root
      .addResource("sign-in")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(signin));
    myFirstApi.root
      .addResource("confirm")
      .addMethod("POST", new cdk.aws_apigateway.LambdaIntegration(confirm));

      const authorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(
        this,
        "myFirstAuthorizer",
        {
          cognitoUserPools: [userPool],
          identitySource: "method.request.header.Authorization",
        }
      );

      const secretLambda = new cdk.aws_lambda_nodejs.NodejsFunction(
        this,
        "secret",
        {
          entry: path.join(__dirname, "secret", "handler.ts"),
          handler: "handler",
        }
      );

      // Create a new secret route, triggering the secret Lambda, and protected by the authorizer
      myFirstApi.root
        .addResource("secret")
        .addMethod("GET", new cdk.aws_apigateway.LambdaIntegration(secretLambda), {
          authorizer,
          authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
        });
  }
}
