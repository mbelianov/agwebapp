
<p >
    <img src="https://img.shields.io/badge/IBM%20Cloud-powered-blue.svg" alt="IBM Cloud">
    <img src="https://img.shields.io/badge/platform-node-lightgrey.svg?style=flat" alt="platform">
    <img src="https://img.shields.io/badge/license-Apache2-blue.svg?style=flat" alt="Apache 2">
</p>


# 1. Deploying to IBM Cloud
1. Create Cloud Foundry organization and space e.g. `AG` & `prod` 
2. Choose a name and create Cloud Foundry app in the created space e.g. `webapp`
3. Create second instance in the same CF space that will be used for preview purposes when you deploy new features. e.g. `webapp-preview`
4. Create CloudantDB e.g. `mydb`. When creating the CloudantDB chose combined "IAM and Legacy Credentials" authentication mechanism.
5. Open `mydb` dashboard and created two databases - `patients-db` and `exams-db`. Use exactly those names.
6. Create following query indexes:
   1. In `patients-db`:

        ```json
        {
            "index": {
                "fields": [
                    "timestamp"
                ]},
            "name": "timestamp-json-index",
            "type":"json"
        }
        ```
    2. In `exams-db`:
        
        ```json
        {
            "index": {
                "fields": [
                    "timestamp"
                ]},
            "name": "timestamp-json-index",
            "type":"json"
        }
        ```

        ```json
        {
            "index": {
                "fields": [
                    "patient.patientEGN"
                    ]},
            "name": "egn-json-index",
            "type":"json"
        }
        ```
        
        ```json
        {
            "index": {
                "fields": [
                    "examId"
                ]},
            "name": "examId-json-index",
            "type":"json"
        }
        ```
7. Create 'Service Credentials' for your CloudantDB. Credantials of this Service Instance will be used by your development server to access the DB when you develop new features. Choose appropriate name of the Service Instance e.g. `OnPrem Access for CloudantDB`
8. Chose a name and create App Id instance for your app e.g. `webapp-appid`
9. Similarly create 'Service Credentials' for on-prem access for your dev server.
10. Create new 'regularwebapp' application (from AppId point of view that would be an OAuth Client) in your newly created AppId instance.
11. Add Web Redirect URLs for your application. Web Redirect URLs is composed as `http://appurl/callback`. You can check your appurl from your the Cloud Foundry console page of your app. It should look something like `http://webapp.eu-de.mybluemix.net`
12. From the Cloud Foundry console page of your apps (`webapp` and `webapp-preview`) create Connections to both `webapp-appid` and `mydb` instances.
13. Create empty devops toolchain. Give it a name you want.
14. Add GitHub integration and link it to this repository
15. Add Classic Delivery Pipeline integration.
    1.  Create API key for your account and provide this key to the Delivery Pipeline.
        1.  Open the Delivery Pipeline tile, click on Actions->Configure Pipeline, add Environment Variable with a nme API_KEY and paste the API key you created.
    2.  Add Build stage and two Deploy stages. The first Deploy stage will delpoy the preview app, the second Deploy stage will deploy the production app. Configure the second deploy stage to run manually
    3.  Configure the Build stage: 
        1.  in the Input tab, make a link to this GithHub repo, select branch
        2.  In the Jobs tab, add a build job, select type "Shell Script"
    4.  Configure the Deploy Preview stage
        1.  In the Input tab, select "Build artefacts" 
        2.  In the Jobs tab, select deployer type -> Cloud Foundry, cloud foundry type -> IBM Public Cloud, API_KYE->the key you created
        3.  select region, organization and space
        4.  give a name `webapp-preview`
        5.  Paste following code in the script window
            ```bash
            #!/bin/bash
            #Push app
            if ! cf app "$CF_APP"; then  
                cf push "$CF_APP"
            else
                 OLD_CF_APP="${CF_APP}-OLD-$(date +"%s")"
                 rollback() {
                    set +e  
                    if cf app "$OLD_CF_APP"; then
                        cf logs "$CF_APP" --recent
                        cf delete "$CF_APP" -f
                        cf rename "$OLD_CF_APP" "$CF_APP"
                    fi
                    exit 1
                }
                set -e
                trap rollback ERR
                cf rename "$CF_APP" "$OLD_CF_APP"
                cf push "$CF_APP"
                cf delete "$OLD_CF_APP" -f
            fi

            # Export app name and URL for use in later Pipeline jobs
            export CF_APP_NAME="$CF_APP"
            export APP_URL=http://$(cf app $CF_APP_NAME | grep -e urls: -e routes: | awk '{print $2}')
            
            # View logs
            #cf logs "${CF_APP}" --recent

            EXIT=$?
            if [ $EXIT -eq 0 ]; then STATUS=pass; else STATUS=fail; fi;
            ```
    5.  Conifgure Deploy stage in similar maner.
    6.  Optionally attach tags to the newly created apps with following command.
        ```bash
        ibmcloud login --apikey $API_KEY --no-region
        ibmcloud resource tag-attach --tag-names $TAGS --resource-name "$CF_APP"
        ```
16.  Optionally add DevOps Insight and Slack integration.
17.  Start the pipeline and monitor app deployment through `view logs and history` links of eac stage.


# 2. Server API description

All operations must be authorised through AppID instance of IBM Cloud.

### Patient API:
|Operation|Description|
|---|---|
|GET /api/patients/list|List all patients in the databse|
|GET /api/patients/find?search=`patientEGN`&pagesize=`pagesize`&bookmark=`bookmark`&exact=`true\|false`|Finds all patients the DB whose EGN is greater or equal to `patientEGN`<br/> If `exact` equals true, only exact match is found. `pagesize` defines how many patients will be reaturned in each API call. The response will containt also `bookmark` which  allows to continue searching from the place previous search has finished.|
|GET /api/patients/delete?id=`id`|Deletes patient from the database togather will all associated exams for that patient. `id` is the document id of the record in the cloudant DB (currently it is same as patient EGN)|
|POST /api/patients/add| Adds or updates patient personal data. The `body` of the POST request must contain properly formatted Cloudant JSON document that passes following validations: <pre>body('firstname').not().isEmpty()<br/>body('secondname').not().isEmpty()<br/>body('lastname').not().isEmpty()<br/>body('egn').isNumeric({no_symbols: true})<br/>body('email').isEmail()<br/>body('telephone').isMobilePhone()</pre>


### Exam API:
|Operation|Description|
|---|---|
|GET /api/exams/list|List all axams in the databse|
|GET /api/exams/find?search=`patientEGN`&bookmark=`bookmark`|Finds the next exam associated with the supplied `patientEGN`. The response conatins a `bookmark` which  allows to continue searching from the place previous search has finished.|
|POST /api/exams/add| Adds new exam document in the databse. The `body` of the POST request must contain properly formatted Cloudant JSON document that passes following validations: <pre>body('patient.patientEGN').isNumeric({no_symbols: true})<br/>body('timestamp').not().isEmpty()<br/>body('examId').not().isEmpty()</pre>





## Next steps
Deploy to Code Engine.

## License

This sample application is licensed under the Apache License, Version 2. Separate third-party code objects invoked within this code pattern are licensed by their respective providers pursuant to their own separate licenses.

[Apache License FAQ](https://www.apache.org/foundation/license-faq.html#WhatDoesItMEAN)
