FROM node:20-alpine

RUN apk add --no-cache jq bash busybox-suid
RUN npm install -g mailgoat

WORKDIR /opt/agent
COPY agent.sh entrypoint.sh ./
RUN chmod +x /opt/agent/agent.sh /opt/agent/entrypoint.sh

VOLUME ["/data"]
ENTRYPOINT ["/opt/agent/entrypoint.sh"]
