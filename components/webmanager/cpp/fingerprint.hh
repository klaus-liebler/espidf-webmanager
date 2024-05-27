#pragma once
#include <cstdint>
#include <cstdlib>
#include <cstddef>
#include <cstring>
#include <cstdio>
#include <memory>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "nvs_flash.h"
#include "nvs.h"
#include "sdkconfig.h"
#include "fingerprint_hardware.hh"
#include "fingerprint_timer.hh"
#include <common.hh>

#define TAG "FINGER"
#include "esp_log.h"
namespace FINGERPRINT
{

    class M : public R503Pro, public iFingerprintHandler
    {
    private:
        iFingerprintActionHandler *handler;
        nvs_handle_t nvsFingerName2FingerIndex;
        nvs_handle_t nvsFingerIndex2Timetable;
        nvs_handle_t nvsFingerIndex2Action;
        SemaphoreHandle_t mutex;

    public:
        M(uart_port_t uart_num, gpio_num_t gpio_irq, iFingerprintActionHandler *handler, nvs_handle_t nvsFingerName2FingerIndex, nvs_handle_t nvsFingerIndex2Timetable, nvs_handle_t nvsFingerIndex2Action, uint32_t targetAddress = DEFAULT_ADDRESS) : R503Pro(uart_num, gpio_irq, this), handler(handler), nvsFingerName2FingerIndex(nvsFingerName2FingerIndex), nvsFingerIndex2Timetable(nvsFingerIndex2Timetable), nvsFingerIndex2Action(nvsFingerIndex2Action) {}

        void HandleFingerprintDetected(uint8_t errorCode, uint16_t fingerIndex, uint16_t score)
        {
            
            if (handler)
                handler->HandleFingerprintDetected(errorCode, fingerIndex, score);
            if (errorCode != 0)
                return;
            
            char fingerIndexAsString[6];
            snprintf(fingerIndexAsString, 6, "%d", fingerIndex);
            uint16_t actionIndex{0};
            uint16_t timetableIndex{0};
            if (handler)
            {
                nvs_get_u16(this->nvsFingerIndex2Action, fingerIndexAsString, &actionIndex);
                nvs_get_u16(this->nvsFingerIndex2Timetable, fingerIndexAsString, &timetableIndex);
                ESP_LOGI(TAG, "Fingerprint detected successfully: fingerIndex=%d, timetableIndex=%d actionIndex=%d", fingerIndex, timetableIndex, actionIndex);
                if (timetableIndex >= TIMER.size()){
                    ESP_LOGW(TAG, "timetableIndex out of range");
                    return;
                }
                if (TIMER[timetableIndex]->IsActive()){
                    handler->HandleFingerprintAction(fingerIndex, actionIndex);
                }
            }
        }
        void HandleEnrollmentUpdate(uint8_t errorCode, uint8_t step, uint16_t fingerIndex, const char *fingerName) override
        {
            ESP_LOGI(TAG, "'%s'", enrollStep2description[step]);
            if (step == 0x0F)
            {
                esp_err_t err{ESP_OK};
                char fingerIndexAsString[6];
                snprintf(fingerIndexAsString, 6, "%d", fingerIndex);

                ESP_ERROR_CHECK(nvs_set_u16(this->nvsFingerName2FingerIndex, fingerName, fingerIndex));
                ESP_ERROR_CHECK(nvs_commit(this->nvsFingerName2FingerIndex));
                ESP_ERROR_CHECK(nvs_set_u16(this->nvsFingerIndex2Action, fingerIndexAsString, 0));
                ESP_ERROR_CHECK(nvs_commit(this->nvsFingerIndex2Action));
                ESP_ERROR_CHECK(nvs_set_u16(this->nvsFingerIndex2Timetable, fingerIndexAsString, 0));
                ESP_ERROR_CHECK(nvs_commit(this->nvsFingerIndex2Timetable));

                if (err != ESP_OK)
                {
                    ESP_LOGE(TAG, "Finger with index %d could not be stored in nvs with key %s. Error code %d", fingerIndex, fingerName, err);
                }
                else
                {
                    ESP_LOGI(TAG, "'%s', Finger is stored in index %d", enrollStep2description[step], fingerIndex);
                }
            }
            if (handler)
                handler->HandleEnrollmentUpdate(errorCode, step, fingerIndex, fingerName);
        }

        RET begin(gpio_num_t tx_host, gpio_num_t rx_host)
        {
            mutex = xSemaphoreCreateMutex();
            return R503Pro::begin(tx_host, rx_host);
        }

        RET TryEnrollAndStore(const char *fingerName)
        {
            ESP_LOGI(TAG, "TryEnrollAndStore name=%s", fingerName);
            uint16_t fingerIndex{0};
            if (!fingerName)
            {
                return RET::xNAME_IS_NULL;
            }
            if (std::strlen(fingerName) > MAX_FINGERNAME_LEN)
            {
                ESP_LOGE(TAG, "name is too long");
                return RET::xNVS_NAME_TOO_LONG;
            }

            if (nvs_get_u16(this->nvsFingerName2FingerIndex, fingerName, &fingerIndex) != ESP_ERR_NVS_NOT_FOUND)
            {
                ESP_LOGE(TAG, "Finger with name '%s' already exists", fingerName);
                return RET::xNVS_NAME_ALREADY_EXISTS;
            }

            std::strncpy(this->fingerName, fingerName, MAX_FINGERNAME_LEN);

            if (!xSemaphoreTake(mutex, pdMS_TO_TICKS(3000)))
            {
                ESP_LOGE(TAG, "Cannot take mutex in enrollment after 3000ms");
                return RET::xCANNOT_GET_MUTEX;
            }
            fingerIndex = 0x05DC;
            RET ret = AutoEnroll(fingerIndex, false, true, true, true);
            if (ret != RET::OK)
            {
                ESP_LOGE(TAG, "Error %d while calling AutoEnroll.", (int)ret);
                // Important: do not return here, because mutex will not be given back
            }

            xSemaphoreGive(mutex);
            return ret;
        }

