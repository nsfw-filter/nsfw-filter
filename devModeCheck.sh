DEBUG="$(cat src/utils.js | grep "DEBUG =" | cut -d "=" -f2 | cut -c 2-)"

if [ "$DEBUG" = "true" ]; then
   echo "DEBUG should be false in utils.js" && exit 1
fi
