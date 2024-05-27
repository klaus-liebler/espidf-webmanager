import { WebSocket } from "ws"
import * as flatbuffers from "flatbuffers"
import { RequestScheduler } from "../generated/flatbuffers/scheduler/request-scheduler";
import { RequestSchedulerOpen } from "../generated/flatbuffers/scheduler/request-scheduler-open";
import { uRequestScheduler } from "../generated/flatbuffers/scheduler/u-request-scheduler";
import { eSchedule } from "../generated/flatbuffers/scheduler/e-schedule";
import { ResponseSchedulerOpen } from "../generated/flatbuffers/scheduler/response-scheduler-open";
import { OneWeekIn15Minutes } from "../generated/flatbuffers/scheduler/one-week-in15-minutes";
import { OneWeekIn15MinutesData, ResponseScheduler, ResponseSchedulerList, ResponseSchedulerListItem, SunRandom, uResponseScheduler, uSchedule } from "../generated/flatbuffers/scheduler";
import { ResponseWrapper, Responses } from "../generated/flatbuffers/webmanager";

export function processScheduler_RequestScheduler(ws: WebSocket, m: RequestScheduler) {
    console.info(`processScheduler_RequestScheduler`);
    switch (m.contentType()) {
        case uRequestScheduler.RequestSchedulerList: {
            console.info(`processScheduler_RequestScheduler->uRequestScheduler.RequestSchedulerList`);
            let b = new flatbuffers.Builder(1024);

            let itemsOffset = ResponseSchedulerList.createItemsVector(b, [
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("OneWeekIn15MinutesA"), eSchedule.OneWeekIn15Minutes),
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("OneWeekIn15MinutesB"), eSchedule.OneWeekIn15Minutes),
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("PredefinedA"), eSchedule.Predefined),
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("PredefinedB"), eSchedule.Predefined),
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("SunRandomA"), eSchedule.SunRandom),
                ResponseSchedulerListItem.createResponseSchedulerListItem(b, b.createString("SunRandomB"), eSchedule.SunRandom),
            ]);

            b.finish(
                ResponseWrapper.createResponseWrapper(b, Responses.scheduler_ResponseScheduler,
                    ResponseScheduler.createResponseScheduler(b, uResponseScheduler.ResponseSchedulerList,
                        ResponseSchedulerList.createResponseSchedulerList(b, itemsOffset)
                    )
                )
            );
            ws.send(b.asUint8Array());
            break;
        }
        case uRequestScheduler.RequestSchedulerOpen: {
            let b = new flatbuffers.Builder(1024);
            let mo = <RequestSchedulerOpen>m.content(new RequestSchedulerOpen());
            switch(mo.type()){
                case eSchedule.OneWeekIn15Minutes:{
                    var fillValue = mo.name() == "OneWeekIn15MinutesA" ? 0xA5 : 0x10;
                    b.finish(
                        ResponseWrapper.createResponseWrapper(b, Responses.scheduler_ResponseScheduler,
                            ResponseScheduler.createResponseScheduler(b, uResponseScheduler.ResponseSchedulerOpen,
                                ResponseSchedulerOpen.createResponseSchedulerOpen(b,
                                    b.createString(mo.name()),
                                    uSchedule.OneWeekIn15Minutes,
                                    OneWeekIn15Minutes.createOneWeekIn15Minutes(b,
                                        OneWeekIn15MinutesData.createOneWeekIn15MinutesData(b, new Array<number>(84).fill(fillValue))
                                    )
                                )
                            )
                        )
                    );
                    ws.send(b.asUint8Array());
                    break
                }
                case eSchedule.SunRandom:{
                    var offsetMinutes = mo.name() == "SunRandomA" ? 1 : 2;
                    var randomMinutes = mo.name() == "SunRandomA" ? 10 : 20;
                    b.finish(
                        ResponseWrapper.createResponseWrapper(b, Responses.scheduler_ResponseScheduler,
                            ResponseScheduler.createResponseScheduler(b, uResponseScheduler.ResponseSchedulerOpen,
                                ResponseSchedulerOpen.createResponseSchedulerOpen(b,
                                    b.createString(mo.name()),
                                    uSchedule.SunRandom,
                                    SunRandom.createSunRandom(b,offsetMinutes, randomMinutes)
                                )
                            )
                        )
                    );
                    ws.send(b.asUint8Array());
                    break
                }
            }
            
            break;
        }
    }
}