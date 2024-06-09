#pragma once
#include <stdio.h>
#include <string.h>
#include <common.hh>
#include <esp_log.h>
#include <driver/gpio.h>
#include <esp_timer.h>

#include <array>
#define TAG "LED"
namespace LED
{
    class AnimationPattern
    {
    public:
        virtual void Reset(tms_t now) = 0;
        virtual bool Animate(tms_t now) = 0;
    };

    class BlinkPattern : public AnimationPattern
    {
    private:
        tms_t lastChange{0};
        bool state{false};
        tms_t timeOn;
        tms_t timeOff;

    public:
        void Reset(tms_t now) override
        {
            lastChange = now;
            state = true;
        }
        bool Animate(tms_t now) override
        {
            if (state)
            {
                if (lastChange + timeOn >= now)
                {
                    state = false;
                    lastChange = now;
                }
            }
            else
            {
                if (lastChange + timeOff >= now)
                {
                    state = true;
                    lastChange = now;

                }
            }
            return state;
        }
        BlinkPattern(tms_t timeOn, tms_t timeOff) : timeOn(timeOn), timeOff(timeOff) {}
    };

    class :public AnimationPattern{
        void Reset(tms_t now){}
        bool Animate(tms_t now){return false;}
    }CONST_OFF;

    class :public AnimationPattern{
        void Reset(tms_t now){}
        bool Animate(tms_t now){return true;}
    }CONST_ON;


    class M
    {
    private:
    	
        gpio_num_t gpio{GPIO_NUM_NC};
        bool invert{false};
        AnimationPattern* pattern;
        tms_t timeToAutoOff=INT64_MAX;//time is absolute!
    public:
        M(gpio_num_t gpio, bool invert=false):gpio(gpio), invert(invert) {}

        esp_err_t AnimatePixel(AnimationPattern *pattern, time_t timeToAutoOff=0)//time is relative, "0" means: no auto off
        {
            if(pattern==nullptr) this->pattern=&CONST_OFF;
            tms_t now = (esp_timer_get_time() / 1000);
            if(timeToAutoOff==0){
                this->timeToAutoOff=INT64_MAX;
            }else{
                this->timeToAutoOff=now+timeToAutoOff;
            }
            pattern->Reset(now);
            this->pattern = pattern;
            return ESP_OK;
        }

        esp_err_t Refresh()
        {
            tms_t now = (esp_timer_get_time() / 1000);
            if(now>=timeToAutoOff){
                this->pattern=&CONST_OFF;
            } 
            bool on = this->pattern->Animate(now);
            gpio_set_level(this->gpio, on^invert);
            return ESP_OK;
        }

        esp_err_t Begin(AnimationPattern *pattern=&CONST_OFF, tms_t timeToAutoOff=0)
        {
            this->AnimatePixel(pattern, timeToAutoOff);
            return gpio_set_direction(this->gpio, GPIO_MODE_OUTPUT);
        }
    };
}
#undef TAG