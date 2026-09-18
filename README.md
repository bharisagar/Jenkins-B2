# Jenkins B2

A small static project for practicing Jenkins pipelines.

## What the pipeline does

The `Jenkinsfile` uses a declarative Jenkins pipeline with three stages:

1. `Validate` checks that the static site files contain the expected content.
2. `Test` checks that the JavaScript build-time rendering logic is present.
3. `Package` copies the static site into `dist/` and archives it as a build artifact.

The pipeline works on both Linux and Windows Jenkins agents.

## Project structure

```text
.
|-- Jenkinsfile
|-- README.md
`-- src
    |-- app.js
    |-- index.html
    `-- styles.css
```

## Run in Jenkins

1. Create a new Pipeline job.
2. Set the definition to `Pipeline script from SCM`.
3. Choose Git and use this repository URL:

   ```text
   https://github.com/bharisagar/Jenkins-B2.git
   ```

4. Set the script path to `Jenkinsfile`.
5. Save the job and click `Build Now`.

The archived site files will appear under the build artifacts after a successful run.
