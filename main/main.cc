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
#include <ds18b20.hh>
#include <mqtt_client.h>

#define TAG "MAIN"
#define NVS_PARTITION_NAME NVS_DEFAULT_PART_NAME
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

extern const unsigned char rootCAcert_start[] asm("_binary_rootCA_pem_crt_start");
extern const unsigned char rootCAcert_end[] asm("_binary_rootCA_pem_crt_end");
extern const unsigned char cert_start[] asm("_binary_esp32_pem_crt_start");
extern const unsigned char cert_end[] asm("_binary_esp32_pem_crt_end");
extern const unsigned char privkey_start[] asm("_binary_esp32_pem_key_start");
extern const unsigned char privkey_end[] asm("_binary_esp32_pem_key_end");

FINGERPRINT::M *fpm{nullptr};
SCHEDULER::Scheduler *sched{nullptr};
CANMONITOR::M *canmonitor{nullptr};
BUZZER::M *buzzer{nullptr};
LED::M *led{nullptr};
OneWire::OneWireBus<PIN_ONEWIRE> *onewireBus{nullptr};

esp_mqtt_client_handle_t mqtt_client{nullptr};
httpd_handle_t http_server{nullptr};

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
LED::BlinkPattern STANDBY(100, 10000);

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
        // buzzer->PlaySong(BUZZER::RINGTONE_SONG::POSITIVE);
        auto wman = webmanager::M::GetSingleton();
        webmanager::WifiStationState staState{webmanager::WifiStationState::NO_CONNECTION};
        while (true)
        {
            time_t now = millis();
            bool energizeMotor = (now - fingerDetected) < 1000;
            gpio_set_level(PIN_MOTOR, energizeMotor);
            buzzer->Loop();

            webmanager::WifiStationState newStaState = wman->GetStaState();
            if (newStaState != webmanager::WifiStationState::CONNECTED && newStaState != staState)
            {
                led->AnimatePixel(&FAST);
                ESP_LOGI(TAG, "Wifi connected --> start mqtt client");
                esp_mqtt_client_start(mqtt_client);
            }
            else if (newStaState == webmanager::WifiStationState::CONNECTED && newStaState != staState)
            {
                led->AnimatePixel(&SLOW, 5000);
            }
            led->Refresh();
            onewireBus->SensorLoop();
            staState = newStaState;
            delayMs(30);
        }
    }

