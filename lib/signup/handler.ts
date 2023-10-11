// import {
//   CognitoIdentityProviderClient,
//   SignUpCommand,
//   SignUpCommandInput,
// } from "@aws-sdk/client-cognito-identity-provider";

// const client = new CognitoIdentityProviderClient();

// export const handler = async (event: {
//   body: string;
// }): Promise<{ statusCode: number; body: string }> => {
//   try {
//     const { username, password, email } = JSON.parse(event.body) as {
//       username?: string;
//       password?: string;
//       email?: string;
//     };
//     console.log("Received event body:", event.body);

//     if (
//       username === undefined ||
//       password === undefined ||
//       email === undefined
//     ) {
//       return {
//         statusCode: 400,
//         body: "Missing username, email, or password",
//       };
//     }

//     const userPoolClientId = process.env.USER_POOL_CLIENT_ID;

//     const params: SignUpCommandInput = {
//       ClientId: userPoolClientId,
//       Username: username,
//       Password: password,
//       UserAttributes: [
//         {
//           Name: "email",
//           Value: email,
//         },
//       ],
//     };

//     await client.send(new SignUpCommand(params));
//     return { statusCode: 200, body: "User Registered successfully" };
//   } catch (error) {
//     console.error("Error:", error);

//     // Handle the error and return an appropriate response
//     return {
//       statusCode: 500, // or another appropriate error code
//       body: "Error registering user",
//     };
//   }
// };


import {
  CognitoIdentityProviderClient,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

export const handler = async (event: {
  body: '{"username": "test", "password": "test", "email": "roseodhiambo466@gmail.com" }';
}): Promise<{ statusCode: number; body: string }> => {
    const { username, password, email } = JSON.parse(event.body) as {
      username?: string;
      password?: string;
      email?: string;
    };

    if (
      username === undefined ||
      password === undefined ||
      email === undefined
    ) {
      return Promise.resolve({
        statusCode: 400,
        body: "Missing username, email or password",
      });
    }

    const userPoolClientId = process.env.USER_POOL_CLIENT_ID;

    await client.send(
      new SignUpCommand({
        ClientId: userPoolClientId,
        Username: username,
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
        ],
      })
    );

    return { statusCode: 200, body: "User created" };
  
};