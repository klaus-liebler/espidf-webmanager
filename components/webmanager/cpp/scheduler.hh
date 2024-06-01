#pragma once
#include <cstdint>
#include <cstdlib>
#include <cstddef>
#include <cstring>
#include <cstdio>
#include <memory>
#include <map>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/uart.h"
#include "driver/gpio.h"
#include "nvs_flash.h"
#include "nvs.h"
#include <flatbuffers/flatbuffers.h>
#include "sdkconfig.h"
#include <common.hh>
#include "interfaces.hh"
#include "scheduler_timers.hh"
#include "sunsetsunrise.hh"
#define TAG "SCHEDULER"
#include "esp_log.h"
namespace SCHEDULER
{
    class Scheduler : public iMessageReceiver, public iScheduler
    {
    private:
        MessageSender *callback{nullptr};
        nvs_handle_t nvsSchedulerHandle;
        std::map<std::string, aTimer *> name2timer;
        uint32_t julianDay{0};

    public:
        Scheduler(nvs_handle_t nvsSchedulerHandle) : nvsSchedulerHandle(nvsSchedulerHandle) {}
        uint16_t GetCurrentValueOfSchedule(const char* schedulerName) override{
            if(!this->name2timer.contains(std::string(schedulerName))) return 0;
            SCHEDULER::aTimer* o=this->name2timer.at(std::string(schedulerName));
            return o->GetCurrentValue();
        }
        void Begin()
        {
            name2timer.clear();
            name2timer[ALWAYS.GetName()] = &ALWAYS;
            name2timer[NEVER.GetName()] = &NEVER,
            name2timer[DAILY_6_22.GetName()] = &DAILY_6_22;
            name2timer[WORKING_DAYS_7_18.GetName()] = &WORKING_DAYS_7_18;
            name2timer[TestEvenMinutesOnOddMinutesOff.GetName()] = &TestEvenMinutesOnOddMinutesOff;
            nvs_iterator_t it = nullptr;
            esp_err_t res = nvs_entry_find_in_handle(this->nvsSchedulerHandle, NVS_TYPE_BLOB, &it);
            while (res == ESP_OK)
            {
                nvs_entry_info_t info;
                nvs_entry_info(it, &info); // Can omit error check if parameters are guaranteed to be non-NULL
                printf("key '%s', type '%d' ", info.key, info.type);
                size_t length{0};
                nvs_get_blob(this->nvsSchedulerHandle, info.key, nullptr, &length);
                uint8_t data[length];
                nvs_get_blob(this->nvsSchedulerHandle, info.key, data, &length);
                const scheduler::Schedule *fbSched = flatbuffers::GetRoot<scheduler::Schedule>(data);
                aTimer* t= Builder::BuildFromFlatbuffer(fbSched);
                this->name2timer[t->GetName()]=t;
                res = nvs_entry_next(&it);
            }
            nvs_release_iterator(it);
        }

        esp_err_t Loop(time_t unixSecs)
        {

            uint32_t newJulianDay = sunsetsunrise::JulianDate(unixSecs);
            if (newJulianDay == this->julianDay)
                return ESP_OK;
            this->julianDay = newJulianDay;
            double latDeg = 52.0965;
            double lonDeg = 7.6171;
            double sunriseHour{0.0};
            double sunsetHour{0.0};
            sunsetsunrise::DuskTillDawn(this->julianDay, latDeg, lonDeg, sunsetsunrise::eDawn::CIVIL, sunriseHour, sunsetHour);
            ESP_LOGI(TAG, "A new julian day %lu has begun. sunrise %f, sunset %f", julianDay, sunriseHour, sunsetHour);
            for (auto const &[key, val] : name2timer)
            {
                val->NewDayHasBegun(julianDay, sunriseHour, sunsetHour);
            }
            return ESP_OK;
        }

        esp_err_t handleRequest(flatbuffers::FlatBufferBuilder &b, const scheduler::RequestSchedulerOpen* req){
            if(!this->name2timer.contains(req->name()->str())) return ESP_FAIL;
            SCHEDULER::aTimer* o=this->name2timer.at(req->name()->str());
            return callback->WrapAndFinishAndSendAsync(b,
                webmanager::Responses::Responses_scheduler_ResponseScheduler,
                scheduler::CreateResponseScheduler(b,
                    scheduler::uResponseScheduler_ResponseSchedulerOpen,
                    o->CreateFlatbufferScheduleOffset(b).Union()).Union());
        }

