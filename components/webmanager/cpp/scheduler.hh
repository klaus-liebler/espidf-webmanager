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
#include <common.hh>
#include "sunsetsunrise.hh"
#define TAG "SCHEDULER"
#include "esp_log.h"
namespace SCHEDULER
{
class Scheduler : public iMessageReceiver
{
private:
    MessageSender *callback{nullptr};
    nvs_handle_t nvsSchedulerHandle;
    const std::map<std::string, const iTimer *const> name2timer{
        {"ALWAYS", &ALWAYS},
        {"NEVER", &NEVER},
        {"Daily_6_22", &Daily_6_22},
        {"WorkingDays_7_18", &WorkingDays_7_18},
        {"TestOddEvenMin", &TestEvenMinutesOnOddMinutesOff},
    };
public:
    Scheduler(nvs_handle_t nvsSchedulerHandle) : nvsSchedulerHandle(nvsSchedulerHandle)  {}

    void Begin(){
        nvs_iterator_t it = NULL; 
        esp_err_t res = nvs_entry_find_in_handle(this->nvsSchedulerHandle, NVS_TYPE_BLOB, &it);
        std::vector<flatbuffers::Offset<scheduler::ResponseSchedulerListItem>> schedule_vector;
        while(res == ESP_OK) { 
            nvs_entry_info_t info; 
            nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL 
            printf("key '%s', type '%d' ", info.key, info.type);
            size_t length{0};
            nvs_get_blob(this->nvsSchedulerHandle, info.key, nullptr, &length);
            uint8_t data[length];
            nvs_get_blob(this->nvsSchedulerHandle, info.key, data, &length);
            const scheduler::ResponseSchedulerOpen * reqSched=flatbuffers::GetRoot<scheduler::ResponseSchedulerOpen>(data);
            const char * name=reqSched->name()->c_str();
            switch(reqSched->schedule_type()){
                case scheduler::uSchedule::uSchedule_OneWeekIn15Minutes:{
                    const scheduler::OneWeekIn15Minutes *d = reqSched->schedule_as_OneWeekIn15Minutes();
                    this->name2timer[name]=new TIMER::OneWeekIn15MinutesTimer(d->data());
                    break;
                }
                case scheduler::uSchedule::uSchedule_SunRandom:{
                    const scheduler::SunRandom *d = reqSched->schedule_as_SunRandom();
                    this->name2timer[name]=new TIMER::SunRandom(d->offsetMinutes()/60.0, d->randomMinutes()/60.0);
                    //schedule_vector.push_back(scheduler::CreateResponseSchedulerListItemDirect(b, name, scheduler::eSchedule::eSchedule_SunRandom));
                    break;
                }

            }
            res = nvs_entry_next(&it); 
        } 
        nvs_release_iterator(it);
    }

    esp_err_t provideWebsocketMessage(MessageSender *callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw) override
    {
        this->callback = callback;
        if(mw->request_type()!=webmanager::Requests_scheduler_RequestScheduler) return ESP_FAIL;
        auto sreq=mw->request_as_scheduler_RequestScheduler();
        flatbuffers::FlatBufferBuilder b(1024);
        switch (sreq->content_type())
        {
        case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerList:
            {
            

            return callback->WrapAndFinishAndSendAsync(b, webmanager::Responses::Responses_ResponseFingers,
                                                       webmanager::CreateResponseFingersDirect(b, &fingers_vector).Union());
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
#undef TAG