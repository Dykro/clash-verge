import useSWR from "swr";
import { useEffect, useMemo } from "react";
import { useLockFn } from "ahooks";
import { useTranslation } from "react-i18next";
import { Button, ButtonGroup, Paper } from "@mui/material";
import { getClashConfig, updateConfigs } from "@/services/api";
import { patchClashConfig } from "@/services/cmds";
import { useVerge } from "@/hooks/use-verge";
import { BasePage,Notice } from "@/components/base";
import { ProxyGroups } from "@/components/proxy/proxy-groups";
import SettingSystem from "@/components/setting2/setting-system";

const ProxyPage = () => {
  const { t } = useTranslation();

  const { data: clashConfig, mutate: mutateClash } = useSWR(
    "getClashConfig",
    getClashConfig
  );

  const { verge } = useVerge();

  const modeList = useMemo(() => {
    if (verge?.clash_core === "clash-meta") {
      return ["rule", "global", "direct"];
    }
    return ["rule", "global", "direct", "script"];
  }, [verge?.clash_core]);

  const curMode = clashConfig?.mode.toLowerCase();

  const onChangeMode = useLockFn(async (mode: string) => {
    await updateConfigs({ mode });
    await patchClashConfig({ mode });
    mutateClash();
  });

  useEffect(() => {
    if (curMode && !modeList.includes(curMode)) {
      onChangeMode("rule");
    }
  }, [curMode]);

  const onError = (err: any) => {
    Notice.error(err?.message || err.toString());
  };

  return (

    <BasePage
      contentStyle={{ height: "100%" }}
      title={t("Proxy Groups")}
      header={
        <ButtonGroup size="small">
          {modeList.map((mode) => (
            <Button
              key={mode}
              variant={mode === curMode ? "contained" : "outlined"}
              onClick={() => onChangeMode(mode)}
              sx={{ textTransform: "capitalize" }}
            >
              {t(mode)}
            </Button>
          ))}
        </ButtonGroup>
      }
    >
      <Paper
        sx={{
          borderRadius: 1,
          boxShadow: 2,
          height: "100%",
          boxSizing: "border-box",
          py: 1,
        }}
      >
        <ProxyGroups mode={curMode!} />
      </Paper>
    </BasePage>
  );
};

export default ProxyPage;
