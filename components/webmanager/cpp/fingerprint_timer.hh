#pragma once

#define TAG "FINGTIM"
#include "esp_log.h"

namespace FINGERPRINT
{
    class iTimer
    {
    public:
        bool IsActive() const
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

    protected:
        virtual bool IsActive(int d, int h, int m, int s) const = 0;
    };
    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            return true;
        }
    } constexpr ALWAYS;

    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            return false;
        }
    } constexpr NEVER;

    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            return (h >= 6 && h < 22);
        }

    } constexpr Daily_6_22;

    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            if (d > 5)
                return false;
            return (h >= 7 && h < 18);
        }

    } constexpr WorkingDays_7_18;

    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            if (d != 4)
                return false;
            return (h >= 14 && h < 18);
        }

    } constexpr CleaningService;


    class : public iTimer
    {
        bool IsActive(int d, int h, int m, int s) const override
        {
            return (m%2==0);
        }

    }constexpr TestEvenMinutesOnOddMinutesOff;

    constexpr std::array<const iTimer *const, 6> TIMER{&ALWAYS, &NEVER, &Daily_6_22, &WorkingDays_7_18, &CleaningService, &TestEvenMinutesOnOddMinutesOff};
}
#undef TAG