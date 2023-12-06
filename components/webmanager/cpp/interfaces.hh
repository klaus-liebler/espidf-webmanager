#pragma once

#include <esp_err.h>
#include "../generated/flatbuffers_gen_cpp/app_generated.h"

class MessageSender{
    public:
    virtual esp_err_t WrapAndFinishAndSendAsync(::flatbuffers::FlatBufferBuilder &_fbb, webmanager::Message message_type = webmanager::Message_NONE, ::flatbuffers::Offset<void> message = 0)=0;
};