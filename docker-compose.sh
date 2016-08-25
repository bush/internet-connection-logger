#!/bin/bash
npm install --production --unsafe-perm && npm cache clean
docker-compose up -d
