//LCD-Display einbinden
//NVS-Storage Failsafe
#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"

#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_log.h"
#include <string.h>
#include "driver/gpio.h"
#include <common-esp32.hh>
#include <mdns.h>
#ifndef CONFIG_ESP_HTTPS_SERVER_ENABLE
    #error "Enable HTTPS_SERVER in menuconfig"
#endif
#include <esp_https_server.h>
#include <esp_tls.h>
#include <webmanager.hh> //include esp_https_server before!!!
#include <timeseries.hh>
#include <scheduler.hh>
#include <fingerprint.hh>
#include <canmonitor.hh>
#include <interfaces.hh>
#include "led_manager.hh"
#include <buzzer.hh>

#include <spilcd16.hh>
#include <lineWriterToSpiLcdAdapter.hh>
#include "FullTextLineRenderer.hh"
#include "simple_menu.hh"
#include "single_button.hh"
#include <lcd_font.hh>
#include <RGB565.hh>

#include <ds18b20.hh>

using namespace spilcd16;
using namespace menu;
using namespace display;

#define TAG "MAIN"
#define NVS_FINGER_PARTITION NVS_DEFAULT_PART_NAME
#define NVS_FINGER_NAME_2_FINGER_INDEX_NAMESPACE "finger"
#define NVS_FINGER_INDEX_2_ACTION_INDEX_NAMESPACE "finger_act"
#define NVS_FINGER_INDEX_2_SCHEDULER_NAME_NAMESPACE "finger_sched"
#define NVS_SCHEDULER_NAMESPACE "scheduler"
constexpr gpio_num_t PIN_FINGER_TX_HOST{GPIO_NUM_40};
constexpr gpio_num_t PIN_FINGER_RX_HOST{GPIO_NUM_38};
constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_39};
constexpr gpio_num_t PIN_BUZZER{GPIO_NUM_6};
constexpr gpio_num_t PIN_MOTOR{GPIO_NUM_42};
constexpr gpio_num_t PIN_LED{GPIO_NUM_2};
constexpr gpio_num_t PIN_I2C_SCL{GPIO_NUM_4};
constexpr gpio_num_t PIN_I2C_SDA{GPIO_NUM_5};
constexpr gpio_num_t PIN_CAN_TX{GPIO_NUM_11};
constexpr gpio_num_t PIN_CAN_RX{GPIO_NUM_10};

constexpr gpio_num_t PIN_LCD_CS{GPIO_NUM_12};
constexpr gpio_num_t PIN_LCD_RS{GPIO_NUM_13};
constexpr gpio_num_t PIN_LCD_SCLK{GPIO_NUM_14};
constexpr gpio_num_t PIN_LCD_MOSI{GPIO_NUM_21};
constexpr gpio_num_t PIN_LCD_BACKLIGHT{GPIO_NUM_45};

constexpr gpio_num_t PIN_BUTTON{GPIO_NUM_0};
constexpr gpio_num_t PIN_ONEWIRE{GPIO_NUM_41};

#include "handler_and_menu_definition.inc"

FINGERPRINT::M *fpm{nullptr};
SCHEDULER::Scheduler *sched{nullptr};
CANMONITOR::M *canmonitor{nullptr};
BUZZER::M *buzzer{nullptr};
LED::M *led{nullptr};

OneWire::OneWireBus<PIN_ONEWIRE> *onewireBus{nullptr};
menu::MenuManagement *menuManagement{nullptr};
display::iBacklight* backlightActivator;
#if 0
constexpr gpio_num_t PIN_FINGER_TX{GPIO_NUM_32};
constexpr gpio_num_t PIN_485DE{GPIO_NUM_33};
constexpr gpio_num_t PIN_BUZZER{GPIO_NUM_12};
constexpr gpio_num_t PIN_IO13{GPIO_NUM_13};
constexpr gpio_num_t PIN_I2C_SCL{GPIO_NUM_14};
constexpr gpio_num_t PIN_FINGER_ON{GPIO_NUM_15};
//constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_35};
constexpr gpio_num_t PIN_485RO{GPIO_NUM_36};
constexpr gpio_num_t PIN_FINGER_RX{GPIO_NUM_39};

