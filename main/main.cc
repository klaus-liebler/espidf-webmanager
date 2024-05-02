#include <stdio.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_system.h"

#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_log.h"
#include <string.h>
#include "driver/spi_master.h"
#include "driver/gpio.h"
#include <common-esp32.hh>
#include <mdns.h>

#include <esp_https_server.h>
#include <esp_tls.h>
#include <webmanager.hh>//include esp_https_server before!!!
#include <timeseries.hh>
#include <fingerprint.hh>
#include <canmonitor.hh>
#include <interfaces.hh>
#include <rgbled.hh>
#include <buzzer.hh>
#include <wifi_softap.hh>


#define TAG "MAIN"
#define NVS_FINGER_NAMESPACE "finger"



constexpr auto BUFFER_SIZE{1024};
uint8_t buffer[BUFFER_SIZE];
FINGERPRINT::M* fpm{nullptr};
CANMONITOR::M* canmonitor{nullptr};
//RGBLED::M<1, RGBLED::DeviceType::WS2812>* rgbled{nullptr};
BUZZER::M* buzzer{nullptr};
#ifdef V1
constexpr gpio_num_t PIN_FINGER_TX{GPIO_NUM_32};
constexpr gpio_num_t PIN_485DE{GPIO_NUM_33};
constexpr gpio_num_t PIN_SCL{GPIO_NUM_12};
constexpr gpio_num_t PIN_I2C_IO2{GPIO_NUM_13};
constexpr gpio_num_t PIN_SDA{GPIO_NUM_14};
constexpr gpio_num_t PIN_MOTOR{GPIO_NUM_15};
constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_23};
//FIXME: constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_7};
constexpr gpio_num_t PIN_485RO{GPIO_NUM_36};
constexpr gpio_num_t PIN_FINGER_RX{GPIO_NUM_39};

constexpr gpio_num_t PIN_G4_PU{GPIO_NUM_4};
constexpr gpio_num_t PIN_CAN_TX{GPIO_NUM_5};
constexpr gpio_num_t PIN_G16{GPIO_NUM_16};
constexpr gpio_num_t PIN_CAN_RX{GPIO_NUM_18};
constexpr gpio_num_t PIN_G19{GPIO_NUM_19};
constexpr gpio_num_t PIN_G21{GPIO_NUM_21};
constexpr gpio_num_t PIN_RGBLED{GPIO_NUM_22};
constexpr gpio_num_t PIN_G23{GPIO_NUM_23};
constexpr gpio_num_t PIN_485DI{GPIO_NUM_25};
constexpr gpio_num_t PIN_BUZZER{GPIO_NUM_26};
constexpr gpio_num_t PIN_I2C_IO1{GPIO_NUM_27};
#else
constexpr gpio_num_t PIN_FINGER_TX{GPIO_NUM_32};
constexpr gpio_num_t PIN_485DE{GPIO_NUM_33};
constexpr gpio_num_t PIN_BUZZER{GPIO_NUM_12};
constexpr gpio_num_t PIN_G13{GPIO_NUM_13};
constexpr gpio_num_t PIN_I2C_SCL{GPIO_NUM_14};
constexpr gpio_num_t PIN_FINGER_IRQ{GPIO_NUM_35};
constexpr gpio_num_t PIN_485RO{GPIO_NUM_36};
constexpr gpio_num_t PIN_FINGER_RX{GPIO_NUM_39};
constexpr gpio_num_t PIN_MOTOR{GPIO_NUM_2};
constexpr gpio_num_t PIN_CAN_TX{GPIO_NUM_5};
constexpr gpio_num_t PIN_G16{GPIO_NUM_16};
constexpr gpio_num_t PIN_CAN_RX{GPIO_NUM_18};
constexpr gpio_num_t PIN_G21{GPIO_NUM_21};
constexpr gpio_num_t PIN_LED{GPIO_NUM_22};
constexpr gpio_num_t PIN_G23{GPIO_NUM_23};
constexpr gpio_num_t PIN_485DI{GPIO_NUM_25};
constexpr gpio_num_t PIN_G26{GPIO_NUM_26};
constexpr gpio_num_t PIN_I2C_SDA{GPIO_NUM_27};
#endif


constexpr twai_timing_config_t t_config=TWAI_TIMING_CONFIG_125KBITS();
constexpr twai_general_config_t g_config= TWAI_GENERAL_CONFIG_DEFAULT(PIN_CAN_TX, PIN_CAN_RX, TWAI_MODE_NORMAL);

