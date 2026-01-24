#!/bin/bash
cd "c:\Users\kuers\Documents\Design Academy\Year4\Graduation\alone\designwikigrad"
git add netlify/functions/save-page.js
git commit -m "Add token checking and GitHub write error handling with detailed logging"
git push origin main
echo "Push completed"