public:
    Webmanager2Fingerprint2Hardware(nvs_handle_t nvsFingerName2FingerIndex, nvs_handle_t nvsFingerIndex2SchedulerName, nvs_handle_t nvsFingerIndex2ActionIndex) : nvsFingerName2FingerIndex(nvsFingerName2FingerIndex), nvsFingerIndex2SchedulerName(nvsFingerIndex2SchedulerName), nvsFingerIndex2ActionIndex(nvsFingerIndex2ActionIndex) {}

    void Begin()
    {
        gpio_config_t io_conf = {
            .pin_bit_mask = (1ULL << PIN_MOTOR),
            .mode = GPIO_MODE_OUTPUT,
            .pull_up_en = GPIO_PULLUP_DISABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        gpio_config(&io_conf);
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
            // buzzer->PlaySong(BUZZER::RINGTONE_SONG::POSITIVE);
        }
        else if (errorCode == (uint8_t)FINGERPRINT::RET::FINGER_NOT_FOUND)
        {
            ESP_LOGW(TAG, "Unknown finger!");
            // buzzer->PlaySong(BUZZER::RINGTONE_SONG::NEGATIV);
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
                                                       webmanager::CreateResponseEnrollNewFinger(b, (uint16_t)fpm->TryEnrollAndStore(name)).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestDeleteAllFingers:
        {
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteAllFingers,
                                                       webmanager::CreateResponseDeleteAllFingers(b, (uint16_t)fpm->TryDeleteAll()).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestDeleteFinger:
        {
            const char *name = mw->request_as_RequestDeleteFinger()->name()->c_str();

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteFinger,
                                                       webmanager::CreateResponseDeleteFingerDirect(b, (uint16_t)fpm->TryDelete(name), name).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestCancelInstruction:
        {
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseCancelInstruction,
                                                       webmanager::CreateResponseCancelInstruction(b, (uint16_t)fpm->CancelInstruction()).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestRenameFinger:
        {
            const char *oldName = mw->request_as_RequestRenameFinger()->old_name()->c_str();
            const char *newName = mw->request_as_RequestRenameFinger()->new_name()->c_str();

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseRenameFinger,
                                                       webmanager::CreateResponseRenameFinger(b, (uint16_t)fpm->TryRename(oldName, newName)).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
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
                                                           .Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
            break;
        }
        case webmanager::Requests::Requests_RequestStoreFingerAction:
        {
            fpm->TryStoreFingerAction(mw->request_as_RequestStoreFingerAction()->fingerIndex(), mw->request_as_RequestStoreFingerAction()->actionIndex());
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseStoreFingerAction,
                                                       webmanager::CreateResponseStoreFingerAction(b).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        case webmanager::Requests::Requests_RequestStoreFingerSchedule:
        {
            fpm->TryStoreFingerScheduler(mw->request_as_RequestStoreFingerSchedule()->fingerIndex(), mw->request_as_RequestStoreFingerSchedule()->scheduleName()->c_str());
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseStoreFingerSchedule,
                                                       webmanager::CreateResponseStoreFingerSchedule(b).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }
        case webmanager::Requests::Requests_RequestFingers:
        {
            std::vector<flatbuffers::Offset<flatbuffers::String>> scheduleNames;
            sched->FillFlatbufferWithAvailableNames(b, scheduleNames);

            std::vector<flatbuffers::Offset<webmanager::Finger>> fingers_vector;

            nvs_iterator_t it{nullptr};
            esp_err_t res = nvs_entry_find(NVS_PARTITION_NAME, NVS_FINGER_NAME_2_FINGER_INDEX_NAMESPACE, NVS_TYPE_U16, &it);
            while (res == ESP_OK)
            {
                nvs_entry_info_t info;
                nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL
                uint16_t fingerIndex;
                ESP_ERROR_CHECK(nvs_get_u16(nvsFingerName2FingerIndex, info.key, &fingerIndex));
                char fingerIndexAsString[6];
                snprintf(fingerIndexAsString, 6, "%d", fingerIndex);

                uint16_t actionIndex = 0;
                if (nvs_get_u16(nvsFingerIndex2ActionIndex, fingerIndexAsString, &actionIndex) != ESP_OK)
                {
                    ESP_LOGW(TAG, "Problem while fetching actionIndex for fingerIndex %s (%s). Assuming action 0", fingerIndexAsString, info.key);
                    actionIndex = 0;
                }

                size_t scheduleNameLen{0};
                nvs_get_str(nvsFingerIndex2SchedulerName, fingerIndexAsString, nullptr, &scheduleNameLen);
                char scheduleName[scheduleNameLen]; // scheduleNameLen+1 is NOT necessary!
                auto err = nvs_get_str(nvsFingerIndex2SchedulerName, fingerIndexAsString, scheduleName, &scheduleNameLen);
                if (err != ESP_OK)
                {
                    ESP_LOGW(TAG, "Problem while fetching scheduleName for fingerIndex %s (%s). Error=%s. Assuming empty string.", fingerIndexAsString, info.key, esp_err_to_name(err));
                    scheduleName[0] = 0;
                }
                fingers_vector.push_back(webmanager::CreateFingerDirect(b, info.key, fingerIndex, scheduleName, actionIndex));
                res = nvs_entry_next(&it);
            }
            nvs_release_iterator(it);
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingers,
                                                       webmanager::CreateResponseFingersDirect(b, &scheduleNames, &fingers_vector).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        case webmanager::Requests::Requests_RequestFingerActionManually:
        {
            auto fingerIndex = mw->request_as_RequestFingerActionManually()->fingerIndex();
            auto actionIndex = mw->request_as_RequestFingerActionManually()->actionIndex();
            ESP_LOGI(TAG, "Manually do FingerprintAction");
            this->HandleFingerprintAction(fingerIndex, actionIndex);
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingerActionManually,
                                                       webmanager::CreateResponseFingerActionManually(b).Union()) == ESP_OK
                       ? eMessageReceiverResult::OK
                       : eMessageReceiverResult::FOR_ME_BUT_FAILED;
        }

        default:
            break;
        }
        return eMessageReceiverResult::NOT_FOR_ME;
    }

    void log_error_if_nonzero(const char *message, int error_code)
    {
        if (!error_code) return;
        ESP_LOGE(TAG, "Last error %s: 0x%x", message, error_code); 
    }
    
    void handleMqttEvent(esp_mqtt_event_id_t mqtt_event_id, esp_mqtt_event_handle_t event)
    {
    
        esp_mqtt_client_handle_t client = event->client;
        int msg_id;
        switch (mqtt_event_id)
        {
        case MQTT_EVENT_CONNECTED:{
            ESP_LOGI(TAG, "MQTT_EVENT_CONNECTED");
            esp_mqtt_topic_t subs[] = {{
                                           .filter = "/L0/hwr/cmd/#",
                                           .qos = 0,
                                       },
                                       {
                                           .filter = "/EVENTS/#",
                                           .qos = 0,
                                       }};
            msg_id = esp_mqtt_client_subscribe_multiple(client, subs, 2);
            ESP_LOGI(TAG, "sent subscribe successful, msg_id=%d", msg_id);
            break;
        }
        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGI(TAG, "MQTT_EVENT_DISCONNECTED");
            break;
        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "MQTT_EVENT_DATA");
            if (strncmp(event->topic, "/L0/hwr/cmd/opendoor", event->topic_len) == 0)
            {
                this->HandleFingerprintAction(0, 0);
            }
            printf("TOPIC=%.*s\r\n", event->topic_len, event->topic);
            printf("DATA=%.*s\r\n", event->data_len, event->data);
            break;
        case MQTT_EVENT_ERROR:
            ESP_LOGI(TAG, "MQTT_EVENT_ERROR");
            if (event->error_handle->error_type == MQTT_ERROR_TYPE_TCP_TRANSPORT)
            {
                log_error_if_nonzero("reported from esp-tls", event->error_handle->esp_tls_last_esp_err);
                log_error_if_nonzero("reported from tls stack", event->error_handle->esp_tls_stack_err);
                log_error_if_nonzero("captured as transport's socket errno", event->error_handle->esp_transport_sock_errno);
                ESP_LOGI(TAG, "Last errno string (%s)", strerror(event->error_handle->esp_transport_sock_errno));
            }
            break;
        default:
            ESP_LOGI(TAG, "Other event id:%d", event->event_id);
            break;
        }
    }

    static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t generic_event_id, void *event_data)
    {
        Webmanager2Fingerprint2Hardware *myself = static_cast<Webmanager2Fingerprint2Hardware *>(handler_args);
        esp_mqtt_event_id_t mqtt_event_id = static_cast<esp_mqtt_event_id_t>(generic_event_id);
        esp_mqtt_event_handle_t event = static_cast<esp_mqtt_event_handle_t>(event_data);
        myself->handleMqttEvent(mqtt_event_id, event);
    }
};



extern "C" void app_main(void)
{
    esp_err_t ret = nvs_flash_init_partition(NVS_PARTITION_NAME);
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND)
    {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init_partition(NVS_PARTITION_NAME));
    }

    httpd_ssl_config_t httpd_conf = HTTPD_SSL_CONFIG_DEFAULT();
    httpd_conf.servercert = cert_start;
    httpd_conf.servercert_len = cert_end - cert_start;
    httpd_conf.prvtkey_pem = privkey_start;
    httpd_conf.prvtkey_len = privkey_end - privkey_start;
    httpd_conf.httpd.uri_match_fn = httpd_uri_match_wildcard;

    esp_mqtt_client_config_t mqtt_cfg = {};
    mqtt_cfg.broker.address.uri = "mqtts://liebler.iui.hs-osnabrueck.de:8883";
    mqtt_cfg.broker.verification.certificate = (const char *)rootCAcert_start;
    mqtt_cfg.credentials.authentication.certificate = (const char *)cert_start;
    mqtt_cfg.credentials.authentication.key = (const char *)privkey_start;

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);

    // timeseries::M* tsman=timeseries::M::GetSingleton();
    // tsman->Init(&zahl1, &zahl1, &zahl2, &zahl3);
    nvs_handle_t nvsFingerName2FingerIndex;
    nvs_handle_t nvsFingerIndex2SchedulerName;
    nvs_handle_t nvsFingerIndex2ActionIndex;
    nvs_handle_t nvsSchedulerName2SchedulerObjHandle;
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_PARTITION_NAME, NVS_FINGER_NAME_2_FINGER_INDEX_NAMESPACE, NVS_READWRITE, &nvsFingerName2FingerIndex));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_PARTITION_NAME, NVS_FINGER_INDEX_2_SCHEDULER_NAME_NAMESPACE, NVS_READWRITE, &nvsFingerIndex2SchedulerName));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_PARTITION_NAME, NVS_FINGER_INDEX_2_ACTION_INDEX_NAMESPACE, NVS_READWRITE, &nvsFingerIndex2ActionIndex));
    ESP_ERROR_CHECK(nvs_open_from_partition(NVS_PARTITION_NAME, NVS_SCHEDULER_NAMESPACE, NVS_READWRITE, &nvsSchedulerName2SchedulerObjHandle));
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

    sched = new SCHEDULER::Scheduler(nvsSchedulerName2SchedulerObjHandle);
    sched->Begin();

    auto w2f = new Webmanager2Fingerprint2Hardware(nvsFingerName2FingerIndex, nvsFingerIndex2SchedulerName, nvsFingerIndex2ActionIndex);
    w2f->Begin();

    fpm = new FINGERPRINT::M(UART_NUM_1, PIN_FINGER_IRQ, w2f, sched, nvsFingerName2FingerIndex, nvsFingerIndex2SchedulerName, nvsFingerIndex2ActionIndex);
    fpm->Begin(PIN_FINGER_TX_HOST, PIN_FINGER_RX_HOST);

    canmonitor = new CANMONITOR::M(w2f);
    g_config.intr_flags = ESP_INTR_FLAG_LOWMED; //|ESP_INTR_FLAG_SHARED;
    canmonitor->Begin(&t_config, &g_config);

    esp_mqtt_client_register_event(mqtt_client, MQTT_EVENT_ANY, Webmanager2Fingerprint2Hardware::mqtt_event_handler, w2f);

    webmanager::M *wman = webmanager::M::GetSingleton();
    ESP_ERROR_CHECK(wman->Begin("ESP32AP_", "password", "finger_test", gpio_get_level(GPIO_NUM_0) == 1 ? false : true, true));
    esp_log_level_set("esp_https_server", ESP_LOG_WARN);
    ESP_ERROR_CHECK(httpd_ssl_start(&http_server, &httpd_conf));
    ESP_LOGI(TAG, "HTTPS Server listening on https://%s:%d", wman->GetHostname(), httpd_conf.port_secure);
    wman->RegisterHTTPDHandlers(http_server);
    std::vector<iMessageReceiver *> plugins{w2f, sched};
    wman->SetPlugins(&plugins);
    ESP_LOGI(TAG, "Webmanager plugins registered");
    wman->CallMeAfterInitializationToMarkCurrentPartitionAsValid();
    ESP_LOGI(TAG, "Overall startup completed. Partition marked as valid. Eternal loop begins.");

    while (true)
    {
        uint32_t free_heap = esp_get_free_heap_size();
        ESP_LOGI(TAG, "Free Heap: %lu, Temperature: %f", free_heap, onewireBus->GetMostRecentTemp(0));
        char cbuf[64];
        int usedBuf = snprintf(cbuf, 64, "{time:%lld, heap:%ld}", esp_timer_get_time(), free_heap);
        esp_mqtt_client_publish(mqtt_client, "/L0/HWR/status", cbuf, usedBuf, 0, 0);
        delayMs(5000);
    }
}