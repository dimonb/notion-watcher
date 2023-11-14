## Deploy instrunctions

* rename *.template in env/main
* get .json key from google cloud
* enable apis in google cloud for gcs, cloud run, cloud build, firestore in native mode
* create bucket in gcs to store state (use this name in backend.tf)
* get Notion API key from https://www.notion.so/my-integrations, store it in GCP Secret Manager with name NOTION_API_KEY, give access to cloud build service account
* fill list of sync_databases in env/main/terraform.tfvars
* run script localy for first sync if database has large size (to avoid timeout)
* run `cd env/main && terraform init -upgrade`
* run `cd env/main && terraform apply`
* wait for cloud build to finish