RGBLED::BlinkPattern blinkFastRedBlack(CRGB::Red, 300, CRGB::Black, 300); // booting
RGBLED::BlinkPattern blinkFastGreenBlack(CRGB::Green, 300, CRGB::Black, 300);
RGBLED::BlinkPattern blinkFastBlueGreen(CRGB::Blue, 300, CRGB::Green, 300);
RGBLED::BlinkPattern blinkFastYellowRed(CRGB::Yellow, 300, CRGB::Red, 300); // OTA Process
RGBLED::BlinkPattern flashGreen(CRGB::Green, 100, CRGB::Black, 3000); // Run


class Webmanager2Fingerprint2Hardware:public MessageReceiver, public FINGERPRINT::iFingerprintHandler, public CANMONITOR::iCanmonitorHandler{
    private:
        MessageSender* callback{nullptr};
        nvs_handle_t nvsHandle;
        time_t fingerDetected{INT64_MIN};
        static void static_task(void* args){static_cast<Webmanager2Fingerprint2Hardware*>(args)->task();}
        void task(){
            //rgbled->SetPixel(0, CRGB::Red, true);
            while(true){
                time_t now = millis();
                bool energizeMotor = now-fingerDetected<1000;
                gpio_set_level(PIN_MOTOR, !energizeMotor);
                //rgbled->Refresh();
                delayMs(30);
            }
        }
    public:
    Webmanager2Fingerprint2Hardware(nvs_handle_t nvsHandle):nvsHandle(nvsHandle){}

    void begin(){
        gpio_set_level(PIN_MOTOR, 1);
        gpio_set_direction(PIN_MOTOR, GPIO_MODE_INPUT_OUTPUT_OD);
        xTaskCreate(static_task, "wm2fp2hw", 4096, this, 10, nullptr);
    }

    void HandleCanMessageReceived(uint32_t messageId, uint8_t data[8], size_t dataLen) override{
        if(callback){
            flatbuffers::FlatBufferBuilder b(256);
            uint8_t vs[] = {data[0],data[1],data[2],data[3],data[4],data[5],data[6],data[7]};
            webmanager::CanData canData {vs}; 
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyCanMessage, 
                webmanager::CreateNotifyCanMessage(b, messageId, &canData, dataLen).Union()
                );
        }
    }

    void HandleFingerprintDetected(uint8_t errorCode, uint16_t finger, uint16_t score) override{
        if(callback){
            flatbuffers::FlatBufferBuilder b(256);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyFingerDetected, 
                webmanager::CreateNotifyFingerDetected(b, errorCode, finger, score).Union()
                );
        }
        if(errorCode==0){
            this->fingerDetected=millis();
        }
    }
    void HandleEnrollmentUpdate(uint8_t errorCode, uint8_t step, uint16_t fingerIndex, const char* name) override{
        if(callback){
            flatbuffers::FlatBufferBuilder b(256);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_NotifyEnrollNewFinger, 
                webmanager::CreateNotifyEnrollNewFingerDirect(b, name, fingerIndex, step, errorCode).Union()
                );
        }
    }

    esp_err_t provideWebsocketMessage(MessageSender* callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw) override{
        this->callback=callback;
        flatbuffers::FlatBufferBuilder b(1024);
        switch (mw->request_type())
        {
        case webmanager::Requests::Requests_RequestEnrollNewFinger:{
            const char* name = mw->request_as_RequestEnrollNewFinger()->name()->c_str();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseEnrollNewFinger, 
                webmanager::CreateResponseEnrollNewFinger(b, (uint16_t)fpm->TryEnrollAndStore(name)).Union());
        }
        case webmanager::Requests::Requests_RequestDeleteAllFingers:{
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteAllFingers, 
                webmanager::CreateResponseDeleteAllFingers(b, (uint16_t)fpm->TryDeleteAll()).Union());
        }
        case webmanager::Requests::Requests_RequestDeleteFinger:{
            const char* name = mw->request_as_RequestDeleteFinger()->name()->c_str();

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseDeleteFinger, 
                webmanager::CreateResponseDeleteFingerDirect(b, (uint16_t)fpm->TryDelete(name), name).Union());
        }
        case webmanager::Requests::Requests_RequestCancelInstruction:{
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseCancelInstruction, 
                webmanager::CreateResponseCancelInstruction(b, (uint16_t)fpm->CancelInstruction()).Union());
        }
        case webmanager::Requests::Requests_RequestRenameFinger:{
            const char* oldName = mw->request_as_RequestRenameFinger()->old_name()->c_str();
            const char* newName = mw->request_as_RequestRenameFinger()->new_name()->c_str();
            

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseRenameFinger, 
                webmanager::CreateResponseRenameFinger(b, (uint16_t)fpm->TryRename(oldName, newName)).Union());
        }
        case webmanager::Requests_RequestFingerprintSensorInfo:{
            auto p=fpm->GetAllParams();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingerprintSensorInfo, 
                webmanager::CreateResponseFingerprintSensorInfoDirect(b, 
                p->status, 
                p->librarySize, 
                p->securityLevel, 
                p->deviceAddress, 
                p->dataPacketSizeCode, 
                p->baudRateTimes9600, 
                p->algVer, p->fwVer).Union());
        }
            
        case webmanager::Requests::Requests_RequestFingers:{
            nvs_iterator_t it{nullptr};
            esp_err_t res =nvs_entry_find("nvs", NVS_FINGER_NAMESPACE, NVS_TYPE_U16, &it);
            std::vector<flatbuffers::Offset<webmanager::Finger>> fingers_vector;
            while(res == ESP_OK) {
                nvs_entry_info_t info;
                nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL
                uint16_t index;
                ESP_ERROR_CHECK(nvs_get_u16(nvsHandle, info.key,&index));
                fingers_vector.push_back(webmanager::CreateFingerDirect(b, info.key, index));
                res = nvs_entry_next(&it);
            }
            nvs_release_iterator(it);
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingers, 
                webmanager::CreateResponseFingersDirect(b, &fingers_vector).Union());
        }
        default:   
            return ESP_OK;
        }
    }
};