        RET TryRename(const char *oldName, const char *newName)
        {
            if (!nvsFingerName2FingerIndex)
                return RET::xNVS_NOT_AVAILABLE;
            uint16_t fingerIndex{0};
            if (nvs_get_u16(this->nvsFingerName2FingerIndex, newName, &fingerIndex) != ESP_ERR_NVS_NOT_FOUND)
            {
                return RET::xNVS_NAME_ALREADY_EXISTS;
            }
            if (nvs_get_u16(this->nvsFingerName2FingerIndex, oldName, &fingerIndex) != ESP_OK)
            {
                return RET::xNVS_NAME_UNKNOWN;
            }

            char fingerIndexAsString[6];
            snprintf(fingerIndexAsString, 6, "%d", fingerIndex);

            nvs_erase_key(this->nvsFingerName2FingerIndex, oldName);
            RETURN_ERRORCODE_ON_ERROR(nvs_set_u16(this->nvsFingerName2FingerIndex, newName, fingerIndex), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerName2FingerIndex), RET::xNVS_NOT_AVAILABLE);

            // other nvs namespaces need no renaming as they work with indices rather than names
            return RET::OK;
        }

        RET TryDelete(const char *name)
        {
            if (!nvsFingerName2FingerIndex)
                return RET::xNVS_NOT_AVAILABLE;
            uint16_t fingerIndex{0};
            RETURN_ERRORCODE_ON_ERROR(nvs_get_u16(this->nvsFingerName2FingerIndex, name, &fingerIndex), RET::xNVS_NAME_UNKNOWN);
            RET ret = DeleteChar(fingerIndex);
            if (ret != RET::OK)
            {
                ESP_LOGE(TAG, "Error %d while calling TryDelete.", (int)ret);
                return ret;
            }

            RETURN_ERRORCODE_ON_ERROR(nvs_erase_key(this->nvsFingerName2FingerIndex, name), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerName2FingerIndex), RET::xNVS_NOT_AVAILABLE);

            char fingerIndexAsString[6];
            snprintf(fingerIndexAsString, 6, "%d", fingerIndex);

            nvs_erase_key(this->nvsFingerIndex2Action, fingerIndexAsString);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Action), RET::xNVS_NOT_AVAILABLE);

            nvs_erase_key(this->nvsFingerIndex2Timetable, fingerIndexAsString);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Timetable), RET::xNVS_NOT_AVAILABLE);
            return RET::OK;
        }

        RET TryDeleteAll()
        {
            if (!nvsFingerName2FingerIndex)
                return RET::xNVS_NOT_AVAILABLE;
            RET ret = EmptyLibrary();
            if (ret != RET::OK)
            {
                ESP_LOGE(TAG, "Error %d (hradware) while calling TryDeleteAll.", (int)ret);
                return ret;
            }
            RETURN_ERRORCODE_ON_ERROR(nvs_erase_all(this->nvsFingerName2FingerIndex), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerName2FingerIndex), RET::xNVS_NOT_AVAILABLE);

            RETURN_ERRORCODE_ON_ERROR(nvs_erase_all(this->nvsFingerIndex2Action), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Action), RET::xNVS_NOT_AVAILABLE);

            RETURN_ERRORCODE_ON_ERROR(nvs_erase_all(this->nvsFingerIndex2Timetable), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Timetable), RET::xNVS_NOT_AVAILABLE);
            ESP_LOGI(TAG, "Successfully deleted all Fingerprints on the sensor hardware and in flash");
            return RET::OK;
        }

        RET TryStoreFingerAction(uint16_t fingerIndex, uint16_t actionIndex)
        {
            char fingerIndexAsString[6];
            snprintf(fingerIndexAsString, 6, "%d", fingerIndex);
            RETURN_ERRORCODE_ON_ERROR(nvs_set_u16(this->nvsFingerIndex2Action, fingerIndexAsString, actionIndex), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Action), RET::xNVS_NOT_AVAILABLE);
            ESP_LOGI(TAG, "Successfully stored finger action. index=%d action=%d", fingerIndex, actionIndex);
            return RET::OK;
        }

        RET TryStoreFingerTimetable(uint16_t fingerIndex, uint16_t timetableIndex)
        {
            char fingerIndexAsString[6];
            snprintf(fingerIndexAsString, 6, "%d", fingerIndex);
            RETURN_ERRORCODE_ON_ERROR(nvs_set_u16(this->nvsFingerIndex2Timetable, fingerIndexAsString, timetableIndex), RET::xNVS_NOT_AVAILABLE);
            RETURN_ERRORCODE_ON_ERROR(nvs_commit(this->nvsFingerIndex2Timetable), RET::xNVS_NOT_AVAILABLE);
            ESP_LOGI(TAG, "Successfully stored finger timetable. index=%d timetable=%d", fingerIndex, timetableIndex);
            return RET::OK;
        }
    };

}
#undef TAG