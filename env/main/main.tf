locals {
  env = "main"
}

provider "google" {
    project     = "${var.project}"
    region = "${var.region}"
    credentials = fileexists("${var.credentials}")?file("${var.credentials}"):null
}

provider "google-beta" {
    project     = "${var.project}"
    region = "${var.region}"
    credentials = fileexists("${var.credentials}")?file("${var.credentials}"):null
}

resource "random_id" "bh" {
    byte_length = 8
}

resource "google_storage_bucket" "bucket" {
  name = "${var.project}-functions-${random_id.bh.hex}" # This bucket name must be unique
  project  = "${var.project}"
  location      = "${var.location}"
}


resource "random_id" "nf" {
    byte_length = 8
}

resource "google_cloudfunctions2_function" "notion_sync" {
    name = "notion-fetch-${local.env}-${random_id.nf.hex}"
    description = "Function to fetch data from Notion"
    location = "${var.region}"

    build_config {
        runtime = "nodejs20"
        entry_point = "notionSync"
        
        source {
            storage_source {
                bucket = google_storage_bucket.bucket.name
                object = google_storage_bucket_object.function.name
            }
        }
    }

    service_config {
        max_instance_count = 1
        available_memory = "256M"
        timeout_seconds = 60
        ingress_settings = "ALLOW_INTERNAL_ONLY"
        all_traffic_on_latest_revision = true
        secret_environment_variables {
            key = "NOTION_API_KEY"
            project_id = "${var.project}"
            secret = "NOTION_API_KEY"
            version = "latest"
        }
        environment_variables = {
            "NOTION_DATABASE_IDS" = var.sync_databases
            "FIRESTORE_COLLECTION" = var.firestore_collection
        }
    }

    event_trigger {
        trigger_region = "${var.region}"
        event_type = "google.cloud.pubsub.topic.v1.messagePublished"
        pubsub_topic = google_pubsub_topic.default.id
        retry_policy          = "RETRY_POLICY_DO_NOT_RETRY"
    }
}

data "archive_file" "function" {
    type        = "zip"
    source_dir  = "${path.root}/../../functions/notion-sync"
    output_path = "${path.root}/.generated/notion_sync.zip"
}

resource "google_storage_bucket_object" "function" {
  name   = "${data.archive_file.function.output_md5}.zip"
  bucket = google_storage_bucket.bucket.name
  source = "${path.root}/.generated/notion_sync.zip"
}

resource "google_pubsub_topic" "default" {
  name = "notion-sync-cron"
}


resource "google_cloud_scheduler_job" "run_notion_sync" {
  name        = "run_notion_sync"
  description = "Run Notion Sync"
  schedule    = "* * * * *"
  time_zone   = "UTC"
  region      = "${var.region}"

  retry_config {
    retry_count = 1
  }
  
  pubsub_target {
    topic_name = google_pubsub_topic.default.id
    data = base64encode("{}")
  }
}