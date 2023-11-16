# Notion Sync

Sync Notion databases to Google Cloud Firestore.

## Deployment Instructions

1. Rename all files with `.template` extension in the `env/main` directory.
2. Obtain the `.json` key from Google Cloud.
3. Enable google api for the project: `gcloud services enable cloudbuild.googleapis.com cloudscheduler.googleapis.com cloudfunctions.googleapis.com compute.googleapis.com eventarc.googleapis.com run.googleapis.com secretmanager.googleapis.com firestore.googleapis.com --project=<YOUR PROJECT>` 
4. Enable Firestore in native mode.
5. Create a storage bucket in GCS to maintain the state; use the designated name in `backend.tf`.
6. Acquire the Notion API key from [Notion's Integrations Page](https://www.notion.so/my-integrations). Store this key in the GCP Secret Manager under the name `NOTION_API_KEY`. Ensure the Cloud Build service account has access to it.
`gcloud secrets create NOTION_API_KEY --replication-policy="automatic" --project=<YOUR PROJECT> && echo -n "YOUR_API_KEY_HERE" | gcloud secrets versions add NOTION_API_KEY --data-file=- --project=<YOUR PROJECT> && gcloud projects add-iam-policy-binding <YOUR PROJECT> --member='serviceAccount:<ID OF PROJECT>-compute@developer.gserviceaccount.com' --role='roles/secretmanager.secretAccessor'`
7. Update the `sync_databases` list in the `env/main/terraform.tfvars` file.
8. Perform the initial sync locally if the database is large, to prevent timeout.
9. Initialize and upgrade Terraform by running: `cd env/main && terraform init -upgrade`.
10. Apply the Terraform configuration with: `cd env/main && terraform apply`.
11. Wait for the Cloud Build process to complete.

## Known Limitations

- Record deletion is not supported (absent in API).
- Similarly, renaming columns is not supported.
