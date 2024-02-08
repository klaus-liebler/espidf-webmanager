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
#include "esp_tls.h"
#include <webmanager.hh>//include esp_https_server before!!!
#include <timeseries.hh>
#include <fingerprint.hh>
#include <interfaces.hh>


#define TAG "MAIN"
#define NVS_FINGER_NAMESPACE "finger"
constexpr auto BUFFER_SIZE{1024};
uint8_t buffer[BUFFER_SIZE];
fingerprint::M* fpm{nullptr};


int16_t zahl0=0;
int16_t zahl1=0;
int16_t zahl2=0;
int16_t zahl3=0;

class Webmanager2Fingerprint2Hardware:public MessageReceiver, public fingerprint::iFingerprintHandler{
    private:
        MessageSender* callback;
        nvs_handle_t nvsHandle;
        gpio_num_t motorGpio;
        time_t fingerDetected{INT64_MIN};
        static void static_task(void* args){static_cast<Webmanager2Fingerprint2Hardware*>(args)->task();}
        void task(){
            while(true){
                time_t now = millis();
                bool energizeMotor = now-fingerDetected<1000;
                gpio_set_level(motorGpio, !energizeMotor);
                delayMs(100);
            }
        }
    public:
    Webmanager2Fingerprint2Hardware(nvs_handle_t nvsHandle,gpio_num_t motorGpio):nvsHandle(nvsHandle), motorGpio(motorGpio){}

    void begin(){
        gpio_set_level(motorGpio, 1);
        gpio_set_direction(motorGpio, GPIO_MODE_INPUT_OUTPUT_OD);
        xTaskCreate(static_task, "wm2fp2hw", 4096, this, 10, nullptr);
    }

    void HandleFingerprintDetected(bool success, uint16_t finger, uint16_t score) override{
        if(callback){
            flatbuffers::FlatBufferBuilder b(1024);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_NotifyFingerDetected, 
                webmanager::CreateNotifyFingerDetected(b, success, finger, score).Union()
                );
        }
        if(success){
            this->fingerDetected=millis();
        }
    }
    void HandleEnrollmentUpdate(bool success, uint8_t step, uint16_t fingerIndex, const char* name) override{
        if(callback){
            flatbuffers::FlatBufferBuilder b(1024);
            callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_NotifyEnrollNewFinger, 
                webmanager::CreateNotifyEnrollNewFingerDirect(b, name, fingerIndex, step, success).Union()
                );
        }
    }

    esp_err_t provideWebsocketMessage(MessageSender* callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::MessageWrapper *mw) override{
        this->callback=callback;
        flatbuffers::FlatBufferBuilder b(1024);
        switch (mw->message_type())
        {
        case webmanager::Message_NotifyEnrollNewFinger:{
            const char* name = mw->message_as_RequestEnrollNewFinger()->name()->c_str();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseEnrollNewFinger, 
                webmanager::CreateResponseEnrollNewFinger(b, fpm->TryEnrollAndStore(name)==ESP_OK).Union());
        }
        case webmanager::Message::Message_RequestDeleteAllFingers:
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseDeleteAllFingers, 
                webmanager::CreateResponseDeleteAllFingers(b, fpm->TryDeleteAll()==ESP_OK).Union());
        case webmanager::Message::Message_RequestDeleteFinger:{
            const char* name = mw->message_as_RequestDeleteFinger()->name()->c_str();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseDeleteFinger, 
                webmanager::CreateResponseDeleteFingerDirect(b, fpm->TryDelete(name)==ESP_OK, name).Union());
        }

        case webmanager::Message::Message_RequestRenameFinger:{
            const char* oldName = mw->message_as_RequestRenameFinger()->old_name()->c_str();
            const char* newName = mw->message_as_RequestRenameFinger()->new_name()->c_str();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseRenameFinger, 
                webmanager::CreateResponseRenameFinger(b, fpm->TryRename(oldName, newName)==ESP_OK).Union());
        }

        case webmanager::Message_RequestFingerprintSensorInfo:{
            auto p=fpm->GetAllParams();
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseFingerprintSensorInfo, 
                webmanager::CreateResponseFingerprintSensorInfoDirect(b, 
                p->status, 
                p->librarySize, 
                p->securityLevel, 
                p->deviceAddress, 
                p->dataPacketSizeCode, 
                p->baudRateTimes9600, 
                p->algVer, p->fwVer).Union());
        }
            
        case webmanager::Message::Message_RequestFingers:{
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
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Message::Message_ResponseFingers, 
                webmanager::CreateResponseFingersDirect(b, &fingers_vector).Union());
        }
            
            break;
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

    Webmanager2Fingerprint2Hardware* w2f = new Webmanager2Fingerprint2Hardware(nvsHandle, GPIO_NUM_15);
    w2f->begin();

    fpm = new fingerprint::M(UART_NUM_1, GPIO_NUM_35, w2f, nvsHandle);
    fpm->begin(GPIO_NUM_32, GPIO_NUM_39);

    webmanager::M* wman= webmanager::M::GetSingleton();
    ESP_ERROR_CHECK(wman->Init("ESP32AP_", "password", "esp32host_%02X%02X%02X", gpio_get_level(GPIO_NUM_0)==1?false:true, true));
    
    ESP_ERROR_CHECK(httpd_ssl_start(&http_server, &conf));
    
    wman->RegisterHTTPDHandlers(http_server);
    
    MessageReceiver* plugins[]={w2f};
    wman->SetPlugins(plugins, 1);
    wman->CallMeAfterInitializationToMarkCurrentPartitionAsValid();
    
    char buf[32];
    while (true)
    {

        ESP_ERROR_CHECK(wman->GetUserSettings()->GetStringSetting(webmanager::settings::GROUP1_G1I1_STRING, buf, 32));
        ESP_LOGI(TAG, "The current Setting of first string is %s", buf);
        ESP_LOGI(TAG, "Free Heap: %lu", esp_get_free_heap_size());
        delayMs(5000);
    }
}