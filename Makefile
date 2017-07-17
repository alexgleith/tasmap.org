deploy:
	gulp build
	aws s3 sync ./dist s3://tasmap.org --acl public-read
	# This next line is particular to my configuration...
	aws cloudfront create-invalidation --distribution-id E1ZTC5SR1UEX6W --paths '/*'

run:
	gulp serve

deploy-infrastructure:
	AWS_DEFAULT_REGION=ap-southeast-2 \
	aws cloudformation create-stack \
		--stack-name tasmap-infrastructure \
		--template-body file://s3infra.json \
		--parameters ParameterKey=DomainName,ParameterValue=tasmap.org