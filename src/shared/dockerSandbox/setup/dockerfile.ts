export const createDockerfileContent = (plugin: string): string => `
FROM docker/sandbox-templates:claude-code

ARG CLAUDE_CODE_USE_BEDROCK=""
ARG AWS_REGION="us-east-1"
ARG AWS_PROFILE=""
ARG ANTHROPIC_MODEL=""
ARG DS_DIR=""

ENV CLAUDE_CODE_USE_BEDROCK=\${CLAUDE_CODE_USE_BEDROCK}
ENV AWS_REGION=\${AWS_REGION}
ENV AWS_PROFILE=\${AWS_PROFILE}
ENV ANTHROPIC_MODEL=\${ANTHROPIC_MODEL}
ENV DS_DIR=\${DS_DIR}

COPY --chown=agent:agent .aws /home/agent/.aws
RUN chmod 555 /home/agent/.aws && chmod 444 /home/agent/.aws/*

COPY --chown=agent:agent ${plugin}/ /home/agent/.claude/

WORKDIR /workspace
`