extern "C" void app_main(void)
{
    esp_err_t ret = nvs_flash_init();
	if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
		ESP_ERROR_CHECK(nvs_flash_erase());
		ESP_ERROR_CHECK(nvs_flash_init());
	}

    httpd_handle_t http_server{nullptr};
    
    extern const unsigned char cert_start[] asm("_binary_host_pem_crt_start");
    extern const unsigned char cert_end[]   asm("_binary_host_pem_crt_end");
    extern const unsigned char privkey_start[] asm("_binary_host_pem_prvtkey_start");
    extern const unsigned char privkey_end[] asm("_binary_host_pem_prvtkey_end");
     
	httpd_ssl_config_t conf = HTTPD_SSL_CONFIG_DEFAULT();
    conf.servercert = cert_start;
    conf.servercert_len = cert_end-cert_start;
    conf.prvtkey_pem = privkey_start;
    conf.prvtkey_len = privkey_end-privkey_start;
    
    
    //timeseries::M* tsman=timeseries::M::GetSingleton();
    //tsman->Init(&zahl1, &zahl1, &zahl2, &zahl3);
    nvs_handle_t nvsHandle;
    nvs_open(NVS_FINGER_NAMESPACE, NVS_READWRITE, &nvsHandle);

    //rgbled = new RGBLED::M<1, RGBLED::DeviceType::WS2812>();
    //rgbled->Begin(SPI2_HOST, PIN_RGBLED); 

    buzzer = new BUZZER::M();
    buzzer->Begin(PIN_BUZZER);

    Webmanager2Fingerprint2Hardware* w2f = new Webmanager2Fingerprint2Hardware(nvsHandle);
    w2f->begin();

    fpm = new FINGERPRINT::M(UART_NUM_1, PIN_FINGER_IRQ, w2f, nvsHandle);
    fpm->begin(PIN_FINGER_TX, PIN_FINGER_RX);

    canmonitor = new CANMONITOR::M(w2f);
    canmonitor->begin(&t_config, &g_config);



    webmanager::M* wman= webmanager::M::GetSingleton();
    ESP_ERROR_CHECK(wman->Init("ESP32AP_", "password", "esp32host_%02X%02X%02X", gpio_get_level(GPIO_NUM_0)==1?false:true, true));
    
    ESP_ERROR_CHECK(httpd_ssl_start(&http_server, &conf));
    ESP_LOGI(TAG, "HTTPD with SSL started");
    wman->RegisterHTTPDHandlers(http_server);
    ESP_LOGI(TAG, "HTTPD handlers registered");
    MessageReceiver* plugins[]={w2f};
    wman->SetPlugins(plugins, 1);
    ESP_LOGI(TAG, "Webmanager plugins registered");
    wman->CallMeAfterInitializationToMarkCurrentPartitionAsValid();
    ESP_LOGI(TAG, "Overall startup completed. Partition marked as valid. Eternal loop begins.");
    
    while (true)
    {
        ESP_LOGI(TAG, "Free Heap: %lu", esp_get_free_heap_size());
        delayMs(5000);
    }
}