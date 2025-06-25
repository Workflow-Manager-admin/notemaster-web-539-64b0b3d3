#!/bin/bash
cd /home/kavia/workspace/code-generation/notemaster-web-539-64b0b3d3/notes_app_frontend_workspace/notes_app_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

