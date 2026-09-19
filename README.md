# Jenkins B2

This repository contains three simple Jenkins projects:

1. A static site pipeline at the repository root.
2. A Docker image pipeline in `docker-ecr-project/` that builds an image and pushes it to Amazon ECR.
3. A Multibranch Pipeline sample in `multibranch-project/` that runs different stages for different Git branches.

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
|-- multibranch-project
|   |-- Jenkinsfile
|   |-- README.md
|   |-- config
|   |   `-- branch-rules.json
|   `-- src
|       |-- app.js
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

## Project 3: Jenkins Multibranch Pipeline

A Jenkins Multibranch Pipeline is a Jenkins job type that scans a source code repository, finds branches or pull requests that contain a Jenkinsfile, and automatically creates a separate pipeline run for each branch.

In a normal Pipeline job, you manually configure one job for one branch. In a Multibranch Pipeline job, Jenkins manages the branch jobs for you. When a new branch is pushed, Jenkins can discover it. When a branch is deleted, Jenkins can remove or disable the matching branch job based on the job settings.

This is useful when teams use Git branches like:

```text
main
development
feature/login-page
feature/payment-api
release/v1.0.0
```

Each branch can run the same Jenkinsfile, or each branch can have a changed Jenkinsfile while that change is being tested. That is why Multibranch Pipeline is commonly used for Pipeline as Code.

Official Jenkins references:

```text
https://www.jenkins.io/doc/book/pipeline/multibranch/
https://www.jenkins.io/doc/book/pipeline/pipeline-as-code/
```

### What This Multibranch Sample Does

The sample project is in:

```text
multibranch-project/
```

The Jenkinsfile path is:

```text
multibranch-project/Jenkinsfile
```

The pipeline uses Jenkins branch variables such as:

```text
BRANCH_NAME
CHANGE_ID
BUILD_NUMBER
```

The pipeline runs these stages:

1. `Checkout` checks out the exact branch or pull request revision Jenkins selected.
2. `Branch Context` decides what kind of branch is running.
3. `Validate` checks the sample app and branch rules.
4. `Package` creates a branch-specific artifact under `multibranch-project/dist/`.
5. Branch-specific stages run only when their branch rule matches.

Branch behavior:

```text
main          -> validate, package, simulate production deployment
development   -> validate, package, simulate development delivery
release/*     -> validate, package, simulate release candidate checks
feature/*     -> validate, package, simulate feature branch checks
pull request  -> validate, package, simulate PR checks
```

This sample does not deploy to a real server. It prints clear messages and archives build artifacts so you can safely learn how Multibranch Pipeline works.

### Jenkins Requirements For Multibranch Pipeline

Install or confirm these Jenkins plugins:

1. Pipeline
2. Git
3. GitHub Branch Source, recommended for GitHub repositories
4. Credentials Binding, optional but useful for private repositories

For a public GitHub repository, credentials are usually not required for a basic scan. For a private repository, or to avoid GitHub API rate limits, add GitHub credentials in Jenkins.

### Clone This Repository Locally

Run these commands on your local machine:

```bash
git clone https://github.com/bharisagar/Jenkins-B2.git
cd Jenkins-B2
```

Check the files:

```bash
ls
ls multibranch-project
```

On Windows PowerShell:

```powershell
git clone https://github.com/bharisagar/Jenkins-B2.git
cd Jenkins-B2
Get-ChildItem
Get-ChildItem multibranch-project
```

### Create Example Branches

Jenkins Multibranch Pipeline becomes more useful when the repository has multiple branches. You can create demo branches from `main`:

```bash
git checkout main
git pull origin main

git checkout -b development
git push -u origin development

git checkout main
git checkout -b feature/multibranch-demo
git push -u origin feature/multibranch-demo

git checkout main
git checkout -b release/v1.0.0
git push -u origin release/v1.0.0

git checkout main
```

After these branches are pushed, Jenkins can discover and run separate branch jobs for:

