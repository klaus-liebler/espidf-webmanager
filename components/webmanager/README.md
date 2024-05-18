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

## Build

### When you use this library for the first time -> Preparation 
1. Make sure, there is a system environment variable IDF_PATH
1. install typescript globally call `npm install -g typescript`
2. install gulp-cli globally: call `npm install -g gulp-cli`
3. Open ESP_IDF Terminal (Press F1 and search for "Terminal")
4. In `components\webmanager\web` call `npm i` to install all javascript / typescript libraries
5. 2. In `components\webmanager\testserver` call `npm i` to install all javascript / typescript libraries
6. In `components\webmanager\builder` call `npm i` to install all javascript / typescript libraries

7. In `components\webmanager\builder` call `gulp rootCA` (creates a root certificate+private key rootCA.pem.crt+rootCA.pem.privkey in this directory)
8. Install rootCA certificate in Windows
  - right click on file rootCA.cert.crt
  - choose "Install Certificate"
  - choose Local Computer
  - Select "Alle Zertifikate in folgendem Speicher speichern"
  - Click "Durchsuchen"
  - Select "Vertrauenswürdige Stammzertifizierungsstellen"
  - Click "Next" or "Finish"
### When you start a new project that uses this library -> System Configuration
1. Edit `gulpfile_config.ts` ("hostname" is relevant for correct creation of host certificate for esp32)
2. Open Menuconfig in esp-idf and set:
     * Max HTTP Request Header Length ->1024
     * CONFIG_ESP_HTTPS_SERVER_ENABLE
     * CONFIG_HTTPD_WS_SUPPORT
     * Partition Table = Custom Partition Table
     * Flash Size >=8MB
     * Detect Flash Size when flashing bootloader
     * CONFIG_FREERTOS_TIMER_TASK_STACK_DEPTH=3584

### When you intend to flash to a new ESP32 microcontroller (with a specific mac adress)
1. In `components\webmanager\builder` call `gulp gethostname` (writes file certificates/esp32_hostname.txt with the hostname of esp32, that is derived from mac adress, template see "gulpfile_config.ts". This is done by reading the MAC address of the microcontroller attached via COM port)
2. In `components\webmanager\builder` call `gulp certificates` (creates HTTPS certificates for the ESP32 microcontroller and for the testserver on the loacl pc")
### When you want to define the available usersettings (Name, Type, default Value), that can be setup in webui
1. Edit `usersettings/usersettings.ts`
### When you want to build the project
1. In `components\webmanager\builder` call and call `gulp`
2. In `components\webmanager\web` and call `npm run dev`
3. Build esp-idf project

### When you want to flash the initial nvs partion values (usersettings) to the nvs partition
1. Precondition: Project including the custom partition table should have been flashed to the ESP32
1. In `components\webmanager\builder` call `gulp flashusersettings`. This (re)sets the nvs partition to contain an initial value for all usersettings (problem: it resets ALL value. Hence, when you already did some changes for example on the wifi password, these changes get lost)

## Deprecated
execute "gulp" in ESP_IDF console (that points to the right python environment)

Um Sensact in der WebUI zu aktivieren/deaktivieren:
- webui_logic/app.ts ->passend ein- und auskommentieren in der startup()-Methode
- builder/gulpfile_config.ts ->OPTION_SENSACT o.ä passend setzen
- flatbuffers/app.fbs -> includes passen ein- und auskommentieren und im "union Message" ebenfalls passend ein- und auskommentieren
- Hinweis: Keine Veränderungen im HTML/SCSS-Bereich - dort bleibt derzeit immer alles "drin"

