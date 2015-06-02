#!/bin/bash

NAME="C172"

cd "/Users/srk/Dropbox/SRK/Aviation/Performance WebApp/${NAME}/PhoneGap/"

FILES="\
	${NAME}.manifest\
	${NAME}.js\
	${NAME}Data.js\
	common/common.js\
	common/io.js\
	common/util.js\
	common/airportData.js\
	common/runwayData.js\
	common/keypad.js\
	common/thumbwheel.js\
	common/vernierslider.js\
	common/json2.js\
	common/desktop.css\
	common/small.css\
	common/iPadP.css\
	common/keypad.css\
	common/thumbwheel.css\
	common/vernierslider.css\
	common/img/chevron-right-grey.png\
	common/img/chevron-left-white.png\
	common/img/dropdown.png\
	common/img/sync.png\
	img/${NAME}-top-view.png\
	img/${NAME}-icon-app-android-hdpi.png\
	img/${NAME}-icon-app-android-ldpi.png\
	img/${NAME}-icon-app-android-mdpi.png\
	img/${NAME}-icon-app-android-xhdpi.png\
	img/${NAME}-icon-app-ios-57.png\
	img/${NAME}-icon-app-ios-72.png\
	img/${NAME}-icon-app-ios-76.png\
	img/${NAME}-icon-app-ios-114.png\
	img/${NAME}-icon-app-ios-120.png\
	img/${NAME}-icon-app-ios-144.png\
	img/${NAME}-icon-app-ios-152.png\
	img/${NAME}-icon-webapp-76-precomposed.png\
	img/${NAME}-icon-webapp-120-precomposed.png\
	img/${NAME}-icon-webapp-152-precomposed.png\
	img/${NAME}-splash-android-land-hdpi.png\
	img/${NAME}-splash-android-land-ldpi.png\
	img/${NAME}-splash-android-land-mdpi.png\
	img/${NAME}-splash-android-land-xhdpi.png\
	img/${NAME}-splash-android-port-hdpi.png\
	img/${NAME}-splash-android-port-ldpi.png\
	img/${NAME}-splash-android-port-mdpi.png\
	img/${NAME}-splash-android-port-xhdpi.png\
	img/${NAME}-splash-ipad-land.png\
	img/${NAME}-splash-ipad-port.png\
	img/${NAME}-splash-ipad-port-2x.png\
	img/${NAME}-splash-ipad-land-2x.png\
	img/${NAME}-splash-iphone-port.png\
	img/${NAME}-splash-iphone-port-2x.png\
	img/${NAME}-splash-iphone5-port.png\
"

VERSION=`sed -nE '/<widget/,/>/s/.*version\s*=\s*(.*)/\1/p' config.xml | sed s/\"//g | sed 's/\./_/g' | tr -d '\n\r'`
ZIPDIR=${NAME}
FILEBASE=${NAME}_${VERSION}
ZIPFILE=${FILEBASE}.zip
INDEXFILE=${NAME}.htm

rm -f $ZIPFILE
rm -rf $ZIPDIR
rm -f ${FILEBASE}.apk ${FILEBASE}.ipa

mkdir -p $ZIPDIR
mkdir -p $ZIPDIR/img
mkdir -p $ZIPDIR/common
mkdir -p $ZIPDIR/common/img

cp -p ../$INDEXFILE $ZIPDIR/index.html
cp -p config.xml $ZIPDIR

for f in $FILES
do
	cp -p ../$f $ZIPDIR/$f
done

if [ -f img/icon.png ]; then
	cp img/icon.png $ZIPDIR/icon.png;
fi

cd $ZIPDIR
zip -r ../$ZIPFILE *
cd ..
rm -r $ZIPDIR