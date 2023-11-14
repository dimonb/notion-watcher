
all: deploy

deploy: terraform

plan:
		cd env/main && terraform plan

terraform:
		cd env/main && terraform apply -auto-approve

upgrade:
		cd env/main && terraform init -upgrade

LOG_DT := $(shell date -u -v -60M +"%Y-%m-%dT%H:%M:%S")

logs:
		gcloud logging read "resource.type=cloud_run_revision AND timestamp > \"${LOG_DT}\"" --project=notion-watcher --format="table(timestamp,labels.execution_id,severity,textPayload)"
