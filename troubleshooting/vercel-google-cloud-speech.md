# Troubleshooting speech synthesis on Vercel

The Speak feature uses Gemini speech generation on Google Cloud. It worked locally because the development machine had Google Application Default Credentials, but Vercel needed its own authentication configuration.

## Authentication setup

The speech route uses Vercel OpenID Connect (OIDC) and Google Cloud Workload Identity Federation in Vercel. Locally, it uses Application Default Credentials. Set these environment variables for the relevant Vercel environments:

```text
GCP_PROJECT_ID=silent-card-324616
GCP_PROJECT_NUMBER=939034873256
GCP_SERVICE_ACCOUNT_EMAIL=vercel@silent-card-324616.iam.gserviceaccount.com
GCP_WORKLOAD_IDENTITY_POOL_ID=vercel
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=vercel
```

Enable OIDC for the Vercel project. The Google Cloud workload identity provider must trust the issuer and audience in the Vercel token, and its attribute mapping must include `google.subject = assertion.sub`. The service account also needs the appropriate Vertex AI permissions.

## Errors and fixes

### Could not load the default credentials

Vercel did not have the local machine's credentials, and the route originally used only Application Default Credentials. The route was changed to exchange Vercel's OIDC token for Google Cloud credentials through the workload identity provider and service account. Redeploy after applying the code and environment configuration.

### Issuer in ID token does not match

The Vercel project used a team-specific issuer while the Google provider expected the global issuer. In **Google Cloud Console → IAM & Admin → Workload Identity Federation → vercel pool → vercel provider**, set the issuer URL to the exact token issuer:

```text
https://oidc.vercel.com/nathan-nguyens-projects-706e7cf3
```

### Audience in ID token does not match

The Google provider's allowed audience did not match the Vercel token. In the provider's audience settings, select **Allowed audiences** and add:

```text
https://vercel.com/nathan-nguyens-projects-706e7cf3
```

### `iam.serviceAccounts.getAccessToken` denied

The federated identity needs **Workload Identity User** (`roles/iam.workloadIdentityUser`) on the service account itself. Open **IAM & Admin → Service Accounts → vercel service account → Principals with access** and grant that role to the exact subject for the deployment:

```text
principal://iam.googleapis.com/projects/939034873256/locations/global/workloadIdentityPools/vercel/subject/owner:nathan-nguyens-projects-706e7cf3:project:vuahocvuachoi:environment:production
```

The project name and environment must match the token's subject. Preview deployments require a separate matching principal ending in `environment:preview`. A principal containing the literal placeholder `SUBJECT_ATTRIBUTE_VALUE` does not match a deployment. Allow time for IAM changes to propagate.

If this error persists, check the actual token subject against the binding, the provider's attribute mapping, and the service account's **Principals with access** page. The IAM Troubleshooter reported “principal not found” during this investigation; that result alone did not establish that the federated identity had been deleted. The precise reason the final retry succeeded was not established.

The speech route currently has a temporary failure diagnostic that logs the token subject, not the token, to help compare the binding. Remove it when no longer needed. Never share or log the OIDC token itself.

## References

- [Vercel: Connect to Google Cloud Platform](https://vercel.com/docs/oidc/gcp)
- [Google Cloud: Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
