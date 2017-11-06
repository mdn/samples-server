GIT_COMMIT ?= HEAD
VERSION ?= $(shell git rev-parse --short ${GIT_COMMIT})
REGISTRY ?= quay.io/
IMAGE_PREFIX ?= mozmar
NGINX_IMAGE_NAME ?= mdn-samples-nginx
NGINX_IMAGE ?= ${REGISTRY}${IMAGE_PREFIX}/${NGINX_IMAGE_NAME}\:${VERSION}
WEBRTC_IMAGE_NAME ?= mdn-samples-webrtc
WEBRTC_IMAGE ?= ${REGISTRY}${IMAGE_PREFIX}/${WEBRTC_IMAGE_NAME}\:${VERSION}
WEBSOCKET_IMAGE_NAME ?= mdn-samples-websocket
WEBSOCKET_IMAGE ?= ${REGISTRY}${IMAGE_PREFIX}/${WEBSOCKET_IMAGE_NAME}\:${VERSION}

build:
	docker build -t ${NGINX_IMAGE} .
	cd s/webrtc-from-chat && docker build -t ${WEBRTC_IMAGE} .
	cd s/websocket-chat && docker build -t ${WEBSOCKET_IMAGE} .

push:
	docker push ${NGINX_IMAGE}
	docker push ${WEBRTC_IMAGE}
	docker push ${WEBSOCKET_IMAGE}
