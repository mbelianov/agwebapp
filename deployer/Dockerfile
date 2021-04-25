FROM ubuntu:latest
RUN apt-get update && apt-get install curl -y && curl -fsSL https://clis.cloud.ibm.com/install/linux | sh
RUN ibmcloud plugin install container-registry && ibmcloud plugin install code-engine
