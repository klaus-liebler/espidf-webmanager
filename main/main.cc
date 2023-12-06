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


#define TAG "MAIN"
constexpr auto BUFFER_SIZE{1024};
uint8_t buffer[BUFFER_SIZE];

int16_t zahl0=0;
int16_t zahl1=0;
int16_t zahl2=0;
int16_t zahl3=0;

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
    webmanager::M* wman= webmanager::M::GetSingleton();
    ESP_ERROR_CHECK(wman->Init("ESP32AP_", "password", "esp32host_%02X%02X%02X", gpio_get_level(GPIO_NUM_0)==1?false:true, true));
    
    ESP_ERROR_CHECK(httpd_ssl_start(&http_server, &conf));
    
    wman->RegisterHTTPDHandlers(http_server);
    wman->CallMeAfterInitializationToMarkCurrentPartitionAsValid();
    char buf[32+1];
    

    while (true)
    {
        zahl0+=2;
        zahl1+=4;
        zahl2+=8;
        zahl3+=16;
        //ESP_LOGI(TAG, "This is Info %lu", esp_get_free_heap_size());
        //wman->logging_printf("Test1\n");
        delayMs(2000);
        //ESP_LOGW(TAG, "This is Warning %lu", esp_get_free_heap_size());
        //wman->logging_printf("Test2\n");
        delayMs(2000);
        //ESP_LOGE(TAG, "This is error %lu", esp_get_free_heap_size());
        //wman->logging_printf("Test3\n");
        delayMs(2000);
        ESP_ERROR_CHECK(wman->GetUserSettings()->GetStringSetting(webmanager::settings::GROUP1_G1I1_STRING, buf, 32));
        ESP_LOGI(TAG, "The current Setting of first string is %s", buf);
    }
}