```text
main
development
feature/multibranch-demo
release/v1.0.0
```

### Create The Multibranch Pipeline Job In Jenkins

1. Open Jenkins.
2. Click `New Item`.
3. Enter a job name:

   ```text
   Jenkins-B2-Multibranch
   ```

4. Select `Multibranch Pipeline`.
5. Click `OK`.
6. Find `Branch Sources`.
7. Click `Add source`.
8. Choose `GitHub` if the GitHub Branch Source plugin is installed, or choose `Git` for a simple Git setup.

For GitHub Branch Source:

1. Set repository HTTPS URL:

   ```text
   https://github.com/bharisagar/Jenkins-B2.git
   ```

2. Add credentials only if Jenkins needs them.
3. Keep branch discovery enabled.
4. Enable pull request discovery if you want Jenkins to build pull requests.

For simple Git branch source:

1. Set project repository:

   ```text
   https://github.com/bharisagar/Jenkins-B2.git
   ```

2. Add credentials only if Jenkins needs them.
3. Set branch include behavior if you want to limit branches. For learning, keep all branches included.

### Set The Jenkinsfile Script Path

This repository has multiple Jenkins examples, so set the Multibranch Pipeline script path to:

```text
multibranch-project/Jenkinsfile
```

In Jenkins this is usually under:

```text
Build Configuration -> Mode: by Jenkinsfile -> Script Path
```

If you leave the script path as the default `Jenkinsfile`, Jenkins will run the root static-site pipeline instead of the Multibranch sample.

### Configure Branch Scanning

In the job configuration, find `Scan Multibranch Pipeline Triggers`.

For learning, enable:

```text
Periodically if not otherwise run
```

Set the interval to something like:

```text
1 minute
```

or:

```text
5 minutes
```

For real projects, use GitHub webhooks instead of frequent polling.

### Save And Execute

1. Click `Save`.
2. Jenkins will scan the repository.
3. Jenkins will create child jobs for branches that contain `multibranch-project/Jenkinsfile`.
4. Click `Scan Repository Now` if Jenkins does not scan immediately.
5. Open a discovered branch job such as `main`.
6. Click `Build Now` if Jenkins has not already started the first run.

After a successful run, open the build and check:

```text
Console Output
Artifacts
Pipeline Steps
```

The archived artifacts come from:

```text
multibranch-project/dist/**
```

### Execute By Changing A Branch

To trigger a feature branch build:

```bash
git checkout feature/multibranch-demo
```

Edit a file, for example:

```text
multibranch-project/src/index.html
```

Commit and push:

```bash
git add multibranch-project/src/index.html
git commit -m "Update multibranch demo page"
git push
```

Then in Jenkins:

1. Open the Multibranch Pipeline job.
2. Click `Scan Repository Now`, or wait for the periodic scan.
3. Open the `feature/multibranch-demo` branch job.
4. Watch the build run the `Feature Branch Checks` stage.

### Execute A Pull Request Build

If you configured GitHub Branch Source and pull request discovery:

1. Push a branch:

   ```bash
   git checkout -b feature/readme-update
   git push -u origin feature/readme-update
   ```

2. Open GitHub.
3. Create a pull request from `feature/readme-update` into `main`.
4. Jenkins scans the pull request.
5. Jenkins runs the `Pull Request Checks` stage because `CHANGE_ID` is set.

### Common Multibranch Pipeline Errors

`No Jenkinsfile found`

The script path is wrong, or the branch does not contain the Jenkinsfile. For this sample, use:

```text
multibranch-project/Jenkinsfile
```

`Only main branch appears`

The repository may not have other branches yet, or the branch source behavior is filtering them out. Push branches like `development` and `feature/multibranch-demo`, then run `Scan Repository Now`.

`Pull requests are not building`

Use the GitHub Branch Source plugin and enable pull request discovery in the branch source settings.

`Jenkins cannot clone repository`

Check the repository URL and Jenkins credentials. Private repositories require credentials with permission to read the repository.

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
