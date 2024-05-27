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
namespace TIMETABLE
{
class Webmanager2Timetable : public iMessageReceiver
{
private:
    MessageSender *callback{nullptr};
    nvs_handle_t nvsTimetableHandle;
public:
    Webmanager2Timetable(nvs_handle_t nvsTimetableHandle) : nvsTimetableHandle(nvsTimetableHandle)  {}

    esp_err_t provideWebsocketMessage(MessageSender *callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw) override
    {
        this->callback = callback;
        flatbuffers::FlatBufferBuilder b(1024);
        switch (mw->request_type())
        {
        case webmanager::Requests_RequestSaveTimetable:
            {
                auto req=mw->request_as_RequestSaveTimetable();
                const char *name = req->name()->c_str();
                uint8_t data[84];
                for(int i=0;i<84;i++){
                    data[i]=req->data()->v()->Get(i);
                }
                nvs_set_blob(this->nvsTimetableHandle, name, &data, 84);
                return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseSaveTimetable,
                                                        webmanager::CreateResponseSaveTimetableDirect(b, name).Union());
                break;
            }
        case webmanager::Requests_RequestDeleteTimetable:
            break;
        case webmanager::Requests::Requests_RequestLoadTimetable:
        {
            const char *name = mw->request_as_RequestLoadTimetable()->name()->c_str();
            std::array<uint8_t, 84> data;
            
            size_t blobSize=84;
            nvs_get_blob(this->nvsTimetableHandle, name, data.begin(), &blobSize);
            if(blobSize!=84){
                ESP_LOGW(TAG, "Timetable '%s' could not be read. Assuming all zeroes", name);
                data.fill(0);
            }else{
                ESP_LOGW(TAG, "Timetable '%s' read successfully", name);
            }
            webmanager::TimetableData dataVec(data);
            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseLoadTimetable,
                                                       webmanager::CreateResponseLoadTimetableDirect(b, name, &dataVec).Union());
        }
        default:
            return ESP_FAIL;
        }
        return ESP_FAIL;
    }
};

}