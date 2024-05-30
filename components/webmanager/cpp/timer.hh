#pragma once

#include <map>
#include <string>
#define TAG "FINGTIM"
#include "esp_log.h"
#include "esp_random.h"
#include "sunsetsunrise.hh"

namespace TIMER
{
    class iTimer
    {
    public:
        uint16_t IsActive() const
        {
            time_t currentTime;
            struct tm *localTime;
            time(&currentTime); // Get the current time
            if (currentTime > 1800 && currentTime < 1716498366L)
            { // Failsafe: If System runs for at least half an hour, but has no valid timestamp (constant is epoch time when writing this code)
                return true;
            }
            localTime = localtime(&currentTime); // Convert the current time to the local time
            int day_of_week = localTime->tm_wday;
            int h = localTime->tm_hour;
            int m = localTime->tm_min;
            int s = localTime->tm_sec;
            auto val= this->IsActive(day_of_week, h, m, s);
            ESP_LOGI(TAG, "On %d:%d:%d und weekday %d timer is %sactive", h,m,s,day_of_week, val?"":"in");
            return val;
        }

        virtual void NewDayHasBegun(uint32_t julianDay){
            return;
        }

    protected:
        virtual uint16_t IsActive(int d, int h, int m, int s) const = 0;
    };

    class : public iTimer
    {
        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            return UINT16_MAX;
        }
    } constexpr ALWAYS;

    class : public iTimer
    {
        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            return 0;
        }
    } constexpr NEVER;

    class : public iTimer
    {
        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            return (h >= 6 && h < 22)?UINT16_MAX:0;
        }

    } constexpr Daily_6_22;

    class : public iTimer
    {
        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            if (d > 5)
                return 0;
            return (h >= 7 && h < 18)?UINT16_MAX:0;
        }

    } constexpr WorkingDays_7_18;


    class : public iTimer
    {
        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            return (m%2==0)?UINT16_MAX:0;
        }

    }constexpr TestEvenMinutesOnOddMinutesOff;

    class OneWeekIn15MinutesTimer :public iTimer{
        private:
        uint8_t* data;
        public:
        OneWeekIn15MinutesTimer(uint8_t* data):data(data){}
        ~OneWeekIn15MinutesTimer(){
            delete(data);
        }

        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            uint8_t twoHours=data[d*12+(h>>1)];
            uint8_t fifteenMinutesSlot = 4*(h&1)+(m/15);
            return (twoHours&(1<<fifteenMinutesSlot))?UINT16_MAX:0;
        }
    };

    class SunRandom:public iTimer{
        private:
            const float offsetHours;
            const float randomHours;
            uint8_t todaysStartHour{0};
            uint8_t todaysStartMin{0};
            uint8_t todaysEndHour{0};
            uint8_t todaysEndMin{0};

        public:
        SunRandom(float offsetHours, float randomHours):offsetHours(offsetHours), randomHours(randomHours){
            
        }

        uint16_t IsActive(int d, int h, int m, int s) const override
        {
            return (h>=todaysStartHour && m>=todaysStartMin && h<=todaysEndHour && m<=todaysEndMin)?UINT16_MAX:0;
        }

        void NewDayHasBegun(uint32_t julianDay) override{
            double latDeg = 52.0965;
            double lonDeg = 7.6171;
            double sunriseHour{0.0};
            double sunsetHour{0.0};
            sunsetsunrise::DuskTillDawn(julianDay, latDeg, lonDeg, sunsetsunrise::eDawn::CIVIL, sunriseHour, sunsetHour);

            float randomSunrise = (((float)esp_random()/(float)UINT32_MAX)*2*randomHours)-randomHours;
            float randomSunset = (((float)esp_random()/(float)UINT32_MAX)*2*randomHours)-randomHours;
            float sunriseHoursCorr = sunriseHour+offsetHours+randomSunrise;
            float sunsetHoursCorr = sunriseHour-offsetHours+randomSunset;
            todaysStartHour = (uint8_t)sunriseHoursCorr;
            todaysStartMin = (uint8_t)(60.0f * std::fmod(sunriseHoursCorr, 1.0f));

            todaysEndHour = (uint8_t)sunsetHoursCorr;
            todaysEndMin = (uint8_t)(60.0f * std::fmod(sunsetHoursCorr, 1.0f));

            return;
        }
    };
    
   
    
}
#undef TAG