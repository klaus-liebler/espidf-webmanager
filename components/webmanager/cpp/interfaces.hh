#pragma once

#include <esp_err.h>
#include "../generated/flatbuffers_cpp/app_generated.h"

class MessageSender{
    public:
    virtual esp_err_t WrapAndFinishAndSendAsync(::flatbuffers::FlatBufferBuilder &_fbb, webmanager::Responses response_type = webmanager::Responses_NONE, ::flatbuffers::Offset<void> message = 0)=0;
};

class MessageReceiver{
    public:
    virtual esp_err_t provideWebsocketMessage(MessageSender* callback, httpd_req_t *req, httpd_ws_frame_t *ws_pkt, const webmanager::RequestWrapper *mw)=0;
};