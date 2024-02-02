constexpr const char GROUP1_G1I1_STRING_KEY[]="G1I1 String";
constexpr const char GROUP1_G1I2_STRING_KEY[]="G1I2 String";
constexpr GroupCfg GROUP1 = {"Group1", 2, { 
{GROUP1_G1I1_STRING_KEY, webmanager::Setting::Setting_StringSetting},
{GROUP1_G1I2_STRING_KEY, webmanager::Setting::Setting_StringSetting},
}};
constexpr const char GROUP2_G2I1_STRING_KEY[]="G2I1 String";
constexpr const char GROUP2_G2I2_INT_KEY[]="G2I2 Int";
constexpr const char GROUP2_G2I3_BOOL_KEY[]="G2I3 Bool";
constexpr const char GROUP2_G2I4_ENUM_KEY[]="G2I4 Enum";
constexpr GroupCfg GROUP2 = {"Group2", 4, { 
{GROUP2_G2I1_STRING_KEY, webmanager::Setting::Setting_StringSetting},
{GROUP2_G2I2_INT_KEY, webmanager::Setting::Setting_IntegerSetting},
{GROUP2_G2I3_BOOL_KEY, webmanager::Setting::Setting_BooleanSetting},
{GROUP2_G2I4_ENUM_KEY, webmanager::Setting::Setting_EnumSetting},
}};
constexpr const char WEBMANANGER_SSID_KEY[]="ssid";
constexpr const char WEBMANANGER_PASSWORD_KEY[]="password";
constexpr GroupCfg WEBMANANGER = {"webmananger", 2, { 
{WEBMANANGER_SSID_KEY, webmanager::Setting::Setting_StringSetting},
{WEBMANANGER_PASSWORD_KEY, webmanager::Setting::Setting_StringSetting},
}};
constexpr std::array<const GroupCfg*, 3> groups = {
	&GROUP1,
	&GROUP2,
	&WEBMANANGER,
};

namespace settings{
	constexpr GroupAndStringSetting GROUP1_G1I1_STRING{GROUP1.groupKey, GROUP1_G1I1_STRING_KEY};
	constexpr GroupAndStringSetting GROUP1_G1I2_STRING{GROUP1.groupKey, GROUP1_G1I2_STRING_KEY};
	constexpr GroupAndStringSetting GROUP2_G2I1_STRING{GROUP2.groupKey, GROUP2_G2I1_STRING_KEY};
	constexpr GroupAndIntegerSetting GROUP2_G2I2_INT{GROUP2.groupKey, GROUP2_G2I2_INT_KEY};
	constexpr GroupAndBooleanSetting GROUP2_G2I3_BOOL{GROUP2.groupKey, GROUP2_G2I3_BOOL_KEY};
	constexpr GroupAndEnumSetting GROUP2_G2I4_ENUM{GROUP2.groupKey, GROUP2_G2I4_ENUM_KEY};
	constexpr GroupAndStringSetting WEBMANANGER_SSID{WEBMANANGER.groupKey, WEBMANANGER_SSID_KEY};
	constexpr GroupAndStringSetting WEBMANANGER_PASSWORD{WEBMANANGER.groupKey, WEBMANANGER_PASSWORD_KEY};
}
