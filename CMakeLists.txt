# For more information about build system see
# https://docs.espressif.com/projects/esp-idf/en/latest/api-guides/build-system.html
# The following five lines of boilerplate have to be in your project's
# CMakeLists in this exact order for cmake to work correctly
cmake_minimum_required(VERSION 3.5)
set(EXTRA_COMPONENT_DIRS "C:/repos/espidf-components/common" "C:/repos/espidf-components/flatbuffers-23.5.26" "C:/repos/espidf-components/errorcodes" "C:/repos/espidf-components/ringtones")
include($ENV{IDF_PATH}/tools/cmake/project.cmake)
project(espidf-webmanager)