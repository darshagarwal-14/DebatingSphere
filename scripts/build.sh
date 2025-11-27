#!/bin/bash
# Build script
cd frontend && npm run build
cd ../backend && npm run build  # If needed
