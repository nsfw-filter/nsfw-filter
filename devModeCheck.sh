DEBUG="$(cat src/utils/debug.ts | grep "DEBUG =" | cut -d "=" -f2 | cut -c 2-)"

if [ "$DEBUG" != "false" ]; then
   echo "DEBUG should be false in utils.ts" && exit 1
fi
