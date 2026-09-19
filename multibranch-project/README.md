# Jenkins Multibranch Pipeline Sample

This folder contains a small static application and a Jenkinsfile designed for a Jenkins Multibranch Pipeline job.

The same `multibranch-project/Jenkinsfile` runs on every branch, but it changes behavior based on Jenkins-provided branch variables such as `BRANCH_NAME` and `CHANGE_ID`.

## Branch Behavior

```text
main          -> validate, package, simulate production deployment
development   -> validate, package, simulate development delivery
release/*     -> validate, package, simulate release candidate checks
feature/*     -> validate, package, simulate feature branch checks
pull request  -> validate, package, simulate PR checks
```

Use this script path when creating the Jenkins Multibranch Pipeline:

```text
multibranch-project/Jenkinsfile
```