        esp_err_t handleRequest(flatbuffers::FlatBufferBuilder &b, const scheduler::RequestSchedulerList* req){
            std::vector<flatbuffers::Offset<scheduler::ResponseSchedulerListItem>> items;
            for (auto const &[key, val] : name2timer)
            {
                val->FillListOfResponseSchedulerListItems(b, items);
            }
            return callback->WrapAndFinishAndSendAsync(
                b,
                webmanager::Responses::Responses_scheduler_ResponseScheduler,
                scheduler::CreateResponseScheduler(
                    b,
                    scheduler::uResponseScheduler_ResponseSchedulerList,
                    scheduler::CreateResponseSchedulerListDirect(b, &items).Union())
                    .Union());
        }

        esp_err_t handleRequest(flatbuffers::FlatBufferBuilder &b, const scheduler::RequestSchedulerDelete* req){
            if(!this->name2timer.contains(req->name()->str())) return ESP_FAIL;
            this->name2timer.erase(req->name()->str());
            nvs_erase_key(this->nvsSchedulerHandle, req->name()->c_str());
            nvs_commit(this->nvsSchedulerHandle);
            return ESP_OK;
        }
  
        esp_err_t handleRequest(flatbuffers::FlatBufferBuilder &b, const scheduler::RequestSchedulerRename* req){
            if(!this->name2timer.contains(req->old_name()->str())) return ESP_FAIL;
            if(this->name2timer.contains(req->new_name()->str())) return ESP_FAIL;
            SCHEDULER::aTimer* o=this->name2timer.at(req->old_name()->str());
            size_t max_size{128};
            uint8_t blob[max_size];
            o->RenameAndFillNvsBlob(req->new_name()->str(), blob, max_size);
            this->name2timer.erase(req->old_name()->str());
            this->name2timer[req->new_name()->str()]=o;
            nvs_erase_key(this->nvsSchedulerHandle, req->old_name()->c_str());
            nvs_set_blob(this->nvsSchedulerHandle, req->new_name()->c_str(), blob, max_size);
            nvs_commit(this->nvsSchedulerHandle);
            return callback->WrapAndFinishAndSendAsync(b,
                webmanager::Responses::Responses_scheduler_ResponseScheduler,
                scheduler::CreateResponseScheduler(b,
                    scheduler::uResponseScheduler_ResponseSchedulerRename,
                    scheduler::CreateResponseSchedulerRenameDirect(b, req->old_name()->c_str(), req->new_name()->c_str()).Union()).Union());
        }

        esp_err_t handleRequest(flatbuffers::FlatBufferBuilder &b, const scheduler::RequestSchedulerSave* req){
            auto name = req->payload()->name()->str();
            if(this->name2timer.contains(name)){
                //not new object -->erase old in map and in flash
                SCHEDULER::aTimer* o=this->name2timer.at(name);
                this->name2timer.erase(name);
                nvs_erase_key(this->nvsSchedulerHandle, name.c_str());
                delete(o);
            }
            aTimer* t = Builder::BuildFromFlatbuffer(req->payload());
            this->name2timer[name]=t;
            size_t max_size{128};
            uint8_t blob[max_size];
            t->FillNvsBlob(blob, max_size);
            nvs_set_blob(this->nvsSchedulerHandle, name.c_str(), blob, max_size);
            nvs_commit(this->nvsSchedulerHandle);
            return callback->WrapAndFinishAndSendAsync(b,
                webmanager::Responses::Responses_scheduler_ResponseScheduler,
                scheduler::CreateResponseScheduler(b,
                    scheduler::uResponseScheduler_ResponseSchedulerSave,
                    scheduler::CreateResponseSchedulerSaveDirect(b, name.c_str()).Union()).Union());
        }

        esp_err_t provideWebsocketMessage(MessageSender *callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw) override
        {
            this->callback = callback;
            if (mw->request_type() != webmanager::Requests_scheduler_RequestScheduler){
                return ESP_FAIL;
            }
            auto sreq = mw->request_as_scheduler_RequestScheduler();
            flatbuffers::FlatBufferBuilder b(1024);
            switch (sreq->content_type())
            {
                
            case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerList:{
                return handleRequest(b, sreq->content_as_RequestSchedulerList());
            }
            case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerDelete:{
                return handleRequest(b, sreq->content_as_RequestSchedulerDelete());
            }
            case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerRename:{
                return handleRequest(b, sreq->content_as_RequestSchedulerRename());
            }
            case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerSave:{
                return handleRequest(b, sreq->content_as_RequestSchedulerSave());
            }
            case scheduler::uRequestScheduler::uRequestScheduler_RequestSchedulerOpen:{
                return handleRequest(b, sreq->content_as_RequestSchedulerOpen());
            }
            default:{
                break;
            }
            }
            return ESP_FAIL;
        }
    };

}
#undef TAG