# Deployment Instructions

1. Rename all files with `.template` extension in the `env/main` directory.
2. Obtain the `.json` key from Google Cloud.
3. Activate the following APIs in Google Cloud: Google Cloud Storage (GCS), Cloud Run, Cloud Build, and Firestore in native mode.
4. Create a storage bucket in GCS to maintain the state; use the designated name in `backend.tf`.
5. Acquire the Notion API key from [Notion's Integrations Page](https://www.notion.so/my-integrations). Store this key in the GCP Secret Manager under the name `NOTION_API_KEY`. Ensure the Cloud Build service account has access to it.
6. Update the `sync_databases` list in the `env/main/terraform.tfvars` file.
7. Perform the initial sync locally if the database is large, to prevent timeout.
8. Initialize and upgrade Terraform by running: `cd env/main && terraform init -upgrade`.
9. Apply the Terraform configuration with: `cd env/main && terraform apply`.
10. Wait for the Cloud Build process to complete.

## Known Limitations

- Record deletion is not supported (absent in API).
- Similarly, renaming columns is not supported.