constexpr gpio_num_t PIN_MOTOR{GPIO_NUM_2};
//constexpr gpio_num_t PIN_G4_PU{GPIO_NUM_4};
constexpr gpio_num_t PIN_CAN_TX{GPIO_NUM_5};
constexpr gpio_num_t PIN_G16{GPIO_NUM_16};
constexpr gpio_num_t PIN_CAN_RX{GPIO_NUM_18};
//constexpr gpio_num_t PIN_G19{GPIO_NUM_19};
constexpr gpio_num_t PIN_IO21{GPIO_NUM_21};
constexpr gpio_num_t PIN_LED{GPIO_NUM_22};
constexpr gpio_num_t PIN_IO23{GPIO_NUM_23};
constexpr gpio_num_t PIN_485DI{GPIO_NUM_25};
constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_26};
//constexpr gpio_num_t PIN_IO26{GPIO_NUM_26};
constexpr gpio_num_t PIN_I2C_SDA{GPIO_NUM_27};
#endif






constexpr twai_timing_config_t t_config = TWAI_TIMING_CONFIG_125KBITS();
twai_general_config_t g_config = TWAI_GENERAL_CONFIG_DEFAULT(PIN_CAN_TX, PIN_CAN_RX, TWAI_MODE_NORMAL);

LED::BlinkPattern SLOW(200, 1000);
LED::BlinkPattern FAST(200, 200);
LED::BlinkPattern STANDBY(200, 10000);

class Webmanager2Fingerprint2Hardware : public iMessageReceiver, public FINGERPRINT::iFingerprintActionHandler, public CANMONITOR::iCanmonitorHandler
{
private:
    MessageSender *callback{nullptr};

    nvs_handle_t nvsFingerName2FingerIndex;
    nvs_handle_t nvsFingerIndex2SchedulerName;
    nvs_handle_t nvsFingerIndex2ActionIndex;
    time_t fingerDetected{-1000000};
    static void static_task(void *args) { static_cast<Webmanager2Fingerprint2Hardware *>(args)->task(); }
    void task()
    {
        ESP_LOGI(TAG, "Central Management Task 'Webmanager2Fingerprint2Hardware' running");
        //buzzer->PlaySong(BUZZER::RINGTONE_SONG::POSITIVE);
        auto wman = webmanager::M::GetSingleton();
        webmanager::WifiStationState staState{webmanager::WifiStationState::NO_CONNECTION};
        while (true)
        {
            time_t now = millis();
            bool energizeMotor = (now - fingerDetected) < 1000;
            gpio_set_level(PIN_MOTOR, energizeMotor);
            buzzer->Loop();
            button::ButtonPressResult res = button::ButtonLoop(menuManagement, PIN_BUTTON);
            if(res!=button::ButtonPressResult::NO_CHANGE){
                backlightActivator->Interaction(4000);
            }
            webmanager::WifiStationState newStaState=wman->GetStaState();
            if(newStaState!=webmanager::WifiStationState::CONNECTED && newStaState!=staState){
                led->AnimatePixel(&FAST);
            }else if(newStaState==webmanager::WifiStationState::CONNECTED && newStaState!=staState){
                led->AnimatePixel(&SLOW, 5000);
            }
            led->Refresh();
            backlightActivator->BacklightLoop();
            onewireBus->SensorLoop();
            staState=newStaState;
            delayMs(30);
        }
    }

public:
    Webmanager2Fingerprint2Hardware(nvs_handle_t nvsFingerName2FingerIndex, nvs_handle_t nvsFingerIndex2SchedulerName, nvs_handle_t nvsFingerIndex2ActionIndex) : nvsFingerName2FingerIndex(nvsFingerName2FingerIndex), nvsFingerIndex2SchedulerName(nvsFingerIndex2SchedulerName),nvsFingerIndex2ActionIndex(nvsFingerIndex2ActionIndex)  {}

    void Begin()
    {
        gpio_set_level(PIN_MOTOR, 0);
        gpio_set_direction(PIN_MOTOR, GPIO_MODE_OUTPUT);
        xTaskCreate(static_task, "wm2fp2hw", 4096, this, 10, nullptr);
    }

