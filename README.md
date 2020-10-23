# marketing-ops

# engagement scoring

## Run locally

```
sls invoke local --function ghost --aws-profile marketing --stage prod 
```

## Deploy

### Recommended

Commit and push to master

### Manual

```
sls deploy --aws-profile marketing-admin --stage prod
```
(this requires that you're admin and will ask for your 2FA credentials)
