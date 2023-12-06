import { Message } from "../flatbuffers_gen/webmanager/message";
import { MessageWrapper } from "../flatbuffers_gen/webmanager/message-wrapper";
import { ScreenController } from "./screen_controller";
import BuildApps from "../sensactapps_copied_during_build";
import { ApplicationGroup, SensactApplication } from "../sensactapps_base";


export class SensactScreenController extends ScreenController {

    private apps: Array<ApplicationGroup> = [];

    onMessage(messageWrapper: MessageWrapper): void {

    }

    onCreate(): void {

        var allApps=BuildApps();
        var unknownsGroup = new Array<SensactApplication>();
        var regex=new RegExp("^([A-Z]+)_+(L0|L1|L2|L3|LX|LS|XX)_(LVNG|KTCH|KID1|KID2|BATH|CORR|TECH|WORK|BEDR|WELL|STO1|PRTY|STRS|UTIL|LEFT|RGHT|BACK|FRON|CARP|GARA|ROOF|XXX)_(.*)$");
        //Struktur Ebene -->Raum
        var level2room2apps = new Map<string, Map<string, Array<SensactApplication>>>();
        allApps.forEach((app)=>{
            var result = regex.exec(app.applicationKey);
            if(!result){//application key does not fulfil structure
                unknownsGroup.push(app);
            }else{
                var type = result[1];
                var level = result[2];
                var room = result[3];
                var room2apps = level2room2apps.get(level);
                if(room2apps===undefined){
                    room2apps = new Map<string, Array<SensactApplication>>();
                    level2room2apps.set(level, room2apps);
                }
                var apps = room2apps.get(room);
                if(apps===undefined){
                    apps = new Array<SensactApplication>();
                    room2apps.set(room, apps);
                }
                apps.push(app);
            }
        });
        level2room2apps.forEach((levelMap, levelKey)=>{
            this.apps.push(new ApplicationGroup("Ebene " +levelKey, this.LevelMap2ApplicationGroup(levelMap)));
        });
        if(unknownsGroup.length>0) this.apps.push(new ApplicationGroup("Andere", unknownsGroup));
        this.apps.forEach(v => v.renderHtmlUi(this.appManagement.MainElement()));
        this.appManagement.registerWebsocketMessageTypes(this, Message.ResponseSystemData);

    }
    onFirstStart(): void {

    }
    onRestart(): void {

    }
    onPause(): void {
    }

    private LevelMap2ApplicationGroup(room2apps: Map<string, SensactApplication[]>): ApplicationGroup[] {
        var ret=new Array<ApplicationGroup>();
        room2apps.forEach((apps, roomKey)=>{
            ret.push(new ApplicationGroup("Room "+roomKey, apps));
        });
        return ret;
    }

}


