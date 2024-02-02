# WebManager for ESP IDF

## Features (End User Perspective)
* Wifi Manager
* Timeseries with smart storage in flash
* Configuration / User Settings Manager
* Secure Connection
* Live Log
* Stored Journal
* Integrates with my home automation solution "sensact"

## Features (Library User)

* Gulp-based build process
* Web Application is <30k thanks to severe uglifying and brotly compressing
* To Do before Build
  * Connect a ESP32 board ( an individual MAC adress)
  * File builder/gulpfile_config.ts --> adjust paths and ports and names
  * File usersettings/usersettings.ts --> define all settings, that you need in your application
  * File webui_htmlscss/*.scss --> change styles
  * File webui_htmlscss/app.html --> add/delete further screens in the nav-Element and as main element
  * Optional: Project Description Files from my Home Automation Project "Sensact". If you do not need it, check File webui_htmlscss/app.html --> Delete the nav-Element. And delete appropriate main Element. Delete the ScreenController call in webui_logic/app.ts -->Init function
* What happens then
  * Node gets MAC-Adress from ESP32 Chip and builds cetificates for HTTPS

## Features (Developer Perspective)
* Complex Build Process demystified
* HTML Full Screen UI using the (relatively new) techniques "grid", "template", "dialog"