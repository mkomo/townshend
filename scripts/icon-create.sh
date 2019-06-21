#!/bin/bash

USAGE="USAGE: $0 raw_images/A_S_icon-raw.png raw_images/A_L_icon-raw.png src/assets/icons/"

RAW_SMALL=$1
RAW_LARGE=$2
ICON_DIR=$3

if [ -z "$ICON_DIR" ]
then
	echo "$USAGE"
	exit 1
fi

convert $RAW_SMALL -define icon:auto-resize=64,48,32,16 $ICON_DIR/favicon.ico
convert $RAW_SMALL -resize 16x16 $ICON_DIR/favicon-16x16.png
convert $RAW_SMALL -resize 32x32 $ICON_DIR/favicon-32x32.png
convert $RAW_LARGE -resize 180x180 $ICON_DIR/apple-touch-icon.png
convert $RAW_LARGE -resize 192x192 $ICON_DIR/android-chrome-192x192.png
convert $RAW_LARGE -resize 512x512 $ICON_DIR/android-chrome-512x512.png
convert $RAW_LARGE -resize 150x150 $ICON_DIR/mstile-150x150.png

exiftool -all= -r -overwrite_original -ext png $ICON_DIR/
