# Jenkins B2

This repository contains two simple Jenkins projects:

1. A static site pipeline at the repository root.
2. A Docker image pipeline in `docker-ecr-project/` that builds an image and pushes it to Amazon ECR.

## Project Structure

```text
.
|-- Jenkinsfile
|-- README.md
|-- docker-ecr-project
|   |-- Dockerfile
|   |-- Jenkinsfile
|   |-- .dockerignore
|   `-- src
|       |-- index.html
|       `-- styles.css
`-- src
    |-- app.js
    |-- index.html
    `-- styles.css
```

## Project 1: Static Jenkins Pipeline

The root `Jenkinsfile` uses a declarative Jenkins pipeline with three stages:

1. `Validate` checks that the static site files contain the expected content.
2. `Test` checks that the JavaScript build-time rendering logic is present.
3. `Package` copies the static site into `dist/` and archives it as a build artifact.

To run it in Jenkins:

1. Create a new Pipeline job.
2. Set the definition to `Pipeline script from SCM`.
3. Choose Git and use this repository URL:

   ```text
   https://github.com/bharisagar/Jenkins-B2.git
   ```

4. Set the script path to `Jenkinsfile`.
5. Save the job and click `Build Now`.

## Project 2: Docker Image Push To Amazon ECR

The `docker-ecr-project/Jenkinsfile` builds `docker-ecr-project/Dockerfile`, creates the ECR repository if it does not exist, logs in to ECR, and pushes two tags:

1. `build-${BUILD_NUMBER}`
2. `latest`

Default image details:

```text
AWS Region: ap-south-1
ECR repository: jenkins-b2-docker-app
Jenkins credential ID: aws-ecr-credentials
```

## Jenkins Agent Requirements

Use a Linux Jenkins agent for the Docker/ECR project. The agent needs:

1. Docker installed and running.
2. AWS CLI v2 installed.
3. Git installed.
4. Jenkins user access to run Docker commands.
5. Jenkins plugins:
   - Pipeline
   - Git
   - Credentials Binding

Check the tools on the Jenkins agent:

```bash
docker --version
aws --version
git --version
```

If Docker permission fails on Linux, add the Jenkins user to the `docker` group and restart Jenkins:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

## AWS Setup For ECR

You can let the Jenkins pipeline create the ECR repository automatically, or you can create it manually before running Jenkins.

### Option A: Create ECR Repository With AWS CLI

Configure AWS CLI on your local machine or on an admin workstation:

```bash
aws configure
```

Enter:

```text
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: ap-south-1
Default output format: json
```

Verify the account:

```bash
aws sts get-caller-identity
```

Create the ECR repository:

```bash
aws ecr create-repository \
  --repository-name jenkins-b2-docker-app \
  --image-scanning-configuration scanOnPush=true \
  --region ap-south-1
```

Confirm it exists:

```bash
aws ecr describe-repositories \
  --repository-names jenkins-b2-docker-app \
  --region ap-south-1
```

### Option B: Let Jenkins Create ECR

The Jenkinsfile already runs:

```bash
aws ecr describe-repositories \
  --repository-names jenkins-b2-docker-app \
  --region ap-south-1 \
|| aws ecr create-repository \
  --repository-name jenkins-b2-docker-app \
  --image-scanning-configuration scanOnPush=true \
  --region ap-south-1
```

For this option, the Jenkins AWS credential must have permission to create and push to ECR.

## IAM Policy For Jenkins

Create an IAM user or IAM role for Jenkins. For a learning project, you can attach this policy after replacing the region/account details as needed.