    void HandleCanMessageReceived(uint32_t messageId, uint8_t data[8], size_t dataLen) override
    {
        if (callback)
        {
            flatbuffers::FlatBufferBuilder b(256);
            uint8_t vs[] = {data[0], data[1], data[2], data[3], data[4], data[5], data[6], data[7]};
            webmanager::CanData canData{vs};
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyCanMessage,
                                                webmanager::CreateNotifyCanMessage(b, messageId, &canData, dataLen).Union());
        }
    }

    void HandleFingerprintDetected(uint8_t errorCode, uint16_t finger, uint16_t score) override
    {
        if (callback)
        {
            flatbuffers::FlatBufferBuilder b(256);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyFingerDetected,
                                                webmanager::CreateNotifyFingerDetected(b, errorCode, finger, score).Union());
        }
        if (errorCode == (uint8_t)FINGERPRINT::RET::OK)
        {
            
            ESP_LOGI(TAG, "Fingerprint detected successfully: fingerIndex=%d", finger);
            //buzzer->PlaySong(BUZZER::RINGTONE_SONG::POSITIVE);
        }
        else if(errorCode == (uint8_t)FINGERPRINT::RET::FINGER_NOT_FOUND){
            ESP_LOGW(TAG, "Unknown finger!");
            //buzzer->PlaySong(BUZZER::RINGTONE_SONG::NEGATIV);
        }
    }
    
    void HandleFingerprintAction(uint16_t fingerIndex, int action) override
    {
        
        switch (action)
        {
        case 0:
            ESP_LOGI(TAG, "Fingerprint action %d 'Open Door'", action);
            this->fingerDetected = millis();
            break;
        case 4:
            ESP_LOGI(TAG, "Fingerprint action %d 'Play song'", action);
            buzzer->PlaySong(BUZZER::RINGTONE_SONG::MISSIONIMP);
            break;
        
        default:
            ESP_LOGI(TAG, "Fingerprint action %d '?'", action);
            break;
        }        
    }
    
    void HandleEnrollmentUpdate(uint8_t errorCode, uint8_t step, uint16_t fingerIndex, const char *name) override
    {
        if (callback)
        {
            flatbuffers::FlatBufferBuilder b(256);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyEnrollNewFinger,
                                                webmanager::CreateNotifyEnrollNewFingerDirect(b, name, fingerIndex, step, errorCode).Union());
        }
    }

    eMessageReceiverResult provideWebsocketMessage(MessageSender *callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw) override
    {
        this->callback = callback;
        flatbuffers::FlatBufferBuilder b(1024);
        switch (mw->request_type())
        {
        case webmanager::Requests::Requests_RequestEnrollNewFinger:
        {
            const char *name = mw->request_as_RequestEnrollNewFinger()->name()->c_str();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseEnrollNewFinger,
                                                       webmanager::CreateResponseEnrollNewFinger(b, (uint16_t)fpm->TryEnrollAndStore(name)).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestDeleteAllFingers:
        {
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteAllFingers,
                                                       webmanager::CreateResponseDeleteAllFingers(b, (uint16_t)fpm->TryDeleteAll()).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestDeleteFinger:
        {
            const char *name = mw->request_as_RequestDeleteFinger()->name()->c_str();

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteFinger,
                                                       webmanager::CreateResponseDeleteFingerDirect(b, (uint16_t)fpm->TryDelete(name), name).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestCancelInstruction:
        {
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseCancelInstruction,
                                                       webmanager::CreateResponseCancelInstruction(b, (uint16_t)fpm->CancelInstruction()).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestRenameFinger:
        {
            const char *oldName = mw->request_as_RequestRenameFinger()->old_name()->c_str();
            const char *newName = mw->request_as_RequestRenameFinger()->new_name()->c_str();

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseRenameFinger,
                                                       webmanager::CreateResponseRenameFinger(b, (uint16_t)fpm->TryRename(oldName, newName)).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
            break;
        }
        case webmanager::Requests_RequestFingerprintSensorInfo:
        {
            auto p = fpm->GetAllParams();
            
            webmanager::Uint8x32 usedIndices(p->libraryIndicesUsed);
            
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingerprintSensorInfo,
                                                       webmanager::CreateResponseFingerprintSensorInfoDirect(b,
                                                                                                             p->status,
                                                                                                             p->librarySizeMax,
                                                                                                             p->librarySizeUsed,
                                                                                                             &usedIndices,
                                                                                                             p->securityLevel,
                                                                                                             p->deviceAddress,
                                                                                                             p->dataPacketSizeCode,
                                                                                                             p->baudRateTimes9600,
                                                                                                             p->algVer, p->fwVer)
                                                           .Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
            break;
        }
        case webmanager::Requests::Requests_RequestStoreFingerAction:
        {
            fpm->TryStoreFingerAction(mw->request_as_RequestStoreFingerAction()->fingerIndex(), mw->request_as_RequestStoreFingerAction()->actionIndex());
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseStoreFingerAction,
                                                       webmanager::CreateResponseStoreFingerAction(b).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        case webmanager::Requests::Requests_RequestStoreFingerSchedule:
        {
            fpm->TryStoreFingerScheduler(mw->request_as_RequestStoreFingerSchedule()->fingerIndex(), mw->request_as_RequestStoreFingerSchedule()->scheduleName()->c_str());
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseStoreFingerSchedule,
                                                       webmanager::CreateResponseStoreFingerSchedule(b).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestFingers:
        {
            std::vector<flatbuffers::Offset<flatbuffers::String>> scheduleNames;
            sched->FillFlatbufferWithAvailableNames(b, scheduleNames);
            
            std::vector<flatbuffers::Offset<webmanager::Finger>> fingers_vector;
            
            nvs_iterator_t it{nullptr};
            esp_err_t res = nvs_entry_find(NVS_FINGER_PARTITION, NVS_FINGER_NAME_2_FINGER_INDEX_NAMESPACE, NVS_TYPE_U16, &it);
            while (res == ESP_OK)
            {
                nvs_entry_info_t info;
                nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL
                uint16_t fingerIndex;
                ESP_ERROR_CHECK(nvs_get_u16(nvsFingerName2FingerIndex, info.key, &fingerIndex));
                char fingerIndexAsString[6];
                snprintf(fingerIndexAsString, 6, "%d", fingerIndex);

                uint16_t actionIndex=0;
                if(nvs_get_u16(nvsFingerIndex2ActionIndex, fingerIndexAsString, &actionIndex)!=ESP_OK){
                    ESP_LOGW(TAG, "Problem while fetching actionIndex for fingerIndex %s (%s). Assuming action 0", fingerIndexAsString, info.key);
                    actionIndex=0;
                }
                
                size_t scheduleNameLen{0};
                nvs_get_str(nvsFingerIndex2SchedulerName, fingerIndexAsString, nullptr, &scheduleNameLen);
                char scheduleName[scheduleNameLen];//scheduleNameLen+1 is NOT necessary!
                auto err = nvs_get_str(nvsFingerIndex2SchedulerName, fingerIndexAsString, scheduleName, &scheduleNameLen);
                if(err!=ESP_OK){
                    ESP_LOGW(TAG, "Problem while fetching scheduleName for fingerIndex %s (%s). Error=%s. Assuming empty string.", fingerIndexAsString, info.key, esp_err_to_name(err));
                    scheduleName[0]=0;
                }
                fingers_vector.push_back(webmanager::CreateFingerDirect(b, info.key, fingerIndex, scheduleName, actionIndex));
                res = nvs_entry_next(&it);
            }
            nvs_release_iterator(it);
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingers,
                                                       webmanager::CreateResponseFingersDirect(b, &scheduleNames, &fingers_vector).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        case webmanager::Requests::Requests_RequestOpenDoor:
        {
            this->fingerDetected = millis();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseOpenDoor,
                                                       webmanager::CreateResponseOpenDoor(b).Union())==ESP_OK?eMessageReceiverResult::OK:eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        
        default:
            break;
        }
       return eMessageReceiverResult::NOT_FOR_ME;
    }
};

extern "C" void app_main(void)
{
    esp_err_t ret = nvs_flash_init_partition(NVS_FINGER_PARTITION);
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init_partition(NVS_FINGER_PARTITION));
    }

    httpd_handle_t http_server{nullptr};

    extern const unsigned char cert_start[] asm("_binary_host_pem_crt_start");
    extern const unsigned char cert_end[] asm("_binary_host_pem_crt_end");
    extern const unsigned char privkey_start[] asm("_binary_host_pem_prvtkey_start");
    extern const unsigned char privkey_end[] asm("_binary_host_pem_prvtkey_end");

    httpd_ssl_config_t conf = HTTPD_SSL_CONFIG_DEFAULT();
    conf.servercert = cert_start;
    conf.servercert_len = cert_end - cert_start;
    conf.prvtkey_pem = privkey_start;
    conf.prvtkey_len = privkey_end - privkey_start;
    conf.httpd.uri_match_fn=httpd_uri_match_wildcard;

    // timeseries::M* tsman=timeseries::M::GetSingleton();
    // tsman->Init(&zahl1, &zahl1, &zahl2, &zahl3);
    nvs_handle_t nvsFingerName2FingerIndex;
    nvs_handle_t nvsFingerIndex2SchedulerName;
    nvs_handle_t nvsFingerIndex2ActionIndex;
    nvs_handle_t nvsSchedulerName2SchedulerObjHandle;
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_FINGER_PARTITION, NVS_FINGER_NAME_2_FINGER_INDEX_NAMESPACE, NVS_READWRITE, &nvsFingerName2FingerIndex));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_FINGER_PARTITION, NVS_FINGER_INDEX_2_SCHEDULER_NAME_NAMESPACE, NVS_READWRITE, &nvsFingerIndex2SchedulerName));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_FINGER_PARTITION, NVS_FINGER_INDEX_2_ACTION_INDEX_NAMESPACE, NVS_READWRITE, &nvsFingerIndex2ActionIndex));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_FINGER_PARTITION, NVS_SCHEDULER_NAMESPACE, NVS_READWRITE, &nvsSchedulerName2SchedulerObjHandle));
/*
    nvs_iterator_t it{nullptr};
    esp_err_t res = nvs_entry_find(NVS_FINGER_PARTITION, NVS_FINGER_INDEX_2_SCHEDULER_NAME_NAMESPACE, NVS_TYPE_ANY, &it);
    while (res == ESP_OK)
    {
        nvs_entry_info_t info;
        nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL
        ESP_LOGI(TAG, "In NVS_FINGER_INDEX_2_SCHEDULER_NAME_NAMESPACE found key '%s' with type %i", info.key, info.type);
        res = nvs_entry_next(&it);
    }
    nvs_release_iterator(it);
*/

    buzzer = new BUZZER::M();
    buzzer->Begin(PIN_BUZZER);
    
    led = new LED::M(PIN_LED, false, &STANDBY);
    led->Begin(&FAST);

    onewireBus = new OneWire::OneWireBus<PIN_ONEWIRE>();
    onewireBus->Init();


    spilcd16::M<SPI2_HOST, PIN_LCD_MOSI, PIN_LCD_SCLK, PIN_LCD_CS, PIN_LCD_RS, GPIO_NUM_NC, PIN_LCD_BACKLIGHT, LCD135x240(12), 4096, 10> lcd;
    lcd.InitSpiAndGpio();
    lcd.Init_ST7789(Color::BLACK);
    backlightActivator=&lcd;
    auto adapter = new display::LineWriterToSpiLcdAdapter<24, 135, 5, 5>(&lcd, 24);
    auto root_folder = new FolderItem("root", &root_items);
    menuManagement = new menu::MenuManagement(root_folder, adapter);
    menuManagement->Init();

    sched = new SCHEDULER::Scheduler(nvsSchedulerName2SchedulerObjHandle);
    sched->Begin();
    
    Webmanager2Fingerprint2Hardware *w2f = new Webmanager2Fingerprint2Hardware(nvsFingerName2FingerIndex, nvsFingerIndex2SchedulerName, nvsFingerIndex2ActionIndex);
    w2f->Begin();

    fpm = new FINGERPRINT::M(UART_NUM_1, PIN_FINGER_IRQ, w2f, sched, nvsFingerName2FingerIndex, nvsFingerIndex2SchedulerName, nvsFingerIndex2ActionIndex);
    fpm->Begin(PIN_FINGER_TX_HOST, PIN_FINGER_RX_HOST);

    canmonitor = new CANMONITOR::M(w2f);
    g_config.intr_flags=ESP_INTR_FLAG_LOWMED;//|ESP_INTR_FLAG_SHARED;
    canmonitor->Begin(&t_config, &g_config);
    esp_intr_dump(nullptr);
    
    webmanager::M *wman = webmanager::M::GetSingleton();
    ESP_ERROR_CHECK(wman->Begin("ESP32AP_", "password", "finger_test", gpio_get_level(GPIO_NUM_0) == 1 ? false : true, true));
    esp_log_level_set("esp_https_server", ESP_LOG_WARN);
    ESP_ERROR_CHECK(httpd_ssl_start(&http_server, &conf));
    ESP_LOGI(TAG, "HTTPS Server listening on https://%s:%d", wman->GetSingleton()->GetHostname(), conf.port_secure);
    wman->RegisterHTTPDHandlers(http_server);
    std::vector<iMessageReceiver*>plugins{w2f, sched};
    wman->SetPlugins(&plugins);
    ESP_LOGI(TAG, "Webmanager plugins registered");
    wman->CallMeAfterInitializationToMarkCurrentPartitionAsValid();
    ESP_LOGI(TAG, "Overall startup completed. Partition marked as valid. Eternal loop begins.");

    while (true)
    {
        ESP_LOGI(TAG, "Free Heap: %lu, Temperature: %f", esp_get_free_heap_size(), onewireBus->GetMostRecentTemp(0));
        delayMs(5000);
    }
}