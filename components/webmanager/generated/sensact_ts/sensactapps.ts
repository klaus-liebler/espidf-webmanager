import { ApplicationId } from "../../generated/flatbuffers/application-id";
import { BlindApplication, OnOffApplication, SensactApplication, SinglePwmApplication } from "../../utils/sensactapps_base";


export default function Build():Array<SensactApplication>{
    var ret = new Array<SensactApplication>();
    //OnOff erstes Licht 
ret.push(new OnOffApplication(ApplicationId.ApplicationId_POWIT_9, 'POWIT_9', 'erstes Licht'));

//OnOff zweites Licht 
ret.push(new OnOffApplication(ApplicationId.ApplicationId_POWIT_10, 'POWIT_10', 'zweites Licht'));

//OnOff drittes Licht 
ret.push(new OnOffApplication(ApplicationId.ApplicationId_POWIT_11, 'POWIT_11', 'drittes Licht'));

//OnOff viertes Licht 
ret.push(new OnOffApplication(ApplicationId.ApplicationId_POWIT_12, 'POWIT_12', 'viertes Licht'));

//Blind Test-Rollade 
ret.push(new BlindApplication(ApplicationId.ApplicationId_BLIND_XX_XXX_13, 'BLIND_XX_XXX_13', 'Test-Rollade'));

//SinglePWM Dimmbares Licht 
ret.push(new SinglePwmApplication(ApplicationId.ApplicationId_PWM___XX_XXX_14, 'PWM___XX_XXX_14', 'Dimmbares Licht'));

//OnOff Standby für die PWMApplication 
ret.push(new OnOffApplication(ApplicationId.ApplicationId_STDBY_XX_XXX_15, 'STDBY_XX_XXX_15', 'Standby für die PWMApplication'));


    return ret;
}