Simple learning policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadAwsAccount",
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    },
    {
      "Sid": "EcrLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "EcrPushAndCreateRepository",
      "Effect": "Allow",
      "Action": [
        "ecr:CreateRepository",
        "ecr:DescribeRepositories",
        "ecr:BatchCheckLayerAvailability",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:DescribeImages",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

For production, create the repository first and then scope the ECR push permissions to only this repository ARN:

```text
arn:aws:ecr:ap-south-1:<aws-account-id>:repository/jenkins-b2-docker-app
```

You can also remove `ecr:CreateRepository` after the repository has been created.

## Create AWS Access Key For Jenkins

If you are using an IAM user:

1. Open AWS Console.
2. Go to `IAM`.
3. Open `Users`.
4. Create or select the Jenkins user.
5. Attach the IAM policy from the previous section.
6. Open `Security credentials`.
7. Create an access key.
8. Copy the access key ID and secret access key.

Keep the secret access key private. Do not commit it to Git.

If Jenkins runs on EC2, a better production setup is to attach an IAM role to the EC2 instance and avoid static access keys. This sample uses Jenkins credentials because it is easy to understand for a first ECR pipeline.

## Add AWS Credentials In Jenkins

The `docker-ecr-project/Jenkinsfile` expects this Jenkins credential ID:

```text
aws-ecr-credentials
```

Create it in Jenkins:

1. Open Jenkins.
2. Go to `Manage Jenkins`.
3. Open `Credentials`.
4. Open `System`.
5. Open `Global credentials`.
6. Click `Add Credentials`.
7. Set `Kind` to `Username with password`.
8. Set `Username` to the AWS access key ID.
9. Set `Password` to the AWS secret access key.
10. Set `ID` to:

    ```text
    aws-ecr-credentials
    ```

11. Add a description such as:

    ```text
    AWS credentials for pushing Jenkins B2 Docker image to ECR
    ```

12. Click `Create`.

## Create The Docker/ECR Jenkins Job

1. Create a new Jenkins Pipeline job.
2. Set the definition to `Pipeline script from SCM`.
3. Choose Git.
4. Set repository URL:

   ```text
   https://github.com/bharisagar/Jenkins-B2.git
   ```

5. Set branch:

   ```text
   */main
   ```

6. Set script path:

   ```text
   docker-ecr-project/Jenkinsfile
   ```

7. Save the job.
8. Click `Build with Parameters`.
9. Use these defaults, or change them for your AWS account:

   ```text
   AWS_REGION=ap-south-1
   ECR_REPOSITORY=jenkins-b2-docker-app
   IMAGE_TAG=
   ```

10. Run the build.

If `IMAGE_TAG` is blank, Jenkins uses:

```text
build-${BUILD_NUMBER}
```

## What The Docker/ECR Pipeline Does

The Docker/ECR pipeline runs these stages:

1. `Check Tools` verifies Docker and AWS CLI are available.
2. `Build Image` builds the local Docker image from `docker-ecr-project/Dockerfile`.
3. `Ensure ECR Repository` gets the AWS account ID and creates the ECR repository if it is missing.
4. `Login And Push` logs in to Amazon ECR, tags the image with the ECR URI, pushes the build tag, and pushes `latest`.

The final ECR image URI will look like this:

```text
<aws-account-id>.dkr.ecr.ap-south-1.amazonaws.com/jenkins-b2-docker-app:build-1
```

## Manual Docker/ECR Commands

These commands are useful for testing outside Jenkins. Replace `<aws-account-id>` with your AWS account ID.

```bash
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin <aws-account-id>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t jenkins-b2-docker-app:local docker-ecr-project

docker tag jenkins-b2-docker-app:local \
  <aws-account-id>.dkr.ecr.ap-south-1.amazonaws.com/jenkins-b2-docker-app:local

docker push <aws-account-id>.dkr.ecr.ap-south-1.amazonaws.com/jenkins-b2-docker-app:local
```

## Common Errors

`docker: permission denied`

The Jenkins user cannot access Docker. Add the Jenkins user to the Docker group or run the agent with Docker access.

`aws: command not found`

Install AWS CLI v2 on the Jenkins agent and make sure it is available in the Jenkins job PATH.

`no basic auth credentials`

The ECR login step failed or used the wrong AWS region/account. Check `AWS_REGION`, AWS credentials, and ECR repository account.

`AccessDeniedException`

The IAM user or role is missing one of the ECR permissions listed above.
